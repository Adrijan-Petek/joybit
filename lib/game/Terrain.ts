// @ts-nocheck
import { TerrainPoint } from './types'

export class Terrain {
  private seed: number
  private baseY: number
  private amplitude: number
  private frequency: number

  private keySpacing: number
  private anchorHeights: Map<number, number> = new Map()
  private minAnchorIndex: number = 0
  private maxAnchorIndex: number = 0

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
    this.seed = seed
    this.baseY = baseY
    this.amplitude = amplitude
    this.frequency = frequency

    // Larger spacing = longer, smoother hills (closer to Hill Climb)
    // Keep it tied to frequency so different levels still feel distinct.
    this.keySpacing = Math.max(80, Math.min(160, Math.round(120 - this.frequency * 6000)))

    // Anchor 0 at base height
    this.anchorHeights.set(0, this.baseY)
    this.minAnchorIndex = 0
    this.maxAnchorIndex = 0
  }

  private rand01ForIndex(i: number): number {
    // Deterministic per-key random in [0,1)
    const rng = Terrain.mulberry32((this.seed ^ (i * 0x9E3779B9)) >>> 0)
    return rng()
  }

  private ensureAnchor(index: number): number {
    if (this.anchorHeights.has(index)) return this.anchorHeights.get(index)!

    const stepOnce = (fromIndex: number, fromY: number, toIndex: number): number => {
      // Random walk with slope/height constraints
      const r = this.rand01ForIndex(toIndex) * 2 - 1 // [-1, 1]
      const maxStep = this.amplitude * 0.55
      const delta = r * maxStep

      let nextY = fromY + delta
      const minY = this.baseY - this.amplitude
      const maxY = this.baseY + this.amplitude
      nextY = Math.max(minY, Math.min(maxY, nextY))

      // Dampen big flips in direction by blending back toward baseY
      nextY = fromY * 0.65 + nextY * 0.35
      this.anchorHeights.set(toIndex, nextY)
      return nextY
    }

    if (index > this.maxAnchorIndex) {
      let currentIndex = this.maxAnchorIndex
      let currentY = this.anchorHeights.get(currentIndex)!
      while (currentIndex < index) {
        const nextIndex = currentIndex + 1
        currentY = stepOnce(currentIndex, currentY, nextIndex)
        currentIndex = nextIndex
      }
      this.maxAnchorIndex = index
      return this.anchorHeights.get(index)!
    }

    if (index < this.minAnchorIndex) {
      let currentIndex = this.minAnchorIndex
      let currentY = this.anchorHeights.get(currentIndex)!
      while (currentIndex > index) {
        const nextIndex = currentIndex - 1
        currentY = stepOnce(currentIndex, currentY, nextIndex)
        currentIndex = nextIndex
      }
      this.minAnchorIndex = index
      return this.anchorHeights.get(index)!
    }

    // Should be covered by map hit, but keep safe fallback
    return this.anchorHeights.get(index) ?? this.baseY
  }

  private catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
    // Standard Catmull-Rom spline (uniform)
    const t2 = t * t
    const t3 = t2 * t
    return (
      0.5 *
      (2 * p1 +
        (-p0 + p2) * t +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
        (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
    )
  }

  private heightAt(x: number): number {
    const ramp = Math.max(0, Math.min(1, x / 500))

    const k = this.keySpacing
    const i = Math.floor(x / k)
    const t = (x - i * k) / k

    const p0 = this.ensureAnchor(i - 1)
    const p1 = this.ensureAnchor(i)
    const p2 = this.ensureAnchor(i + 1)
    const p3 = this.ensureAnchor(i + 2)

    const y = this.catmullRom(p0, p1, p2, p3, Math.max(0, Math.min(1, t)))
    return this.baseY + (y - this.baseY) * ramp
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
