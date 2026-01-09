import type { UpgradeLevels, VehicleStats } from './types'
import type { VehicleMetadata } from './vehicleCatalog'

export type BaseboundProfile = {
  selectedVehicleId: number
  coins: number
  bestDistance: number
  upgrades: UpgradeLevels
}

const STORAGE_KEY = 'joybit_basebound_profile_v1'

const DEFAULT_PROFILE: BaseboundProfile = {
  selectedVehicleId: 1,
  coins: 0,
  bestDistance: 0,
  upgrades: {
    engine: 0,
    suspension: 0,
    tires: 0,
    fuel: 0
  }
}

export function loadBaseboundProfile(): BaseboundProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PROFILE
    const parsed = JSON.parse(raw) as Partial<BaseboundProfile>

    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      upgrades: {
        ...DEFAULT_PROFILE.upgrades,
        ...(parsed.upgrades ?? {})
      }
    }
  } catch {
    return DEFAULT_PROFILE
  }
}

export function saveBaseboundProfile(profile: BaseboundProfile): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
}

export function getUpgradeCost(upgradeKey: keyof UpgradeLevels, currentLevel: number): number {
  // Simple escalating costs, tuned for small coin economy
  const baseCosts: Record<keyof UpgradeLevels, number> = {
    engine: 50,
    suspension: 40,
    tires: 40,
    fuel: 30
  }

  // level 0 -> 50, level 1 -> 75, level 2 -> 100 ...
  return Math.round(baseCosts[upgradeKey] * (1 + currentLevel * 0.5))
}

export function applyUpgradesToStats(base: VehicleMetadata['baseStats'], upgrades: UpgradeLevels): VehicleStats {
  // Keep it predictable and incremental.
  // Levels are expected to be small integers.
  const engine = upgrades.engine
  const suspension = upgrades.suspension
  const tires = upgrades.tires
  const fuel = upgrades.fuel

  return {
    maxSpeed: base.maxSpeed + engine * 1.5,
    torque: base.torque + engine * 1.2,
    suspension: base.suspension + suspension * 0.05,
    fuelCapacity: base.fuelCapacity + fuel * 8,
    fuelEfficiency: Math.max(0.5, base.fuelEfficiency - fuel * 0.02),
    mass: Math.max(40, base.mass - engine * 1.0),
    grip: base.grip + tires * 0.04
  }
}
