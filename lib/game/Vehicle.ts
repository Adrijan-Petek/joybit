// @ts-nocheck
import planck from 'planck-js'
import { VehicleStats } from './types'

type WheelRig = {
  body: any
  rimBody: any
  joint: any
  prisJoint: any
  distJoint: any
  onGround: boolean
}

export class Vehicle {
  public readonly SCALE = 30

  // Collision categories/masks (from Code-Bullet sketch.js)
  private readonly WHEEL_CATEGORY = 0x0001
  private readonly CHASSIS_CATEGORY = 0x0002
  private readonly GRASS_CATEGORY = 0x0004
  private readonly DIRT_CATEGORY = 0x0008

  private readonly WHEEL_MASK = this.GRASS_CATEGORY
  private readonly CHASSIS_MASK = this.DIRT_CATEGORY

  // Expose these for the scene to render; they are Planck bodies.
  public chassisBody: any
  public wheels: WheelRig[] = []

  private wheelBackRig!: WheelRig
  private wheelFrontRig!: WheelRig

  private readonly chassisWidth = 125
  private readonly chassisHeight = 40
  private readonly wheelSize = 17
  private readonly rotationTorque = 2

  private motorState = 0 // -1 backward, 0 off, 1 forward

  private groundedBack = false
  private groundedFront = false

  constructor(world: any, xPx: number, yPx: number, _stats: VehicleStats) {
    const Vec2 = planck.Vec2

    const x = xPx / this.SCALE
    const y = yPx / this.SCALE

    this.chassisBody = world.createBody({
      type: 'dynamic',
      position: Vec2(x, y),
      angle: 0
    })

    // === Chassis fixtures (ported from Code-Bullet Car.js) ===
    // fixDef1
    const verts1 = [
      Vec2(-this.chassisWidth / 2, -this.chassisHeight / 2),
      Vec2(this.chassisWidth / 4 + 5, -this.chassisHeight / 2),
      Vec2(this.chassisWidth / 2, -this.chassisHeight / 2 + 5),
      Vec2(this.chassisWidth / 2, this.chassisHeight / 2),
      Vec2(-this.chassisWidth / 2, this.chassisHeight / 2)
    ].map(v => Vec2(v.x / this.SCALE, v.y / this.SCALE))

    this.chassisBody.createFixture(planck.Polygon(verts1), {
      density: 1,
      friction: 0.5,
      restitution: 0.01,
      filterCategoryBits: this.CHASSIS_CATEGORY,
      filterMaskBits: this.CHASSIS_MASK
    })

    // fixDef2
    const verts2 = [
      Vec2(this.chassisWidth / 4, -this.chassisHeight / 2),
      Vec2(this.chassisWidth / 4 - 15, -this.chassisHeight / 2 - 20),
      Vec2(this.chassisWidth / 4 - 5, -this.chassisHeight / 2 - 20),
      Vec2(this.chassisWidth / 4 + 10, -this.chassisHeight / 2)
    ].map(v => Vec2(v.x / this.SCALE, v.y / this.SCALE))

    this.chassisBody.createFixture(planck.Polygon(verts2), {
      density: 1,
      friction: 0.5,
      restitution: 0.01,
      filterCategoryBits: this.CHASSIS_CATEGORY,
      filterMaskBits: this.CHASSIS_MASK
    })

    // fixDef3
    const verts3 = [
      Vec2(this.chassisWidth / 2, -this.chassisHeight / 2 + 5),
      Vec2(this.chassisWidth / 2 + 5, -this.chassisHeight / 2 + 8),
      Vec2(this.chassisWidth / 2 + 5, this.chassisHeight / 2 - 5),
      Vec2(this.chassisWidth / 2, this.chassisHeight / 2)
    ].map(v => Vec2(v.x / this.SCALE, v.y / this.SCALE))

    this.chassisBody.createFixture(planck.Polygon(verts3), {
      density: 1,
      friction: 0.1,
      restitution: 0.1,
      filterCategoryBits: this.CHASSIS_CATEGORY,
      filterMaskBits: this.CHASSIS_MASK
    })

    this.chassisBody.setLinearDamping(0.25)
    this.chassisBody.setAngularDamping(0.35)

    // === Wheels (ported from Code-Bullet Wheel.js) ===
    const wheelBackX = xPx - this.chassisWidth / 2 + this.wheelSize * 1.2
    const wheelFrontX = xPx + this.chassisWidth / 2 - this.wheelSize * 1.2
    const wheelY = yPx + this.chassisHeight / 2 + this.wheelSize / 4

    this.wheelBackRig = this.createWheel(world, wheelBackX, wheelY, this.wheelSize, this.chassisBody)
    this.wheelFrontRig = this.createWheel(world, wheelFrontX, wheelY, this.wheelSize, this.chassisBody)
    this.wheels.push(this.wheelBackRig, this.wheelFrontRig)

    // Helpful userData for contact debugging (optional)
    this.chassisBody.setUserData({ id: 'car' })
  }

  private createWheel(world: any, xPx: number, yPx: number, rPx: number, chassisBody: any): WheelRig {
    const Vec2 = planck.Vec2
    const x = xPx / this.SCALE
    const y = yPx / this.SCALE
    const r = rPx / this.SCALE

    const wheelBody = world.createBody({ type: 'dynamic', position: Vec2(x, y), angle: 0 })
    wheelBody.createFixture(planck.Circle(r), {
      density: 1,
      friction: 1.5,
      restitution: 0,
      filterCategoryBits: this.WHEEL_CATEGORY,
      filterMaskBits: this.WHEEL_MASK
    })
    wheelBody.setLinearDamping(0.15)
    wheelBody.setAngularDamping(2.2)
    wheelBody.setUserData({ id: 'wheel' })

    const rimBody = world.createBody({ type: 'dynamic', position: Vec2(x, y), angle: 0 })
    rimBody.createFixture(planck.Circle(r), {
      density: 0.05,
      friction: 0.99,
      restitution: 0.2,
      // Rim is just a suspension carrier; prevent it colliding with ground/chassis.
      filterGroupIndex: -1,
      filterCategoryBits: this.WHEEL_CATEGORY,
      filterMaskBits: 0
    })
    rimBody.setUserData({ id: 'wheel' })

    // Revolute joint between wheel and rim (motor lives here)
    const joint = world.createJoint(planck.RevoluteJoint({
      enableMotor: false,
      maxMotorTorque: 0,
      motorSpeed: 0
    }, wheelBody, rimBody, wheelBody.getPosition()))

    // Prismatic joint between rim and chassis
    const prisJoint = world.createJoint(planck.PrismaticJoint({
      enableLimit: false,
      localAxisA: Vec2(0, -1)
    }, rimBody, chassisBody, wheelBody.getPosition()))

    // Distance joint for suspension spring
    const anchorWheel = Vec2(x, y)
    const anchorCar = Vec2(x, (yPx - rPx * 3) / this.SCALE)
    const distJoint = world.createJoint(planck.DistanceJoint({
      // Planck uses Box2D-style spring tuning; dampingRatio should be ~0..1.
      frequencyHz: 9,
      dampingRatio: 0.9
    }, rimBody, chassisBody, anchorWheel, anchorCar))

    return {
      body: wheelBody,
      rimBody,
      joint,
      prisJoint,
      distJoint,
      onGround: false
    }
  }

  public setGrounded(back: boolean, front: boolean): void {
    this.groundedBack = back
    this.groundedFront = front
  }

  public motorOn(forward: boolean): void {
    const motorSpeed = 10

    this.wheelBackRig.joint.enableMotor(true)
    this.wheelFrontRig.joint.enableMotor(true)

    const oldState = this.motorState
    if (forward) {
      this.motorState = 1
      this.wheelBackRig.joint.setMotorSpeed(-motorSpeed * Math.PI)
      this.wheelFrontRig.joint.setMotorSpeed(-motorSpeed * Math.PI)
      if (this.groundedBack || this.groundedFront) {
        this.chassisBody.applyTorque(-this.rotationTorque, true)
      }
    } else {
      this.motorState = -1
      this.wheelBackRig.joint.setMotorSpeed(motorSpeed * Math.PI)
      this.wheelFrontRig.joint.setMotorSpeed(motorSpeed * Math.PI)
    }

    if (oldState + this.motorState === 0) {
      if (oldState === 1) {
        this.applyTorque(this.motorState * -1)
      }
    }

    this.wheelBackRig.joint.setMaxMotorTorque(600)
    this.wheelFrontRig.joint.setMaxMotorTorque(300)

    // Only apply chassis torque when grounded; otherwise it can flip the car.
    if (this.groundedBack || this.groundedFront) {
      const torque = (forward ? -1 : 1) * 6
      this.chassisBody.applyTorque(torque, true)
    }
  }

  private applyTorque(direction: number): void {
    this.chassisBody.applyTorque(direction * this.rotationTorque)
  }

  public motorOff(): void {
    switch (this.motorState) {
      case 1:
        this.chassisBody.applyTorque(this.motorState * this.rotationTorque)
        break
    }
    this.motorState = 0
    this.wheelBackRig.joint.enableMotor(false)
    this.wheelFrontRig.joint.enableMotor(false)
  }

  // With real joint motors, nothing is needed per-frame.
  public updateMotor(_dtSeconds: number): void {
    // no-op
  }

  public getPosition(): { x: number; y: number } {
    const p = this.chassisBody.getPosition()
    return { x: p.x * this.SCALE, y: p.y * this.SCALE }
  }

  public getChassisRender(): { x: number; y: number; angle: number } {
    const p = this.chassisBody.getPosition()
    return { x: p.x * this.SCALE, y: p.y * this.SCALE, angle: this.chassisBody.getAngle() }
  }

  public getWheelBackRender(): { x: number; y: number; angle: number } {
    const p = this.wheelBackRig.body.getPosition()
    return { x: p.x * this.SCALE, y: p.y * this.SCALE, angle: this.wheelBackRig.body.getAngle() }
  }

  public getWheelFrontRender(): { x: number; y: number; angle: number } {
    const p = this.wheelFrontRig.body.getPosition()
    return { x: p.x * this.SCALE, y: p.y * this.SCALE, angle: this.wheelFrontRig.body.getAngle() }
  }

  public getAngle(): number {
    return this.chassisBody.getAngle() * (180 / Math.PI)
  }

  public isFlipped(): boolean {
    const angle = this.getAngle()
    // Normalize angle to -180 to 180
    let normalizedAngle = angle % 360
    if (normalizedAngle > 180) normalizedAngle -= 360
    if (normalizedAngle < -180) normalizedAngle += 360
    
    // Flipped if past 90 degrees (roof pointing down)
    return Math.abs(normalizedAngle) > 90
  }

  public getVelocity(): number {
    // Code-Bullet uses Box2D units; expose km/h-ish for HUD.
    const v = this.chassisBody.getLinearVelocity()
    const mps = Math.sqrt(v.x * v.x + v.y * v.y)
    return mps * 3.6
  }
}
