// @ts-nocheck
import { TerrainPoint } from './types'

export class Terrain {
  private seed: number
  private baseY: number
  private amplitude: number
  private frequency: number
  private smoothness: number

  constructor(
    seed: number = Date.now(),
    baseY: number = 450,
    amplitude: number = 200,
    frequency: number = 0.008,
    smoothness: number = 15
  ) {
    this.seed = seed
    this.baseY = baseY
    this.amplitude = amplitude
    this.frequency = frequency
    this.smoothness = smoothness // spacing between terrain points (Code-Bullet uses 15)
  }

  // Simple noise function (deterministic pseudo-random)
  private noise(x: number): number {
    const n = Math.sin(x * 0.001 + this.seed) * 43758.5453
    return n - Math.floor(n)
  }

  // Perlin-like noise with smoothing (Code-Bullet style)
  private smoothNoise(x: number): number {
    const intX = Math.floor(x)
    const fractX = x - intX
    
    const v1 = this.noise(intX)
    const v2 = this.noise(intX + 1)
    
    // Smooth interpolation (cosine)
    const mu = (1 - Math.cos(fractX * Math.PI)) / 2
    return v1 * (1 - mu) + v2 * mu
  }

  private heightAt(x: number): number {
    // Code-Bullet terrain: noise-based with progressive difficulty
    const flatLength = 0 // hills start immediately

    if (x < flatLength) return this.baseY
    
    // Noise-based terrain after flat start
    const adjustedX = x - flatLength
    // Scale by frequency directly; previous formula made noise almost constant.
    const noiseValue = this.smoothNoise(adjustedX * this.frequency)
    
    // Progressive difficulty: steeper hills further you go
    const progressiveSteepness = 1 + Math.min(1.5, adjustedX / 5000)
    const maxHeight = this.amplitude * progressiveSteepness
    const minHeight = 30
    
    return this.baseY - (noiseValue * (maxHeight - minHeight) + minHeight)
  }
  
  public generateChunk(startX: number, endX: number, pointSpacing: number = 15): TerrainPoint[] {
    const points: TerrainPoint[] = []
    
    // Code-Bullet uses smoothness=15 for point spacing
    const spacing = pointSpacing || this.smoothness
    
    for (let x = startX; x <= endX; x += spacing) {
      points.push({ x, y: this.heightAt(x) })
    }
    
    return points
  }
  
  public getHeightAt(x: number): number {
    return this.heightAt(x)
  }
}
