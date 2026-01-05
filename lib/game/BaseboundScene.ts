// @ts-nocheck
import * as Phaser from 'phaser'
import planck from 'planck-js'
import { Vehicle } from './Vehicle'
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
  private nextPickupX: number = 300
  private cameraOffsetX: number = 0
  private hudText!: Phaser.GameObjects.Text
  private fuelIcon!: Phaser.GameObjects.Image
  private fuelText!: Phaser.GameObjects.Text
  private fuelBar!: Phaser.GameObjects.Graphics
  private coinIcon!: Phaser.GameObjects.Image
  private coinText!: Phaser.GameObjects.Text
  private distanceText!: Phaser.GameObjects.Text
  private speedText!: Phaser.GameObjects.Text
  private onGameOver?: (state: GameState) => void
  private currentLevel: LevelConfig
  private stars: Phaser.GameObjects.Rectangle[] = []
  private startedAtMs: number = 0
  private flippedSinceMs: number | null = null

  // Wheel grounding counters (can be >1 due to multiple contact points)
  private wheelBackGroundContacts: number = 0
  private wheelFrontGroundContacts: number = 0

  // Code-Bullet: motor state tracking
  private leftDown: boolean = false
  private rightDown: boolean = false
  
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
    // Load vehicle assets
    this.load.image('car-body', '/vehicles/mini-topless.png')
    this.load.image('tire-back', '/vehicles/wheel-back.png')
    this.load.image('tire-front', '/vehicles/wheel-front.png')
    
    // Load HUD icons
    this.load.image('fuel-icon', '/icons/fuel.png')
    this.load.image('coin-icon', '/icons/coin.png')
    
    // Optional: Load terrain texture
    // this.load.image('ground', '/terrain/ground.png')
  }
  
  create() {
    this.startedAtMs = this.time.now

    // Set background color based on level
    this.cameras.main.setBackgroundColor(this.currentLevel.terrain.skyColor)

    // Create Planck (Box2D-style) physics world.
    // Code-Bullet: gravity = Vec2(0, 10), step = 1/30.
    this.world = planck.World(planck.Vec2(0, 10))
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
    this.terrain = new Terrain(
      Date.now(),
      this.currentLevel.terrain.baseY,
      this.currentLevel.terrain.amplitude,
      this.currentLevel.terrain.frequency
    )
    this.generateTerrainChunk(0, 2000)
    
    // Create vehicle at spawn position
    const vehicleStats: VehicleStats = {
      maxSpeed: 35,
      torque: 22,
      suspension: 0.8,
      fuelCapacity: 100,
      fuelEfficiency: 1.0,
      mass: 100,
      grip: 1.0     // Maximum grip
    }
    
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

    // Track wheel-ground contact so we can avoid applying flip-inducing torque when airborne.
    const backWheelBody = this.vehicle.wheels?.[0]?.body
    const frontWheelBody = this.vehicle.wheels?.[1]?.body

    const isGrassFixture = (fixture: any): boolean => {
      const fd = fixture?.getFilterData?.()
      return (fd?.categoryBits ?? 0) === this.GRASS_CATEGORY
    }

    const updateGrounded = () => {
      this.vehicle.setGrounded(this.wheelBackGroundContacts > 0, this.wheelFrontGroundContacts > 0)
    }

    this.world.on('begin-contact', (contact: any) => {
      const fa = contact.getFixtureA()
      const fb = contact.getFixtureB()
      const ba = fa.getBody()
      const bb = fb.getBody()

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
      }
    })

    this.world.on('end-contact', (contact: any) => {
      const fa = contact.getFixtureA()
      const fb = contact.getFixtureB()
      const ba = fa.getBody()
      const bb = fb.getBody()

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
      if (!this.gameState.isGameOver && this.gameState.fuel > 0) {
        this.rightDown = true
        this.vehicle.motorOn(true)
      }
    })
    
    this.input.keyboard!.on('keydown-LEFT', (event: KeyboardEvent) => {
      if (event?.repeat) return
      if (this.leftDown) return
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
    
    // Camera follows the car (requested)
    this.cameras.main.setBounds(-1000, 0, 999999, 2000)
    this.cameras.main.startFollow(this.chassisGraphic as any, true, 0.12, 0.12)
    ;(this.cameras.main as any).followOffset?.set?.(200, 0)
    this.cameras.main.setZoom(1.0)
    
    // Create HUD
    this.createHUD()
    
    // Spawn initial pickups
    this.spawnPickups()
  }
  
  private createHUD(): void {
    const hudY = 16
    const iconSize = 40
    const leftOffset = 120 // Large offset to avoid back button
    
    // === FUEL SECTION (after back button) ===
    // Fuel canister icon (image)
    this.fuelIcon = this.add.image(leftOffset + iconSize / 2, hudY + iconSize / 2, 'fuel-icon')
    this.fuelIcon.setDisplaySize(iconSize, iconSize)
    this.fuelIcon.setScrollFactor(0)
    this.fuelIcon.setDepth(100)
    
    // Fuel bar background
    this.fuelBar = this.add.graphics()
    this.fuelBar.setScrollFactor(0)
    this.fuelBar.setDepth(100)
    
    // Fuel percentage text
    this.fuelText = this.add.text(leftOffset + iconSize + 8, hudY + 10, '100%', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFD700',
      fontStyle: 'bold'
    })
    this.fuelText.setScrollFactor(0)
    this.fuelText.setDepth(100)
    
    // === COIN SECTION (next to fuel) ===
    // Coin icon (image)
    this.coinIcon = this.add.image(leftOffset + 140 + iconSize / 2, hudY + iconSize / 2, 'coin-icon')
    this.coinIcon.setDisplaySize(iconSize, iconSize)
    this.coinIcon.setScrollFactor(0)
    this.coinIcon.setDepth(100)
    
    // Coin count text
    this.coinText = this.add.text(leftOffset + 140 + iconSize + 8, hudY + 10, '0', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFD700',
      fontStyle: 'bold'
    })
    this.coinText.setScrollFactor(0)
    this.coinText.setDepth(100)
    
    // === DISTANCE (top right) ===
    this.distanceText = this.add.text(this.scale.width - 16, hudY + 2, '0m', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      fontStyle: 'bold'
    })
    this.distanceText.setOrigin(1, 0) // Right-aligned
    this.distanceText.setScrollFactor(0)
    this.distanceText.setDepth(100)
    
    // === SPEED (below distance) ===
    this.speedText = this.add.text(this.scale.width - 16, hudY + 26, '0 km/h', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#AAAAAA'
    })
    this.speedText.setOrigin(1, 0)
    this.speedText.setScrollFactor(0)
    this.speedText.setDepth(100)
    
    // Legacy hudText (hidden, kept for compatibility)
    this.hudText = this.add.text(-1000, -1000, '', { fontSize: '1px' })
  }
  
  private drawFuelBar(fuelPercent: number): void {
    const g = this.fuelBar
    g.clear()
    
    const barX = 50
    const barY = 44
    const barWidth = 80
    const barHeight = 8
    
    // Background
    g.fillStyle(0x333333, 0.8)
    g.fillRoundedRect(barX, barY, barWidth, barHeight, 2)
    
    // Fuel level
    const fillWidth = Math.max(0, (fuelPercent / 100) * barWidth)
    const fuelColor = fuelPercent > 30 ? 0x00FF00 : fuelPercent > 15 ? 0xFFAA00 : 0xFF0000
    g.fillStyle(fuelColor, 1)
    g.fillRoundedRect(barX, barY, fillWidth, barHeight, 2)
    
    // Border
    g.lineStyle(1, 0xFFFFFF, 0.5)
    g.strokeRoundedRect(barX, barY, barWidth, barHeight, 2)
  }
  
  private generateTerrainChunk(startX: number, endX: number): void {
    // Smaller spacing for smoother hills
    const points = this.terrain.generateChunk(startX, endX, 10)

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

    const bottomY = 2000

    // Render terrain as one filled shape
    const g = this.add.graphics()
    g.setDepth(0)
    g.fillStyle(this.currentLevel.terrain.groundColor, 1)
    g.beginPath()
    g.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y)
    g.lineTo(endX, bottomY)
    g.lineTo(startX, bottomY)
    g.closePath()
    g.fillPath()

    // Grass top stroke
    g.lineStyle(6, this.currentLevel.terrain.groundTopColor, 1)
    g.beginPath()
    g.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y)
    g.strokePath()

    this.terrainGraphics.push(g)
  }
  
  private spawnPickups(): void {
    const vehicleX = this.vehicle.getPosition().x
    
    // Code-Bullet: Spawn fuel can every 300-500 units
    if (this.nextPickupX < vehicleX + 800) {
      const x = this.nextPickupX
      const y = this.terrain.getHeightAt(x) - 60
      
      // Code-Bullet: Fuel can radius = 15 (so 30px diameter, we use 50px for visibility)
      const fuelCan = this.add.image(x, y, 'fuel-icon') as any
      fuelCan.setDisplaySize(50, 50)
      fuelCan.setData('type', 'fuel')
      fuelCan.setDepth(10)
      
      this.fuelPickups.push(fuelCan)
      
      this.nextPickupX += Phaser.Math.Between(300, 500)
    }
    
    // Code-Bullet: Spawn coins in arcs/groups every 200-400 units
    if (Math.random() < 0.2 && this.coinPickups.length < 50) {
      const groupSize = Phaser.Math.Between(3, 8)
      const startX = vehicleX + Phaser.Math.Between(300, 600)
      const coinSpacing = 35
      
      // Code-Bullet: coins in arc pattern (radius=10, so 20px, we use 45px)
      for (let i = 0; i < groupSize; i++) {
        const coinX = startX + i * coinSpacing
        // Arc height: parabolic curve for visual appeal
        const arcProgress = i / (groupSize - 1) // 0 to 1
        const arcHeight = Math.sin(arcProgress * Math.PI) * 80 // 80px max arc height
        const coinY = this.terrain.getHeightAt(coinX) - 50 - arcHeight
        
        const coin = this.add.image(coinX, coinY, 'coin-icon') as any
        coin.setDisplaySize(45, 45)
        coin.setData('type', 'coin')
        coin.setDepth(10)
        
        this.coinPickups.push(coin)
      }
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
    
    // Code-Bullet: constant fuel drain
    this.gameState.fuel -= 0.5 * dtSeconds
    const hasFuel = this.gameState.fuel > 0
    
    if (hasFuel) {
      // Code-Bullet: update motor continuously if enabled
      this.vehicle.updateMotor(dtSeconds)
    }
    
    // Update distance
    const vehiclePos = this.vehicle.getPosition()
    this.gameState.distance = Math.max(this.gameState.distance, Math.floor(vehiclePos.x / 10))
    
    // Camera follow handles scrolling
    
    // Check for pickups
    this.checkPickups(vehiclePos)
    
    // Generate new terrain ahead
    if (vehiclePos.x > this.cameraOffsetX + 1000) {
      this.generateTerrainChunk(
        this.cameraOffsetX + 1500,
        this.cameraOffsetX + 2500
      )
      this.cameraOffsetX += 1000
    }
    
    // Spawn new pickups
    this.spawnPickups()
    
    // Update HUD
    this.updateHUD()
    
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
    
    // Update distance
    this.distanceText.setText(`${this.gameState.distance}m`)
    
    // Update speed
    this.speedText.setText(`${speed} km/h`)
  }
  
  private checkGameOver(time: number): void {
    // Give the player a moment to settle after spawn
    const spawnGraceMs = 900

    // Flip is only a loss if you stay flipped for a bit (prevents instant game over)
    const flippedHoldMs = 900
    const isPastGrace = time - this.startedAtMs > spawnGraceMs

    if (isPastGrace && this.vehicle.isFlipped()) {
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
