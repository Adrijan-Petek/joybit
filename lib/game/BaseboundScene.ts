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
      maxSpeed: 50,
      torque: 40,    // Increased torque for better control
      suspension: 0.8, // Higher suspension value
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
    const ground = Math.min(groundBack, groundFront)

    // Vehicle constructor expects chassis center at (spawnX, spawnY) and wheels at (x±30, y+25)
    // Put wheel centers just above ground so it settles onto the surface.
    const wheelCenterY = ground - wheelRadius - 6
    const spawnY = wheelCenterY - wheelOffsetY
    
    this.vehicle = new Vehicle(this, spawnX, spawnY, vehicleStats)

    // Ensure bodies start exactly at the computed positions
    Matter.Body.setPosition(this.vehicle.chassis, { x: spawnX, y: spawnY })
    Matter.Body.setPosition(this.vehicle.wheelBack, { x: spawnX - wheelOffsetX, y: spawnY + wheelOffsetY })
    Matter.Body.setPosition(this.vehicle.wheelFront, { x: spawnX + wheelOffsetX, y: spawnY + wheelOffsetY })
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

    // Physics terrain (robust): vertical columns under the surface points.
    // This matches the rendered terrain exactly and avoids concave polygon edge-cases.
    const bottomY = 2000
    const spacing = points.length > 1 ? Math.max(10, points[1].x - points[0].x) : 20
    const columnWidth = spacing + 4

    const bodies: Matter.Body[] = []
    for (const p of points) {
      const height = Math.max(20, bottomY - p.y)
      const centerY = p.y + height / 2
      bodies.push(
        Matter.Bodies.rectangle(p.x, centerY, columnWidth, height, {
          isStatic: true,
          friction: 2.0,
          restitution: 0,
          slop: 0.01
        })
      )
    }

    this.terrainBodies.push(...bodies)
    Matter.Composite.add(this.engine.world, bodies)

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

    if (pressingRight) {
      this.vehicle.accelerate()
      this.gameState.fuel -= 0.5 * (delta / 1000)
    }

    if (pressingLeft) {
      this.vehicle.brake()
    }

    // No input: stabilize so it doesn't keep hopping/jittering
    if (!pressingRight && !pressingLeft) {
      this.vehicle.idleStabilize()

      // If basically stopped, allow Matter sleeping to kick in
      const v = this.vehicle.chassis.velocity
      const speedSq = v.x * v.x + v.y * v.y
      if (speedSq < 0.02) {
        // Hard stop then sleep to remove tiny jitter forever
        Matter.Body.setVelocity(this.vehicle.chassis, { x: 0, y: 0 })
        Matter.Body.setVelocity(this.vehicle.wheelBack, { x: 0, y: 0 })
        Matter.Body.setVelocity(this.vehicle.wheelFront, { x: 0, y: 0 })
        Matter.Body.setAngularVelocity(this.vehicle.chassis, 0)
        Matter.Body.setAngularVelocity(this.vehicle.wheelBack, 0)
        Matter.Body.setAngularVelocity(this.vehicle.wheelFront, 0)

        Matter.Sleeping.set(this.vehicle.chassis, true)
        Matter.Sleeping.set(this.vehicle.wheelBack, true)
        Matter.Sleeping.set(this.vehicle.wheelFront, true)
      }
    } else {
      // Wake if player is interacting
      Matter.Sleeping.set(this.vehicle.chassis, false)
      Matter.Sleeping.set(this.vehicle.wheelBack, false)
      Matter.Sleeping.set(this.vehicle.wheelFront, false)
    }
    
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
}
