// @ts-nocheck
import * as Phaser from 'phaser'
import * as Matter from 'matter-js'
import * as decomp from 'poly-decomp'
import { Vehicle } from './Vehicle'
import { Terrain } from './Terrain'
import { GameState, VehicleStats } from './types'
import { getLevelConfig, LevelConfig } from './LevelConfig'

export class BaseboundScene extends Phaser.Scene {
  private engine!: Matter.Engine
  private vehicle!: Vehicle
  private terrain!: Terrain
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private gameState: GameState
  private terrainBodies: Matter.Body[] = []
  private terrainGraphics: Phaser.GameObjects.Graphics[] = []
  private chassisGraphic!: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle
  private wheelBackGraphic!: Phaser.GameObjects.Image | Phaser.GameObjects.Arc
  private wheelFrontGraphic!: Phaser.GameObjects.Image | Phaser.GameObjects.Arc
  private fuelPickups: Phaser.GameObjects.Rectangle[] = []
  private coinPickups: Phaser.GameObjects.Rectangle[] = []
  private nextPickupX: number = 300
  private cameraOffsetX: number = 0
  private hudText!: Phaser.GameObjects.Text
  private onGameOver?: (state: GameState) => void
  private currentLevel: LevelConfig
  private stars: Phaser.GameObjects.Rectangle[] = []
  private startedAtMs: number = 0
  private flippedSinceMs: number | null = null
  private isGrounded: boolean = false

  // Unity-like smoothed pedal inputs
  private brakeDamped: number = 0
  private gasDamped: number = 0
  private readonly brakeSmoothTimeSec: number = 0.1
  private readonly gasSmoothTimeSec: number = 0.1

  // Ground contacts tracked from *our* Matter engine
  private wheelContactCount: Record<number, number> = {}
  
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
    
    // Optional: Load terrain texture
    // this.load.image('ground', '/terrain/ground.png')
  }
  
  create() {
    this.startedAtMs = this.time.now

    // Set background color based on level
    this.cameras.main.setBackgroundColor(this.currentLevel.terrain.skyColor)

    // Allow Matter to decompose concave polygons (terrain)
    try {
      const decompLib = ((decomp as any).default ?? decomp) as any
      ;(Matter as any).Common.setDecomp(decompLib)
    } catch {
      // If this fails, Matter will warn and terrain physics may be wrong.
    }
    
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
    
    // Initialize Matter.js physics
    this.engine = Matter.Engine.create({
      enableSleeping: true,
      gravity: { x: 0, y: 1.2 }
    })
    
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
    const wheelOffsetX = 30
    const wheelOffsetY = 25
    const wheelRadius = 15

    const groundBack = this.terrain.getHeightAt(spawnX - wheelOffsetX)
    const groundFront = this.terrain.getHeightAt(spawnX + wheelOffsetX)

    // Place each wheel directly on the surface at its x-position
    const wheelBackY = groundBack - wheelRadius
    const wheelFrontY = groundFront - wheelRadius

    // Chassis center sits above the lower of the two wheel contact points
    const spawnY = Math.min(wheelBackY, wheelFrontY) - wheelOffsetY
    
    this.vehicle = new Vehicle(this, spawnX, spawnY, vehicleStats)

    // Ensure bodies start exactly at the computed positions
    Matter.Body.setPosition(this.vehicle.chassis, { x: spawnX, y: spawnY })
    Matter.Body.setPosition(this.vehicle.wheelBack, { x: spawnX - wheelOffsetX, y: wheelBackY })
    Matter.Body.setPosition(this.vehicle.wheelFront, { x: spawnX + wheelOffsetX, y: wheelFrontY })
    Matter.Body.setVelocity(this.vehicle.chassis, { x: 0, y: 0 })
    Matter.Body.setVelocity(this.vehicle.wheelBack, { x: 0, y: 0 })
    Matter.Body.setVelocity(this.vehicle.wheelFront, { x: 0, y: 0 })
    Matter.Body.setAngularVelocity(this.vehicle.chassis, 0)
    Matter.Body.setAngularVelocity(this.vehicle.wheelBack, 0)
    Matter.Body.setAngularVelocity(this.vehicle.wheelFront, 0)
    
    // Add vehicle to physics world
    Matter.Composite.add(this.engine.world, [
      ...this.vehicle.getBodies(),
      ...this.vehicle.getConstraints()
    ])

    // Ground detection via wheel collisions (IMPORTANT: use the standalone Matter engine events,
    // not Phaser's Matter plugin world)
    const isWheelGroundPair = (a: Matter.Body, b: Matter.Body): { wheel?: Matter.Body; ground?: Matter.Body } => {
      const aw = a.label === 'wheel'
      const bw = b.label === 'wheel'
      const ag = a.label === 'ground'
      const bg = b.label === 'ground'
      if (aw && bg) return { wheel: a, ground: b }
      if (bw && ag) return { wheel: b, ground: a }
      return {}
    }

    const incWheelContact = (wheel: Matter.Body) => {
      const id = wheel.id
      this.wheelContactCount[id] = (this.wheelContactCount[id] ?? 0) + 1
    }

    const decWheelContact = (wheel: Matter.Body) => {
      const id = wheel.id
      const next = (this.wheelContactCount[id] ?? 0) - 1
      this.wheelContactCount[id] = Math.max(0, next)
    }

    Matter.Events.on(this.engine, 'collisionStart', (evt: any) => {
      for (const pair of evt.pairs ?? []) {
        const { wheel } = isWheelGroundPair(pair.bodyA, pair.bodyB)
        if (wheel) incWheelContact(wheel)
      }
    })

    Matter.Events.on(this.engine, 'collisionEnd', (evt: any) => {
      for (const pair of evt.pairs ?? []) {
        const { wheel } = isWheelGroundPair(pair.bodyA, pair.bodyB)
        if (wheel) decWheelContact(wheel)
      }
    })
    
    // Create graphics for vehicle - use images if available, else shapes
    if (this.textures.exists('car-body')) {
      this.chassisGraphic = this.add.image(spawnX, spawnY, 'car-body')
      this.chassisGraphic.setDisplaySize(80, 40)
    } else {
      this.chassisGraphic = this.add.rectangle(spawnX, spawnY, 80, 40, 0x4169E1)
      this.chassisGraphic.setStrokeStyle(2, 0x000000)
    }
    this.chassisGraphic.setDepth(10)
    
    if (this.textures.exists('tire-back')) {
      this.wheelBackGraphic = this.add.image(spawnX - 30, spawnY + 25, 'tire-back')
      this.wheelBackGraphic.setDisplaySize(30, 30)
    } else {
      this.wheelBackGraphic = this.add.circle(spawnX - 30, spawnY + 25, 15, 0x333333)
      this.wheelBackGraphic.setStrokeStyle(2, 0x000000)
    }
    this.wheelBackGraphic.setDepth(10)
    
    if (this.textures.exists('tire-front')) {
      this.wheelFrontGraphic = this.add.image(spawnX + 30, spawnY + 25, 'tire-front')
      this.wheelFrontGraphic.setDisplaySize(30, 30)
    } else {
      this.wheelFrontGraphic = this.add.circle(spawnX + 30, spawnY + 25, 15, 0x333333)
      this.wheelFrontGraphic.setStrokeStyle(2, 0x000000)
    }
    this.wheelFrontGraphic.setDepth(10)
    
    // Setup input
    this.cursors = this.input.keyboard!.createCursorKeys()
    
    // Setup camera
    this.cameras.main.setBounds(-1000, 0, 999999, 2000)
    this.cameras.main.startFollow(this.chassisGraphic as any, true, 0.15, 0.15, -250, 0)
    this.cameras.main.setZoom(1.0)
    
    // Create HUD
    this.createHUD()
    
    // Spawn initial pickups
    this.spawnPickups()
  }
  
  private createHUD(): void {
    this.hudText = this.add.text(16, 16, '', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 }
    })
    this.hudText.setScrollFactor(0)
    this.hudText.setDepth(100)
  }
  
  private generateTerrainChunk(startX: number, endX: number): void {
    // Smaller spacing for smoother hills
    const points = this.terrain.generateChunk(startX, endX, 20)

      // Physics terrain: overlapped sloped segments between points.
      // This avoids the "stair-step" effect from vertical columns (which makes the car jump).
      const thickness = 90
      const bodies: Matter.Body[] = []
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i]
        const b = points[i + 1]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const len = Math.max(1, Math.sqrt(dx * dx + dy * dy))
        const angle = Math.atan2(dy, dx)
        const midX = (a.x + b.x) / 2
        const midY = (a.y + b.y) / 2

        // Overlap segments slightly to avoid tiny seams.
        const seg = Matter.Bodies.rectangle(midX, midY, len + 18, thickness, {
          isStatic: true,
          label: 'ground',
          angle,
          friction: 2.0,
          restitution: 0,
          slop: 0.01
        })
        bodies.push(seg)
      }

      this.terrainBodies.push(...bodies)
      Matter.Composite.add(this.engine.world, bodies)

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
    
    // Spawn fuel can
    if (this.nextPickupX < vehicleX + 800) {
      const x = this.nextPickupX
      const y = this.terrain.getHeightAt(x) - 50
      
      const fuelCan = this.add.rectangle(x, y, 20, 30, 0xFFFF00)
      fuelCan.setData('type', 'fuel')
      this.fuelPickups.push(fuelCan)
      
      this.nextPickupX += Phaser.Math.Between(200, 400)
    }
    
    // Spawn coins randomly
    if (Math.random() < 0.3) {
      const x = vehicleX + Phaser.Math.Between(300, 600)
      const y = this.terrain.getHeightAt(x) - 40
      
      const coin = this.add.rectangle(x, y, 15, 15, 0xFFD700)
      coin.setData('type', 'coin')
      this.coinPickups.push(coin)
    }
  }
  
  update(time: number, delta: number): void {
    if (this.gameState.isGameOver) return
    
    // Cap delta to prevent physics instability (Matter.js recommends <= 16.667ms)
    const fixedDelta = Math.min(delta, 1000 / 60)

    // Update grounded state from wheel contacts
    const backContacts = this.wheelContactCount[this.vehicle.wheelBack.id] ?? 0
    const frontContacts = this.wheelContactCount[this.vehicle.wheelFront.id] ?? 0
    this.isGrounded = backContacts > 0 || frontContacts > 0
    
    // Update physics
    Matter.Engine.update(this.engine, fixedDelta)
    
    // Sync graphics with physics bodies
    this.chassisGraphic.setPosition(this.vehicle.chassis.position.x, this.vehicle.chassis.position.y)
    this.chassisGraphic.setRotation(this.vehicle.chassis.angle)
    
    // Tires follow physics and spin
    this.wheelBackGraphic.setPosition(this.vehicle.wheelBack.position.x, this.vehicle.wheelBack.position.y)
    this.wheelBackGraphic.setRotation(this.vehicle.wheelBack.angle) // Spin based on physics
    
    this.wheelFrontGraphic.setPosition(this.vehicle.wheelFront.position.x, this.vehicle.wheelFront.position.y)
    this.wheelFrontGraphic.setRotation(this.vehicle.wheelFront.angle) // Spin based on physics
    
    // Handle input
    const pressingRight = this.cursors.right.isDown
    const pressingLeft = this.cursors.left.isDown

    const dtSeconds = fixedDelta / 1000

    // Unity-style: separate gas + brake pedals with smoothing
    const rawBrake = pressingLeft ? 1 : 0
    const rawGas = pressingRight ? 1 : 0

    // Exponential smoothing ~ SmoothDamp feel
    const damp = (current: number, target: number, smoothTime: number) => {
      if (smoothTime <= 0) return target
      const k = 1 - Math.exp(-dtSeconds / smoothTime)
      return current + (target - current) * k
    }

    this.brakeDamped = damp(this.brakeDamped, rawBrake, this.brakeSmoothTimeSec)
    this.gasDamped = damp(this.gasDamped, rawGas, this.gasSmoothTimeSec)

    // Constant fuel drain (Unity repo drains fuel continuously)
    this.gameState.fuel -= 0.5 * dtSeconds

    const hasFuel = this.gameState.fuel > 0
    if (!hasFuel) {
      this.vehicle.idleStabilize()
    } else if (rawBrake > 0) {
      this.vehicle.brake(this.brakeDamped, dtSeconds)
    } else if (rawGas > 0) {
      this.vehicle.drive(this.gasDamped, dtSeconds)
    } else {
      this.vehicle.idleStabilize()
    }

    // Air control (only when airborne)
    this.handleAirControl()
    
    // Update distance
    const vehiclePos = this.vehicle.getPosition()
    this.gameState.distance = Math.max(this.gameState.distance, Math.floor(vehiclePos.x / 10))
    
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
    this.hudText.setText([
      `Distance: ${this.gameState.distance}m`,
      `Fuel: ${Math.max(0, Math.floor(this.gameState.fuel))}`,
      `Coins: ${this.gameState.coins}`,
      `Speed: ${speed}`,
    ])
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

  private handleAirControl(): void {
    const pressingRight = this.cursors.right.isDown
    const pressingLeft = this.cursors.left.isDown

    const rawBrake = pressingLeft ? 1 : 0
    const rawGas = pressingRight ? 1 : 0
    const finalRawInput = rawBrake > 0 ? 1 : rawGas > 0 ? -1 : 0

    // Unity repo rotates more in air, less on ground
    const onAirRotation = 0.00045
    const onGroundRotation = 0.00012
    const torqueForce = this.isGrounded ? onGroundRotation : onAirRotation

    if (finalRawInput !== 0) {
      this.vehicle.chassis.torque += -finalRawInput * torqueForce
    }

    // Clamp chassis spin so it feels controllable
    this.vehicle.chassis.angularVelocity = Phaser.Math.Clamp(
      this.vehicle.chassis.angularVelocity,
      -0.18,
      0.18
    )
  }
}
