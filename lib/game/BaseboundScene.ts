// @ts-nocheck
import * as Phaser from 'phaser'
import planck from 'planck-js'
import { Vehicle } from './Vehicle'
import { MINI_VEHICLE } from './vehicleCatalog'
import { Terrain } from './Terrain'
import { GameState, VehicleStats } from './types'
import { getLevelConfig, LevelConfig } from './LevelConfig'

export class BaseboundScene extends Phaser.Scene {
  private world!: any
  private groundBody!: any
  private readonly SCALE: number = 30

  // Collision categories/masks (from Code-Bullet sketch.js)
  private readonly WHEEL_CATEGORY = 0x0001
  private readonly CHASSIS_CATEGORY = 0x0002
  private readonly GRASS_CATEGORY = 0x0004
  private readonly DIRT_CATEGORY = 0x0008

  private readonly GRASS_MASK = this.WHEEL_CATEGORY
  private readonly DIRT_MASK = this.CHASSIS_CATEGORY

  private readonly grassThicknessPx: number = 5
  private physicsAccumulatorS: number = 0
  private readonly physicsTimeStepS: number = 1 / 30
  private readonly velocityIterations: number = 10
  private readonly positionIterations: number = 10

  private vehicle!: Vehicle
  private terrain!: Terrain
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private gameState: GameState
  private terrainGraphics: Phaser.GameObjects.Graphics[] = []
  private chassisGraphic!: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle
  private wheelBackGraphic!: Phaser.GameObjects.Image | Phaser.GameObjects.Arc
  private wheelFrontGraphic!: Phaser.GameObjects.Image | Phaser.GameObjects.Arc
  private fuelPickups: Phaser.GameObjects.Image[] = []
  private coinPickups: Phaser.GameObjects.Image[] = []
  private nextFuelX: number = 450
  private nextCoinGroupX: number = 650
  private cameraOffsetX: number = 0
  private terrainGeneratedToX: number = 0
  private readonly cameraLeftMarginFrac: number = 0.3
  private hudText!: Phaser.GameObjects.Text
  private fuelIcon!: Phaser.GameObjects.Image
  private fuelText!: Phaser.GameObjects.Text
  private fuelBar!: Phaser.GameObjects.Graphics
  private coinIcon!: Phaser.GameObjects.Image
  private coinText!: Phaser.GameObjects.Text
  private distanceText!: Phaser.GameObjects.Text
  private speedText!: Phaser.GameObjects.Text

  // Mobile controls
  private gasPedal?: Phaser.GameObjects.Image
  private brakePedal?: Phaser.GameObjects.Image
  private pedalSafeArea?: Phaser.GameObjects.Graphics
  private pedalSafeAreaHeightPx: number = 0
  private pedalSafeArea?: Phaser.GameObjects.Graphics
  private onGameOver?: (state: GameState) => void
  private currentLevel: LevelConfig
  private stars: Phaser.GameObjects.Rectangle[] = []
  private startedAtMs: number = 0
  private flippedSinceMs: number | null = null

  // Wheel grounding counters (can be >1 due to multiple contact points)
  private wheelBackGroundContacts: number = 0
  private wheelFrontGroundContacts: number = 0

  // Chassis touching dirt (used to ensure flip game-over only when roof hits ground)
  private chassisDirtContacts: number = 0

  // Roof sensor touching terrain (reliable flip-on-roof detection)
  private roofTerrainContacts: number = 0

  // Audio
  private miniIdleSound?: Phaser.Sound.BaseSound
  private miniAccelerateSound?: Phaser.Sound.BaseSound
  private miniStartSound?: Phaser.Sound.BaseSound
  private currentAudioState: 'idle' | 'accelerate' | 'none' = 'none'
  private audioUnlocked: boolean = false
  private startSoundPlayed: boolean = false
  private startSoundPlaying: boolean = false
  private lastRotation: number = 0
  private airRotationAccumulator: number = 0
  private wasGrounded: boolean = false
  
  // Code-Bullet camera panning system
  private panX: number = 0
  private nextPanX: number = 0
  private readonly maxPanSpeed: number = 100 // pixels per second
  private readonly panSpeed: number = 50
  private readonly panAcc: number = 10
  
  constructor() {
    super({ key: 'BaseboundScene' })
    this.currentLevel = getLevelConfig(1) // Start with level 1
    this.gameState = {
      distance: 0,
      fuel: 100,
      coins: 0,
      isGameOver: false
    }
  }
  
  public setGameOverCallback(callback: (state: GameState) => void): void {
    this.onGameOver = callback
  }
  
  preload() {
    // Load vehicle assets (starter vehicle only for now)
    this.load.image(MINI_VEHICLE.parts.body.key, MINI_VEHICLE.parts.body.path)
    this.load.image(MINI_VEHICLE.parts.wheelBack.key, MINI_VEHICLE.parts.wheelBack.path)
    this.load.image(MINI_VEHICLE.parts.wheelFront.key, MINI_VEHICLE.parts.wheelFront.path)
    
    // Load HUD icons
    this.load.image('fuel-icon', '/basebound-game/icons/fuel.png')
    this.load.image('coin-icon', '/basebound-game/icons/coin.png')

    // Mobile pedal controls
    this.load.image('pedal-gas-normal', '/basebound-game/icons/pedal-gas-normal.png')
    this.load.image('pedal-gas-pressed', '/basebound-game/icons/pedal-gas-pressed.png')
    this.load.image('pedal-brake-normal', '/basebound-game/icons/pedal-brake-normal.png')
    this.load.image('pedal-brake-pressed', '/basebound-game/icons/pedal-brake-pressed.png')
    
    // Load audio
    this.load.audio(MINI_VEHICLE.audio.start.key, MINI_VEHICLE.audio.start.path)
    this.load.audio(MINI_VEHICLE.audio.idle.key, MINI_VEHICLE.audio.idle.path)
    this.load.audio(MINI_VEHICLE.audio.accelerate.key, MINI_VEHICLE.audio.accelerate.path)
  }
  
  create() {
    this.startedAtMs = this.time.now

    // WebAudio is blocked until a user gesture in most browsers.
    // Gate all sound playback behind an explicit unlock.
    const tryUnlockAudio = () => {
      if (this.audioUnlocked) return
      this.audioUnlocked = true

      try {
        this.sound.unlock()
      } catch {
        // ignore
      }

      const ctx = (this.sound as any)?.context
      if (ctx?.state === 'suspended' && typeof ctx.resume === 'function') {
        try {
          ctx.resume()
        } catch {
          // ignore
        }
      }
    }

    const playStartSoundOnce = () => {
      if (this.startSoundPlayed) return
      this.startSoundPlayed = true
      try {
        if (!this.miniStartSound) {
          this.miniStartSound = this.sound.add('mini-start')
        }
        this.startSoundPlaying = true
        this.miniStartSound.stop()
        this.miniStartSound.once('complete', () => {
          this.startSoundPlaying = false
        })
        this.miniStartSound.play()
      } catch {
        this.startSoundPlaying = false
      }
    }

    const unlockAndStart = () => {
      tryUnlockAudio()
      // If resume happens async, this runs on the next tick.
      this.time.delayedCall(0, playStartSoundOnce)
    }

    // Unlock audio on first pointer or keyboard interaction.
    this.input.once('pointerdown', unlockAndStart)
    this.input.keyboard?.once('keydown', unlockAndStart)

    // Set background color based on level
    this.cameras.main.setBackgroundColor(this.currentLevel.terrain.skyColor)

    // Create Planck (Box2D-style) physics world.
    // Code-Bullet: gravity = Vec2(0, 10), step = 1/30.
    this.world = planck.World(planck.Vec2(0, 10))
    // Let bodies sleep when they settle (prevents perpetual micro-bounce).
    this.world.setAllowSleep?.(true)
    this.groundBody = this.world.createBody({ type: 'static', position: planck.Vec2(0, 0) })
    this.groundBody.setUserData({ id: 'ground' })
    
    // Add stars for moon level
    if (this.currentLevel.environment.hasStars) {
      for (let i = 0; i < 100; i++) {
        const star = this.add.rectangle(
          Phaser.Math.Between(0, 2000),
          Phaser.Math.Between(0, 600),
          2, 2, 0xFFFFFF
        )
        star.setScrollFactor(0.3)
        this.stars.push(star)
      }
    }
    
    // Create terrain with level-specific settings
    // Push terrain down a bit so it isn't too high on screen.
    // Use a fixed seed so terrain is identical for all players (fair leaderboard)
    const terrainBaseY = this.currentLevel.terrain.baseY + 120
    const FIXED_TERRAIN_SEED = 20260108 // Fixed seed for consistent terrain
    this.terrain = new Terrain(
      FIXED_TERRAIN_SEED,
      terrainBaseY,
      this.currentLevel.terrain.amplitude,
      this.currentLevel.terrain.frequency
    )
    this.generateTerrainChunk(0, 2000)
    this.terrainGeneratedToX = 2000
    
    // Create vehicle at spawn position (starter vehicle only for now)
    const vehicleStats: VehicleStats = { ...MINI_VEHICLE.baseStats }
    
    // Spawn vehicle ON the terrain (align wheels to surface)
    const spawnX = 200
    const chassisWidth = 125
    const chassisHeight = 40
    const wheelRadius = 17 // Code-Bullet
    const wheelOffsetX = chassisWidth / 2 - wheelRadius * 1.2
    const wheelOffsetY = chassisHeight / 2 + wheelRadius / 4

    const groundBack = this.terrain.getHeightAt(spawnX - wheelOffsetX)
    const groundFront = this.terrain.getHeightAt(spawnX + wheelOffsetX)

    // Place each wheel directly on the surface at its x-position
    const wheelBackY = groundBack - wheelRadius
    const wheelFrontY = groundFront - wheelRadius

    // Chassis center sits above the lower of the two wheel contact points
    const spawnY = Math.min(wheelBackY, wheelFrontY) - wheelOffsetY
    this.vehicle = new Vehicle(this.world, spawnX, spawnY, vehicleStats)

    // Initialize rotation tracking for aerial flip points
    this.lastRotation = this.vehicle.getAngle()
    this.wasGrounded = true

    // Track wheel-ground contact so we can avoid applying flip-inducing torque when airborne.
    const backWheelBody = this.vehicle.wheels?.[0]?.body
    const frontWheelBody = this.vehicle.wheels?.[1]?.body
    const chassisBody = this.vehicle.chassisBody

    const isGrassFixture = (fixture: any): boolean => {
      const fd = fixture?.getFilterData?.()
      return (fd?.categoryBits ?? 0) === this.GRASS_CATEGORY
    }

    const isDirtFixture = (fixture: any): boolean => {
      const fd = fixture?.getFilterData?.()
      return (fd?.categoryBits ?? 0) === this.DIRT_CATEGORY
    }

    const updateGrounded = () => {
      this.vehicle.setGrounded(this.wheelBackGroundContacts > 0, this.wheelFrontGroundContacts > 0)
    }

    this.world.on('begin-contact', (contact: any) => {
      const fa = contact.getFixtureA()
      const fb = contact.getFixtureB()
      const ba = fa.getBody()
      const bb = fb.getBody()

      const faUd = fa.getUserData?.()
      const fbUd = fb.getUserData?.()
      const faIsRoof = faUd?.id === 'roofSensor'
      const fbIsRoof = fbUd?.id === 'roofSensor'
      const roofHitsTerrain = (roofFixture: any, otherFixture: any) => {
        if (!roofFixture) return false
        // Terrain is either grass or dirt chain.
        return isGrassFixture(otherFixture) || isDirtFixture(otherFixture)
      }

      if (faIsRoof && roofHitsTerrain(fa, fb)) {
        this.roofTerrainContacts++
        return
      }
      if (fbIsRoof && roofHitsTerrain(fb, fa)) {
        this.roofTerrainContacts++
        return
      }

      if (ba === backWheelBody && isGrassFixture(fb)) {
        this.wheelBackGroundContacts++
        updateGrounded()
      } else if (bb === backWheelBody && isGrassFixture(fa)) {
        this.wheelBackGroundContacts++
        updateGrounded()
      } else if (ba === frontWheelBody && isGrassFixture(fb)) {
        this.wheelFrontGroundContacts++
        updateGrounded()
      } else if (bb === frontWheelBody && isGrassFixture(fa)) {
        this.wheelFrontGroundContacts++
        updateGrounded()
      } else if (ba === chassisBody && isDirtFixture(fb)) {
        this.chassisDirtContacts++
      } else if (bb === chassisBody && isDirtFixture(fa)) {
        this.chassisDirtContacts++
      } else if (ba === chassisBody && isGrassFixture(fb)) {
        this.chassisDirtContacts++
      } else if (bb === chassisBody && isGrassFixture(fa)) {
        this.chassisDirtContacts++
      }
    })

    this.world.on('end-contact', (contact: any) => {
      const fa = contact.getFixtureA()
      const fb = contact.getFixtureB()
      const ba = fa.getBody()
      const bb = fb.getBody()

      const faUd = fa.getUserData?.()
      const fbUd = fb.getUserData?.()
      const faIsRoof = faUd?.id === 'roofSensor'
      const fbIsRoof = fbUd?.id === 'roofSensor'
      const roofHitsTerrain = (roofFixture: any, otherFixture: any) => {
        if (!roofFixture) return false
        return isGrassFixture(otherFixture) || isDirtFixture(otherFixture)
      }

      if (faIsRoof && roofHitsTerrain(fa, fb)) {
        this.roofTerrainContacts = Math.max(0, this.roofTerrainContacts - 1)
        return
      }
      if (fbIsRoof && roofHitsTerrain(fb, fa)) {
        this.roofTerrainContacts = Math.max(0, this.roofTerrainContacts - 1)
        return
      }

      if (ba === backWheelBody && isGrassFixture(fb)) {
        this.wheelBackGroundContacts = Math.max(0, this.wheelBackGroundContacts - 1)
        updateGrounded()
      } else if (bb === backWheelBody && isGrassFixture(fa)) {
        this.wheelBackGroundContacts = Math.max(0, this.wheelBackGroundContacts - 1)
        updateGrounded()
      } else if (ba === frontWheelBody && isGrassFixture(fb)) {
        this.wheelFrontGroundContacts = Math.max(0, this.wheelFrontGroundContacts - 1)
        updateGrounded()
      } else if (bb === frontWheelBody && isGrassFixture(fa)) {
        this.wheelFrontGroundContacts = Math.max(0, this.wheelFrontGroundContacts - 1)
        updateGrounded()
      } else if (ba === chassisBody && isDirtFixture(fb)) {
        this.chassisDirtContacts = Math.max(0, this.chassisDirtContacts - 1)
      } else if (bb === chassisBody && isDirtFixture(fa)) {
        this.chassisDirtContacts = Math.max(0, this.chassisDirtContacts - 1)
      } else if (ba === chassisBody && isGrassFixture(fb)) {
        this.chassisDirtContacts = Math.max(0, this.chassisDirtContacts - 1)
      } else if (bb === chassisBody && isGrassFixture(fa)) {
        this.chassisDirtContacts = Math.max(0, this.chassisDirtContacts - 1)
      }
    })
    
    const chassisR = this.vehicle.getChassisRender()
    const wheelBackR = this.vehicle.getWheelBackRender()
    const wheelFrontR = this.vehicle.getWheelFrontRender()

    // Create graphics for vehicle - use images if available, else shapes
    if (this.textures.exists('car-body')) {
      this.chassisGraphic = this.add.image(chassisR.x, chassisR.y, 'car-body')
      this.chassisGraphic.setDisplaySize(120, 60)
    } else {
      this.chassisGraphic = this.add.rectangle(chassisR.x, chassisR.y, 120, 60, 0x4169E1)
      this.chassisGraphic.setStrokeStyle(2, 0x000000)
    }
    this.chassisGraphic.setDepth(10)
    
    if (this.textures.exists('tire-back')) {
      this.wheelBackGraphic = this.add.image(wheelBackR.x, wheelBackR.y, 'tire-back')
      this.wheelBackGraphic.setDisplaySize(45, 45)
    } else {
      this.wheelBackGraphic = this.add.circle(wheelBackR.x, wheelBackR.y, 22, 0x333333)
      this.wheelBackGraphic.setStrokeStyle(2, 0x000000)
    }
    this.wheelBackGraphic.setDepth(10)
    
    if (this.textures.exists('tire-front')) {
      this.wheelFrontGraphic = this.add.image(wheelFrontR.x, wheelFrontR.y, 'tire-front')
      this.wheelFrontGraphic.setDisplaySize(45, 45)
    } else {
      this.wheelFrontGraphic = this.add.circle(wheelFrontR.x, wheelFrontR.y, 22, 0x333333)
      this.wheelFrontGraphic.setStrokeStyle(2, 0x000000)
    }
    this.wheelFrontGraphic.setDepth(10)
    
    // Setup input - Code-Bullet toggle controls
    this.cursors = this.input.keyboard!.createCursorKeys()
    
    // Code-Bullet: RIGHT arrow = forward, LEFT arrow = backward
    this.input.keyboard!.on('keydown-RIGHT', (event: KeyboardEvent) => {
      if (event?.repeat) return
      if (this.rightDown) return
      tryUnlockAudio()
      if (!this.gameState.isGameOver && this.gameState.fuel > 0) {
        this.rightDown = true
        this.vehicle.motorOn(true)
      }
    })
    
    this.input.keyboard!.on('keydown-LEFT', (event: KeyboardEvent) => {
      if (event?.repeat) return
      if (this.leftDown) return
      tryUnlockAudio()
      if (!this.gameState.isGameOver && this.gameState.fuel > 0) {
        this.leftDown = true
        this.vehicle.motorOn(false)
      }
    })
    
    this.input.keyboard!.on('keyup-RIGHT', () => {
      this.rightDown = false
      if (this.leftDown) {
        this.vehicle.motorOn(false)
      } else {
        this.vehicle.motorOff()
      }
    })
    
    this.input.keyboard!.on('keyup-LEFT', () => {
      this.leftDown = false
      if (this.rightDown) {
        this.vehicle.motorOn(true)
      } else {
        this.vehicle.motorOff()
      }
    })
    
    // Camera: keep car on the left, but don't scroll past x=0 (terrain starts from left)
    // Allow vertical scrolling in deep valleys (and keep UI/pedals clear).
    this.cameras.main.setBounds(0, 0, 999999, 6000)
    this.cameras.main.setZoom(1.0)
    this.cameras.main.setScroll(0, 0)
    
    // Create HUD
    this.createHUD()

    // Mobile pedals (bottom-left brake, bottom-right gas)
    this.createMobilePedals(tryUnlockAudio)

    // Start sound plays after first gesture (see unlockAndStart).
    
    // Spawn initial pickups
    this.spawnPickups()
  }
  
  private createHUD(): void {
    const hudY = 20
    const iconSize = 32
    const centerX = this.scale.width / 2

    // === COINS (top left) ===
    this.coinIcon = this.add.image(20, hudY + iconSize / 2, 'coin-icon')
    this.coinIcon.setDisplaySize(iconSize, iconSize)
    this.coinIcon.setScrollFactor(0)
    this.coinIcon.setDepth(100)

    this.coinText = this.add.text(20, hudY + iconSize + 8, '0', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFD700',
      fontStyle: 'bold',
      align: 'center'
    })
    this.coinText.setOrigin(0.5, 0)
    this.coinText.setScrollFactor(0)
    this.coinText.setDepth(100)

    // === FUEL (to the right of coins) ===
    const fuelX = 100
    this.fuelIcon = this.add.image(fuelX, hudY + iconSize / 2, 'fuel-icon')
    this.fuelIcon.setDisplaySize(iconSize, iconSize)
    this.fuelIcon.setScrollFactor(0)
    this.fuelIcon.setDepth(100)

    this.fuelBar = this.add.graphics()
    this.fuelBar.setScrollFactor(0)
    this.fuelBar.setDepth(100)

    this.fuelText = this.add.text(fuelX, hudY + iconSize + 8, '100%', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      fontStyle: 'bold',
      align: 'center'
    })
    this.fuelText.setOrigin(0.5, 0)
    this.fuelText.setScrollFactor(0)
    this.fuelText.setDepth(100)

    // === METERS COUNTER (center top - prominent) ===
    // Meters background box
    const metersBg = this.add.graphics()
    metersBg.fillStyle(0x000000, 0.7)
    metersBg.fillRoundedRect(centerX - 60, hudY - 8, 120, 50, 8)
    metersBg.lineStyle(2, 0xFFFFFF, 0.8)
    metersBg.strokeRoundedRect(centerX - 60, hudY - 8, 120, 50, 8)
    metersBg.setScrollFactor(0)
    metersBg.setDepth(99)

    // Meters label
    const metersLabel = this.add.text(centerX, hudY + 2, 'METERS', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#AAAAAA',
      fontStyle: 'bold'
    })
    metersLabel.setOrigin(0.5, 0)
    metersLabel.setScrollFactor(0)
    metersLabel.setDepth(100)

    // Meters value
    this.distanceText = this.add.text(centerX, hudY + 16, '0', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFD700',
      fontStyle: 'bold'
    })
    this.distanceText.setOrigin(0.5, 0)
    this.distanceText.setScrollFactor(0)
    this.distanceText.setDepth(100)

    // === SPEED (bottom right, smaller) ===
    this.speedText = this.add.text(this.scale.width - 16, hudY + 70, '0 km/h', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      fontStyle: 'bold'
    })
    this.speedText.setOrigin(1, 0)
    this.speedText.setScrollFactor(0)
    this.speedText.setDepth(100)
    
    // Legacy hudText (hidden, kept for compatibility)
    this.hudText = this.add.text(-1000, -1000, '', { fontSize: '1px' })
  }

  private createMobilePedals(tryUnlockAudio: () => void): void {
    // Show pedals (desktop + mobile). Keyboard still works; pedals are for touch/mobile UX.

    const placePedals = () => {
      const w = this.scale.gameSize.width
      const h = this.scale.gameSize.height
      const margin = 22
      // Smaller pedals + extra inset from screen edges
      const sideInset = 30
      const size = Math.min(110, Math.max(80, Math.floor(w * 0.13)))

      // Rotate in portrait so pedals feel natural when phone is rotated.
      const isPortrait = h > w
      const angle = isPortrait ? -90 : 0

      // Bottom safe area so terrain never shows under the pedals.
      if (this.pedalSafeArea) {
        this.pedalSafeArea.clear()
        const safeH = size + margin * 2
        this.pedalSafeAreaHeightPx = safeH
        this.pedalSafeArea.fillStyle(0x000000, 0.35)
        this.pedalSafeArea.fillRect(0, h - safeH, w, safeH)
      }

      if (this.brakePedal) {
        this.brakePedal.setPosition(margin + sideInset + size / 2, h - margin - size / 2)
        this.brakePedal.setDisplaySize(size, size)
        this.brakePedal.setAngle(angle)
        this.brakePedal.setInteractive(new Phaser.Geom.Circle(0, 0, size * 0.48), Phaser.Geom.Circle.Contains)
      }

      if (this.gasPedal) {
        this.gasPedal.setPosition(w - margin - sideInset - size / 2, h - margin - size / 2)
        this.gasPedal.setDisplaySize(size, size)
        this.gasPedal.setAngle(angle)
        this.gasPedal.setInteractive(new Phaser.Geom.Circle(0, 0, size * 0.48), Phaser.Geom.Circle.Contains)
      }
    }

    this.pedalSafeArea = this.add.graphics()
      .setScrollFactor(0)
      .setDepth(900)

    this.brakePedal = this.add.image(0, 0, 'pedal-brake-normal')
      .setScrollFactor(0)
      .setDepth(1000)
      .setAlpha(1)
      .setInteractive({ useHandCursor: false })

    this.gasPedal = this.add.image(0, 0, 'pedal-gas-normal')
      .setScrollFactor(0)
      .setDepth(1000)
      .setAlpha(1)
      .setInteractive({ useHandCursor: false })

    const pressBrake = () => {
      tryUnlockAudio()
      if (this.gameState.isGameOver || this.gameState.fuel <= 0) return
      this.leftDown = true
      this.brakePedal?.setTexture('pedal-brake-pressed')
      this.vehicle.motorOn(false)
    }

    const releaseBrake = () => {
      this.leftDown = false
      this.brakePedal?.setTexture('pedal-brake-normal')
      if (this.rightDown) this.vehicle.motorOn(true)
      else this.vehicle.motorOff()
    }

    const pressGas = () => {
      tryUnlockAudio()
      if (this.gameState.isGameOver || this.gameState.fuel <= 0) return
      this.rightDown = true
      this.gasPedal?.setTexture('pedal-gas-pressed')
      this.vehicle.motorOn(true)
    }

    const releaseGas = () => {
      this.rightDown = false
      this.gasPedal?.setTexture('pedal-gas-normal')
      if (this.leftDown) this.vehicle.motorOn(false)
      else this.vehicle.motorOff()
    }

    this.brakePedal.on('pointerdown', pressBrake)
    this.brakePedal.on('pointerup', releaseBrake)
    this.brakePedal.on('pointerout', releaseBrake)
    this.brakePedal.on('pointerupoutside', releaseBrake)

    this.gasPedal.on('pointerdown', pressGas)
    this.gasPedal.on('pointerup', releaseGas)
    this.gasPedal.on('pointerout', releaseGas)
    this.gasPedal.on('pointerupoutside', releaseGas)

    // Initial layout + on resize
    placePedals()
    this.scale.on('resize', placePedals)
  }
  
  private drawFuelBar(fuelPercent: number): void {
    const g = this.fuelBar
    g.clear()

    // Position fuel bar next to fuel icon (top left, after coins)
    const barX = 140
    const barY = 24  // Aligned with icon center
    const barWidth = 60
    const barHeight = 10

    // Background
    g.fillStyle(0x333333, 0.8)
    g.fillRoundedRect(barX, barY, barWidth, barHeight, 3)

    // Fuel level
    const fillWidth = Math.max(0, (fuelPercent / 100) * barWidth)
    const fuelColor = fuelPercent > 30 ? 0x00FF00 : fuelPercent > 15 ? 0xFFAA00 : 0xFF0000
    g.fillStyle(fuelColor, 1)
    g.fillRoundedRect(barX, barY, fillWidth, barHeight, 3)

    // Border
    g.lineStyle(1, 0xFFFFFF, 0.8)
    g.strokeRoundedRect(barX, barY, barWidth, barHeight, 3)
  }
  
  private generateTerrainChunk(startX: number, endX: number): void {
    // Smaller spacing for smoother hills
    const points = this.terrain.generateChunk(startX, endX, 10)

    // Smooth render points (visual only): spline through terrain points.
    // Phaser Graphics doesn't support CanvasContext's quadraticCurveTo directly.
    const spline = new Phaser.Curves.Spline(
      points.map(p => new Phaser.Math.Vector2(p.x, p.y))
    )
    const segmentCount = Math.max(32, Math.ceil((endX - startX) / 12))
    const renderPoints = spline.getSpacedPoints(segmentCount)

    // Physics terrain: Use Chain shapes for smoother rolling than many independent edges.
    const Vec2 = planck.Vec2
    const dirtVerts: any[] = []
    const grassVerts: any[] = []
    for (let i = 0; i < points.length; i++) {
      const p = points[i]
      dirtVerts.push(Vec2(p.x / this.SCALE, p.y / this.SCALE))
      grassVerts.push(Vec2(p.x / this.SCALE, (p.y - this.grassThicknessPx) / this.SCALE))
    }

    this.groundBody.createFixture(planck.Chain(dirtVerts, false), {
      friction: 0.99,
      restitution: 0.1,
      filterCategoryBits: this.DIRT_CATEGORY,
      filterMaskBits: this.DIRT_MASK
    })

    this.groundBody.createFixture(planck.Chain(grassVerts, false), {
      friction: 0.99,
      restitution: 0.1,
      filterCategoryBits: this.GRASS_CATEGORY,
      filterMaskBits: this.GRASS_MASK
    })

    const bottomY = 6000

    // Render terrain as one filled shape
    const g = this.add.graphics()
    g.setDepth(0)
    g.fillStyle(this.currentLevel.terrain.groundColor, 1)
    g.beginPath()
    g.moveTo(renderPoints[0].x, renderPoints[0].y)
    for (let i = 1; i < renderPoints.length; i++) g.lineTo(renderPoints[i].x, renderPoints[i].y)
    g.lineTo(endX, bottomY)
    g.lineTo(startX, bottomY)
    g.closePath()
    g.fillPath()

    // Grass top stroke
    g.lineStyle(6, this.currentLevel.terrain.groundTopColor, 1)
    g.beginPath()
    g.moveTo(renderPoints[0].x, renderPoints[0].y)
    for (let i = 1; i < renderPoints.length; i++) g.lineTo(renderPoints[i].x, renderPoints[i].y)
    g.strokePath()

    this.terrainGraphics.push(g)
  }
  
  private spawnPickups(): void {
    const vehicleX = this.vehicle.getPosition().x

    // Keep fuel and coin groups spaced apart.
    const minSeparationPx = 400

    // Spawn fuel can (not too close to coin groups)
    if (this.nextFuelX < vehicleX + 900) {
      if (Math.abs(this.nextFuelX - this.nextCoinGroupX) < minSeparationPx) {
        this.nextFuelX = this.nextCoinGroupX + minSeparationPx
      }

      const x = this.nextFuelX
      const y = this.terrain.getHeightAt(x) - 60

      const fuelCan = this.add.image(x, y, 'fuel-icon') as any
      fuelCan.setDisplaySize(50, 50)
      fuelCan.setData('type', 'fuel')
      fuelCan.setDepth(10)
      this.fuelPickups.push(fuelCan)

      // Base spacing 500-750px, plus extra distance every 1000m to increase difficulty
      const baseSpacing = Phaser.Math.Between(500, 750)
      const distanceKm = Math.floor(this.gameState.distance / 1000)
      const extraSpacing = distanceKm * 100 // +100px per 1000m traveled
      this.nextFuelX += baseSpacing + extraSpacing
    }

    // Spawn coin group: 5–10 coins per group, and groups spaced out
    if (this.coinPickups.length < 80 && this.nextCoinGroupX < vehicleX + 1100) {
      if (Math.abs(this.nextCoinGroupX - this.nextFuelX) < minSeparationPx) {
        this.nextCoinGroupX = this.nextFuelX + minSeparationPx
      }

      const groupSize = Phaser.Math.Between(5, 10)
      const startX = this.nextCoinGroupX
      const coinSpacing = 38

      for (let i = 0; i < groupSize; i++) {
        const coinX = startX + i * coinSpacing
        const arcProgress = groupSize === 1 ? 0 : i / (groupSize - 1)
        const arcHeight = Math.sin(arcProgress * Math.PI) * 70
        const coinY = this.terrain.getHeightAt(coinX) - 50 - arcHeight

        const coin = this.add.image(coinX, coinY, 'coin-icon') as any
        coin.setDisplaySize(45, 45)
        coin.setData('type', 'coin')
        coin.setDepth(10)
        this.coinPickups.push(coin)
      }

      this.nextCoinGroupX += Phaser.Math.Between(800, 1200)
    }
  }
  
  update(time: number, delta: number): void {
    if (this.gameState.isGameOver) return

    // Cap delta to avoid spiral-of-death.
    const clampedDeltaMs = Math.min(delta, 1000 / 15)
    const dtSeconds = clampedDeltaMs / 1000

    // Step physics at fixed 1/30 like Code-Bullet.
    this.physicsAccumulatorS += dtSeconds
    let steps = 0
    while (this.physicsAccumulatorS >= this.physicsTimeStepS && steps < 5) {
      this.world.step(this.physicsTimeStepS, this.velocityIterations, this.positionIterations)
      this.physicsAccumulatorS -= this.physicsTimeStepS
      steps++
    }

    // Sync graphics with physics bodies
    const chassisR = this.vehicle.getChassisRender()
    const wheelBackR = this.vehicle.getWheelBackRender()
    const wheelFrontR = this.vehicle.getWheelFrontRender()

    this.chassisGraphic.setPosition(chassisR.x, chassisR.y)
    this.chassisGraphic.setRotation(chassisR.angle)

    this.wheelBackGraphic.setPosition(wheelBackR.x, wheelBackR.y)
    this.wheelBackGraphic.setRotation(wheelBackR.angle)

    this.wheelFrontGraphic.setPosition(wheelFrontR.x, wheelFrontR.y)
    this.wheelFrontGraphic.setRotation(wheelFrontR.angle)
    
    // Fuel drains faster to make the game more challenging
    this.gameState.fuel -= 2.0 * dtSeconds
    const hasFuel = this.gameState.fuel > 0
    
    if (hasFuel) {
      // Code-Bullet: update motor continuously if enabled
      this.vehicle.updateMotor(dtSeconds)
    }
    
    // Update distance
    const vehiclePos = this.vehicle.getPosition()
    // Use ~30px per meter (matches SCALE) so distance doesn't count too fast.
    this.gameState.distance = Math.max(this.gameState.distance, Math.floor(vehiclePos.x / 30))
    
    // Manual camera scroll keeps car on left and ensures terrain starts at x=0.
    const marginPx = Math.floor(this.cameras.main.width * this.cameraLeftMarginFrac)
    const desiredScrollX = Math.max(0, chassisR.x - marginPx)
    this.cameras.main.scrollX = desiredScrollX

    // Vertical camera: follow the car down into valleys, but keep it above the pedal safe area.
    // This prevents terrain/car from going under the on-screen pedals.
    const camH = this.cameras.main.height
    const safeH = this.pedalSafeAreaHeightPx || 0
    // Keep chassis at least this far above the pedal area.
    const keepAbovePedalsPx = 80
    const maxChassisScreenY = camH - safeH - keepAbovePedalsPx
    const desiredScrollY = Math.max(0, chassisR.y - maxChassisScreenY)
    // Smooth the scroll a bit to avoid jitter.
    const lerp = desiredScrollY > this.cameras.main.scrollY ? 0.18 : 0.06
    this.cameras.main.scrollY = Phaser.Math.Linear(this.cameras.main.scrollY, desiredScrollY, lerp)
    
    // Check for pickups
    this.checkPickups(vehiclePos)
    
    // Generate new terrain ahead (contiguous chunks; avoids overlaps/seams)
    if (vehiclePos.x + 1200 > this.terrainGeneratedToX) {
      const startX = this.terrainGeneratedToX
      const endX = this.terrainGeneratedToX + 1200
      this.generateTerrainChunk(startX, endX)
      this.terrainGeneratedToX = endX
    }
    
    // Spawn new pickups
    this.spawnPickups()
    
    // Update HUD
    this.updateHUD()
    
    // Track aerial flips (rotation in air gives points)
    const currentRotation = this.vehicle.getAngle()
    const isGrounded = this.wheelBackGroundContacts > 0 || this.wheelFrontGroundContacts > 0
    
    if (!isGrounded) {
      // In air - accumulate rotation
      let deltaRotation = currentRotation - this.lastRotation
      // wrap to [-180, 180] so crossing the +/-180 boundary doesn't create huge deltas
      deltaRotation = ((deltaRotation + 180) % 360) - 180
      this.airRotationAccumulator += Math.abs(deltaRotation)
    } else if (!this.wasGrounded && isGrounded) {
      // Just landed - check for completed flips
      const fullFlips = Math.floor(this.airRotationAccumulator / 360)
      if (fullFlips > 0) {
        // Add points to score (coins) for flips in the air.
        this.gameState.coins += fullFlips * 10
      }
      this.airRotationAccumulator = 0
    }
    
    this.lastRotation = currentRotation
    this.wasGrounded = isGrounded
    
    // Update audio based on speed + throttle state
    const speed = this.vehicle.getVelocity()
    const isThrottleDown = this.rightDown || this.leftDown

    const stopAllEngineLoops = () => {
      if (this.miniIdleSound) this.miniIdleSound.stop()
      if (this.miniAccelerateSound) this.miniAccelerateSound.stop()
    }

    if (!this.audioUnlocked || this.gameState.isGameOver) {
      if (this.currentAudioState !== 'none') {
        stopAllEngineLoops()
        this.currentAudioState = 'none'
      }
    } else if (this.startSoundPlaying) {
      // Let engine start one-shot play without being overlapped.
      if (this.currentAudioState !== 'none') {
        stopAllEngineLoops()
        this.currentAudioState = 'none'
      }
    } else if (isThrottleDown && speed > 1) {
      // Throttle held => accelerate loop
      if (this.currentAudioState !== 'accelerate') {
        stopAllEngineLoops()
        if (!this.miniAccelerateSound) {
          this.miniAccelerateSound = this.sound.add('mini-accelerate', { loop: true })
        }
        this.miniAccelerateSound.play()
        this.currentAudioState = 'accelerate'
      }
    } else if (speed > 0.1) {
      // Rolling slowly / idling
      if (this.currentAudioState !== 'idle') {
        stopAllEngineLoops()
        if (!this.miniIdleSound) {
          this.miniIdleSound = this.sound.add('mini-idle', { loop: true })
        }
        this.miniIdleSound.play()
        this.currentAudioState = 'idle'
      }
    } else {
      if (this.currentAudioState !== 'none') {
        stopAllEngineLoops()
        this.currentAudioState = 'none'
      }
    }
    
    // Check game over conditions
    this.checkGameOver(time)
  }
  
  private checkPickups(vehiclePos: { x: number; y: number }): void {
    // Check fuel pickups
    for (let i = this.fuelPickups.length - 1; i >= 0; i--) {
      const pickup = this.fuelPickups[i]
      const distance = Phaser.Math.Distance.Between(
        vehiclePos.x, vehiclePos.y,
        pickup.x, pickup.y
      )
      
      if (distance < 40) {
        this.gameState.fuel = Math.min(100, this.gameState.fuel + 30)
        pickup.destroy()
        this.fuelPickups.splice(i, 1)
      }
    }
    
    // Check coin pickups
    for (let i = this.coinPickups.length - 1; i >= 0; i--) {
      const pickup = this.coinPickups[i]
      const distance = Phaser.Math.Distance.Between(
        vehiclePos.x, vehiclePos.y,
        pickup.x, pickup.y
      )
      
      if (distance < 30) {
        this.gameState.coins += 1
        pickup.destroy()
        this.coinPickups.splice(i, 1)
      }
    }
  }
  
  private updateHUD(): void {
    const speed = Math.floor(this.vehicle.getVelocity())
    const fuelPercent = Math.max(0, Math.floor(this.gameState.fuel))
    
    // Update fuel display
    this.fuelText.setText(`${fuelPercent}%`)
    this.drawFuelBar(fuelPercent)
    
    // Update coin display
    this.coinText.setText(`${this.gameState.coins}`)
    
    // Update distance (meters counter - no "m" suffix since we have METERS label)
    this.distanceText.setText(`${this.gameState.distance}`)
    
    // Update speed
    this.speedText.setText(`${speed} km/h`)
  }
  
  private checkGameOver(time: number): void {
    // Give the player a moment to settle after spawn
    const spawnGraceMs = 900

    // Flip is only a loss if you stay flipped for a bit (prevents instant game over)
    const flippedHoldMs = 25 // Reduced from 50ms for faster response
    const isPastGrace = time - this.startedAtMs > spawnGraceMs

    // Check if flipped AND touching ground using multiple methods:
    // 1. Contact-based: wheels, chassis, or roof sensor touching terrain
    // 2. Position-based: chassis center is near terrain surface (roof touching ground when flipped)
    const contactBasedGround = this.wheelBackGroundContacts > 0 || this.wheelFrontGroundContacts > 0 || this.roofTerrainContacts > 0 || this.chassisDirtContacts > 0
    
    // Position-based ground check: when flipped, chassis center should be close to terrain surface
    const vehiclePos = this.vehicle.getPosition()
    const terrainY = this.terrain.getHeightAt(vehiclePos.x)
    // When flipped and roof touches ground, chassis center is ~20px above terrain
    // Allow some tolerance for slight variations
    const positionBasedGround = vehiclePos.y >= terrainY - 50
    // More aggressive check: if chassis is very close to terrain, definitely touching
    const definitelyOnGround = vehiclePos.y >= terrainY - 25
    // Additional check: if flipped and moving very slowly, likely resting on roof
    const velocity = this.vehicle.getVelocity()
    const atRestOnRoof = Math.abs(velocity) < 2 // Very low speed threshold
    
    const isOnGround = contactBasedGround || positionBasedGround || definitelyOnGround || (this.vehicle.isFlipped() && atRestOnRoof)
    const flippedOnGround = this.vehicle.isFlipped() && isOnGround

    if (isPastGrace && flippedOnGround) {
      if (this.flippedSinceMs === null) this.flippedSinceMs = time
      if (time - this.flippedSinceMs > flippedHoldMs) {
        this.endGame('flip')
        return
      }
    } else {
      this.flippedSinceMs = null
    }
    
    // Check if out of fuel
    if (this.gameState.fuel <= 0) {
      this.endGame('fuel')
      return
    }
  }
  
  private endGame(reason: 'flip' | 'fuel'): void {
    this.gameState.isGameOver = true
    this.gameState.crashReason = reason
    
    if (this.onGameOver) {
      this.onGameOver(this.gameState)
    }
  }

  // Air-control was a Unity-feel experiment; Code-Bullet doesn't use it.
}
