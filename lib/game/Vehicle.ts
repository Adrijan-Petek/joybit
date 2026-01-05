// @ts-nocheck
import * as Matter from 'matter-js'
import { VehicleStats } from './types'

export class Vehicle {
  public chassis: Matter.Body
  public wheelBack: Matter.Body
  public wheelFront: Matter.Body
  private suspensionBack: Matter.Constraint
  private suspensionFront: Matter.Constraint
  private stats: VehicleStats
  
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    stats: VehicleStats
  ) {
    this.stats = stats
    
    // Create chassis (main body)
    this.chassis = Matter.Bodies.rectangle(x, y, 80, 40, {
      density: 0.0025,
      friction: 0.35,
      frictionAir: 0.03,
      restitution: 0,
      render: {
        fillStyle: '#4169E1'
      }
    })
    
    // Create wheels
    const wheelRadius = 15
    this.wheelBack = Matter.Bodies.circle(x - 30, y + 25, wheelRadius, {
      density: 0.02,
      friction: Math.min(1.2, stats.grip + 0.2),
      frictionAir: 0.02,
      restitution: 0.01,
      label: 'wheel',
      render: {
        fillStyle: '#000000'
      }
    })
    
    this.wheelFront = Matter.Bodies.circle(x + 30, y + 25, wheelRadius, {
      density: 0.02,
      friction: Math.min(1.2, stats.grip + 0.2),
      frictionAir: 0.02,
      restitution: 0.01,
      label: 'wheel',
      render: {
        fillStyle: '#000000'
      }
    })
    
    // Create suspension constraints
    this.suspensionBack = Matter.Constraint.create({
      bodyA: this.chassis,
      pointA: { x: -30, y: 20 },
      bodyB: this.wheelBack,
      stiffness: 0.62,
      damping: 0.85,
      length: 10
    })
    
    this.suspensionFront = Matter.Constraint.create({
      bodyA: this.chassis,
      pointA: { x: 30, y: 20 },
      bodyB: this.wheelFront,
      stiffness: 0.62,
      damping: 0.85,
      length: 10
    })
  }
  
  public getBodies(): Matter.Body[] {
    return [this.chassis, this.wheelBack, this.wheelFront]
  }
  
  public getConstraints(): Matter.Constraint[] {
    return [this.suspensionBack, this.suspensionFront]
  }
  
  private clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v))
  }

  private wakeAll(): void {
    try {
      ;(Matter as any).Sleeping?.set?.(this.chassis, false)
      ;(Matter as any).Sleeping?.set?.(this.wheelBack, false)
      ;(Matter as any).Sleeping?.set?.(this.wheelFront, false)
    } catch {
      // ignore
    }
  }

  private motorToTarget(wheel: Matter.Body, targetAngVel: number, dtSeconds: number, accel: number): void {
    // Robust motor for Matter: directly control angular velocity with an acceleration limit.
    // (Torque-based motors often feel too weak at small timesteps / can be swallowed by sleeping.)
    const dt = Math.max(0.001, dtSeconds)
    const current = wheel.angularVelocity
    const maxDelta = accel * dt
    const next = current + this.clamp(targetAngVel - current, -maxDelta, maxDelta)
    Matter.Body.setAngularVelocity(wheel, next)
  }

  public drive(gas: number, dtSeconds: number): void {
    // gas: 0..1
    const g = this.clamp(gas, 0, 1)
    if (g <= 0) return

    this.wakeAll()

    // Convert vehicle maxSpeed into a wheel angular velocity target.
    // In Matter units, ~8-16 rad/s is a good controllable range.
    const maxWheelAngVel = this.clamp(this.stats.maxSpeed * 0.32, 8, 18)
    const target = g * maxWheelAngVel

    // Acceleration control (how fast wheels spin up)
    const accel = 55 * (this.stats.torque / 22)

    // Drive mostly rear wheel, lightly front wheel (Hill Climb vibe)
    this.motorToTarget(this.wheelBack, target, dtSeconds, accel)
    this.motorToTarget(this.wheelFront, target * 0.35, dtSeconds, accel * 0.75)
  }

  public brake(brake: number, dtSeconds: number): void {
    // brake: 0..1
    const b = this.clamp(brake, 0, 1)
    if (b <= 0) return

    this.wakeAll()

    // Strongly pull wheel angular velocity toward 0
    const brakeAccel = 140 * b
    this.motorToTarget(this.wheelBack, 0, dtSeconds, brakeAccel)
    this.motorToTarget(this.wheelFront, 0, dtSeconds, brakeAccel)
  }

  public idleStabilize(): void {
    // When no input, bleed wheel spin + reduce jitter
    Matter.Body.setAngularVelocity(this.wheelBack, this.wheelBack.angularVelocity * 0.85)
    Matter.Body.setAngularVelocity(this.wheelFront, this.wheelFront.angularVelocity * 0.85)
    Matter.Body.setAngularVelocity(this.chassis, this.chassis.angularVelocity * 0.88)
  }
  
  public getPosition(): { x: number; y: number } {
    return {
      x: this.chassis.position.x,
      y: this.chassis.position.y
    }
  }
  
  public getAngle(): number {
    return this.chassis.angle * (180 / Math.PI)
  }
  
  public isFlipped(): boolean {
    const angle = Math.abs(this.getAngle())
    return angle > 90 && angle < 270
  }
  
  public getVelocity(): number {
    return Math.sqrt(
      this.chassis.velocity.x ** 2 + this.chassis.velocity.y ** 2
    )
  }
}
