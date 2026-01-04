// Basebound Game Types

export interface VehicleStats {
  maxSpeed: number
  torque: number
  suspension: number
  fuelCapacity: number
  fuelEfficiency: number
  mass: number
  grip: number
}

export interface TerrainPoint {
  x: number
  y: number
}

export interface GameState {
  distance: number
  fuel: number
  coins: number
  isGameOver: boolean
  crashReason?: 'flip' | 'fuel'
}

export interface UpgradeLevels {
  engine: number
  suspension: number
  tires: number
  fuel: number
}

export interface VehicleData {
  id: number
  name: string
  baseStats: VehicleStats
  unlockDistance: number
  price: number
}

export interface LevelData {
  id: number
  name: string
  theme: string
  unlockDistance: number
  difficulty: number
  gravity: number
  terrainAmplitude: number
  terrainFrequency: number
}
