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
      stiffness: 0.8,  // Much stiffer suspension
      damping: 0.3,    // Higher damping to reduce bouncing
      length: 0
    })
    
    this.suspensionFront = Matter.Constraint.create({
      bodyA: this.chassis,
      pointA: { x: 30, y: 20 },
      bodyB: this.wheelFront,
      stiffness: 0.8,  // Much stiffer suspension
      damping: 0.3,    // Higher damping to reduce bouncing
      length: 0
    })
  }
  
  public getBodies(): Matter.Body[] {
    return [this.chassis, this.wheelBack, this.wheelFront]
  }
  
  public getConstraints(): Matter.Constraint[] {
    return [this.suspensionBack, this.suspensionFront]
  }
  
  public accelerate(): void {
    // Apply torque to back wheel (RIGHT = forward)
    Matter.Body.setAngularVelocity(
      this.wheelBack,
      this.wheelBack.angularVelocity + this.stats.torque * 0.002
    )
  }
  
  public brake(): void {
    // LEFT = brake / reverse
    Matter.Body.setAngularVelocity(
      this.wheelBack,
      this.wheelBack.angularVelocity - this.stats.torque * 0.001
    )
    Matter.Body.setAngularVelocity(
      this.wheelFront,
      this.wheelFront.angularVelocity - this.stats.torque * 0.001
    )
  }

  public idleStabilize(): void {
    // When no input, bleed wheel spin + reduce jitter
    Matter.Body.setAngularVelocity(this.wheelBack, this.wheelBack.angularVelocity * 0.92)
    Matter.Body.setAngularVelocity(this.wheelFront, this.wheelFront.angularVelocity * 0.92)
    Matter.Body.setAngularVelocity(this.chassis, this.chassis.angularVelocity * 0.92)
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
