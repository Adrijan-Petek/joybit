// @ts-nocheck
import { createNoise2D } from 'simplex-noise'
import { TerrainPoint } from './types'

export class Terrain {
  private noise: any
  private baseY: number
  private amplitude: number
  private frequency: number

  private static mulberry32(seed: number): () => number {
    let t = seed >>> 0
    return () => {
      t += 0x6D2B79F5
      let r = Math.imul(t ^ (t >>> 15), 1 | t)
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296
    }
  }
  
  constructor(
    seed: number = Date.now(),
    baseY: number = 450,
    amplitude: number = 200,
    frequency: number = 0.008
  ) {
    // IMPORTANT: seed the noise generator; do NOT pass Date.now() as a noise coordinate
    const rng = Terrain.mulberry32(seed)
    this.noise = createNoise2D(rng)
    this.baseY = baseY
    this.amplitude = amplitude
    this.frequency = frequency
  }

  private heightAt(x: number): number {
    // Hill Climb-style rolling hills: layered sine waves + a bit of seeded noise
    const t = x * this.frequency
    const ramp = Math.max(0, Math.min(1, x / 500))
    const hills =
      Math.sin(t) * (this.amplitude * 0.65) +
      Math.sin(t * 0.5) * (this.amplitude * 0.25)
    const roughness = this.noise(t * 0.7, 0) * (this.amplitude * 0.18)
    return this.baseY + (hills + roughness) * ramp
  }
  
  public generateChunk(startX: number, endX: number, pointSpacing: number = 50): TerrainPoint[] {
    const points: TerrainPoint[] = []
    
    for (let x = startX; x <= endX; x += pointSpacing) {
      points.push({ x, y: this.heightAt(x) })
    }
    
    return points
  }
  
  public getHeightAt(x: number): number {
    return this.heightAt(x)
  }
}
