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
      density: 0.01,
      friction: 0.8,
      frictionAir: 0.02,
      restitution: 0.02,
      render: {
        fillStyle: '#4169E1'
      }
    })
    
    // Create wheels
    const wheelRadius = 15
    this.wheelBack = Matter.Bodies.circle(x - 30, y + 25, wheelRadius, {
      density: 0.02,
      friction: stats.grip,
      frictionAir: 0.01,
      restitution: 0.01,
      render: {
        fillStyle: '#000000'
      }
    })
    
    this.wheelFront = Matter.Bodies.circle(x + 30, y + 25, wheelRadius, {
      density: 0.02,
      friction: stats.grip,
      frictionAir: 0.01,
      restitution: 0.01,
      render: {
        fillStyle: '#000000'
      }
    })
    
    // Create suspension constraints
    this.suspensionBack = Matter.Constraint.create({
      bodyA: this.chassis,
      pointA: { x: -30, y: 20 },
      bodyB: this.wheelBack,
      stiffness: 0.55,
      damping: 0.7,
      length: 12
    })
    
    this.suspensionFront = Matter.Constraint.create({
      bodyA: this.chassis,
      pointA: { x: 30, y: 20 },
      bodyB: this.wheelFront,
      stiffness: 0.55,
      damping: 0.7,
      length: 12
    })
  }
  
  public getBodies(): Matter.Body[] {
    return [this.chassis, this.wheelBack, this.wheelFront]
  }
  
  public getConstraints(): Matter.Constraint[] {
    return [this.suspensionBack, this.suspensionFront]
  }
  
  public drive(throttle: number, dtSeconds: number): void {
    // throttle: -1..1 (negative = reverse)
    const t = Math.max(-1, Math.min(1, throttle))

    // Convert vehicle maxSpeed into a wheel angular velocity target.
    // Kept conservative to avoid jitter/explosions.
    const maxWheelAngVel = Math.max(6, Math.min(18, this.stats.maxSpeed * 0.25))
    const target = t * maxWheelAngVel

    const lerp = (a: number, b: number, k: number) => a + (b - a) * k
    const response = Math.max(0.06, Math.min(0.25, dtSeconds * 6))

    const back = lerp(this.wheelBack.angularVelocity, target, response)
    const front = lerp(this.wheelFront.angularVelocity, target, response * 0.7)

    Matter.Body.setAngularVelocity(this.wheelBack, back)
    Matter.Body.setAngularVelocity(this.wheelFront, front)
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
