// Basebound vehicle catalog
// For now we only connect the starter vehicle (mini).
// Later, the menu can list and load other vehicles from metadata files.

export type VehicleAssetRef = { key: string; path: string }

export type VehicleMetadata = {
  id: number
  slug: string
  name: string
  isStarter: boolean
  unlockDistance: number
  price: number
  baseStats: {
    maxSpeed: number
    torque: number
    suspension: number
    fuelCapacity: number
    fuelEfficiency: number
    mass: number
    grip: number
  }
  parts: {
    body: VehicleAssetRef
    wheelBack: VehicleAssetRef
    wheelFront: VehicleAssetRef
  }
  audio: {
    start: VehicleAssetRef
    idle: VehicleAssetRef
    accelerate: VehicleAssetRef
  }
}

// Keep this as a code constant for now (no async fetch inside Phaser preload).
// Source-of-truth file lives at: public/basebound-game/vehicles/mini/metadata.json
export const MINI_VEHICLE: VehicleMetadata = {
  id: 1,
  slug: 'mini',
  name: 'Mini',
  isStarter: true,
  unlockDistance: 0,
  price: 0,
  baseStats: {
    maxSpeed: 24,
    torque: 15,
    suspension: 0.8,
    fuelCapacity: 100,
    fuelEfficiency: 1.0,
    mass: 100,
    grip: 1.0
  },
  parts: {
    body: { key: 'car-body', path: '/basebound-game/vehicles/mini/mini-topless.png' },
    wheelBack: { key: 'tire-back', path: '/basebound-game/vehicles/mini/wheel-back.png' },
    wheelFront: { key: 'tire-front', path: '/basebound-game/vehicles/mini/wheel-front.png' }
  },
  audio: {
    start: { key: 'mini-start', path: '/basebound-game/basebound-audio/cars/mini/start-mini.mp3' },
    idle: { key: 'mini-idle', path: '/basebound-game/basebound-audio/cars/mini/idle-mini.mp3' },
    accelerate: { key: 'mini-accelerate', path: '/basebound-game/basebound-audio/cars/mini/accelerate-mini.mp3' }
  }
}

export const VEHICLE_CATALOG: VehicleMetadata[] = [MINI_VEHICLE]
