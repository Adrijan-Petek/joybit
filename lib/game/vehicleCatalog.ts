// Basebound vehicle catalog

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

const BASE_AUDIO = {
  start: '/basebound-game/basebound-audio/cars/mini/start-mini.mp3',
  idle: '/basebound-game/basebound-audio/cars/mini/idle-mini.mp3',
  accelerate: '/basebound-game/basebound-audio/cars/mini/accelerate-mini.mp3'
}

const makeAudio = (slug: string) => ({
  start: { key: `${slug}-start`, path: BASE_AUDIO.start },
  idle: { key: `${slug}-idle`, path: BASE_AUDIO.idle },
  accelerate: { key: `${slug}-accelerate`, path: BASE_AUDIO.accelerate }
})

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
  audio: makeAudio('mini')
}

export const VEHICLE_CATALOG: VehicleMetadata[] = [
  MINI_VEHICLE,
  {
    id: 2,
    slug: 'cartoon-car',
    name: 'Cartoon Car',
    isStarter: false,
    unlockDistance: 300,
    price: 200,
    baseStats: {
      maxSpeed: 26,
      torque: 16,
      suspension: 0.9,
      fuelCapacity: 105,
      fuelEfficiency: 0.98,
      mass: 95,
      grip: 1.05
    },
    parts: {
      body: { key: 'cartoon-body', path: '/basebound-game/vehicles/cartoon%20car/car-body.png' },
      wheelBack: { key: 'cartoon-wheel-back', path: '/basebound-game/vehicles/cartoon%20car/tire.png' },
      wheelFront: { key: 'cartoon-wheel-front', path: '/basebound-game/vehicles/cartoon%20car/tire.png' }
    },
    audio: makeAudio('cartoon-car')
  },
  {
    id: 3,
    slug: 'off-road-racer',
    name: 'Off Road',
    isStarter: false,
    unlockDistance: 600,
    price: 400,
    baseStats: {
      maxSpeed: 28,
      torque: 18,
      suspension: 1.05,
      fuelCapacity: 110,
      fuelEfficiency: 0.96,
      mass: 110,
      grip: 1.12
    },
    parts: {
      body: { key: 'offroad-body', path: '/basebound-game/vehicles/off%20road%20racing/car-body.png' },
      wheelBack: { key: 'offroad-wheel-back', path: '/basebound-game/vehicles/off%20road%20racing/car-wheel.png' },
      wheelFront: { key: 'offroad-wheel-front', path: '/basebound-game/vehicles/off%20road%20racing/car-wheel.png' }
    },
    audio: makeAudio('off-road-racer')
  },
  {
    id: 4,
    slug: 'school-bus',
    name: 'School Bus',
    isStarter: false,
    unlockDistance: 900,
    price: 600,
    baseStats: {
      maxSpeed: 20,
      torque: 20,
      suspension: 0.9,
      fuelCapacity: 130,
      fuelEfficiency: 0.92,
      mass: 160,
      grip: 0.95
    },
    parts: {
      body: { key: 'bus-body', path: '/basebound-game/vehicles/school%20bus/school-bus-carcass.png' },
      wheelBack: { key: 'bus-wheel-back', path: '/basebound-game/vehicles/school%20bus/wheel.png' },
      wheelFront: { key: 'bus-wheel-front', path: '/basebound-game/vehicles/school%20bus/wheel.png' }
    },
    audio: makeAudio('school-bus')
  },
  {
    id: 5,
    slug: 'swat-van',
    name: 'Swat Van',
    isStarter: false,
    unlockDistance: 1200,
    price: 800,
    baseStats: {
      maxSpeed: 22,
      torque: 22,
      suspension: 0.95,
      fuelCapacity: 125,
      fuelEfficiency: 0.94,
      mass: 150,
      grip: 1.0
    },
    parts: {
      body: { key: 'swat-body', path: '/basebound-game/vehicles/swat%20van/body.png' },
      wheelBack: { key: 'swat-wheel-back', path: '/basebound-game/vehicles/swat%20van/tire-back.png' },
      wheelFront: { key: 'swat-wheel-front', path: '/basebound-game/vehicles/swat%20van/tire-front.png' }
    },
    audio: makeAudio('swat-van')
  },
  {
    id: 6,
    slug: 'bike-commuter',
    name: 'Commuter Bike',
    isStarter: false,
    unlockDistance: 1500,
    price: 1000,
    baseStats: {
      maxSpeed: 30,
      torque: 14,
      suspension: 0.85,
      fuelCapacity: 90,
      fuelEfficiency: 0.9,
      mass: 70,
      grip: 1.15
    },
    parts: {
      body: { key: 'bike-commuter-body', path: '/basebound-game/vehicles/motor%20bikes/motor%20bikes/commuter/body.png' },
      wheelBack: { key: 'bike-commuter-wheel-back', path: '/basebound-game/vehicles/motor%20bikes/motor%20bikes/commuter/tire.png' },
      wheelFront: { key: 'bike-commuter-wheel-front', path: '/basebound-game/vehicles/motor%20bikes/motor%20bikes/commuter/tire.png' }
    },
    audio: makeAudio('bike-commuter')
  },
  {
    id: 7,
    slug: 'bike-touring',
    name: 'Touring Bike',
    isStarter: false,
    unlockDistance: 1800,
    price: 1200,
    baseStats: {
      maxSpeed: 32,
      torque: 16,
      suspension: 0.9,
      fuelCapacity: 95,
      fuelEfficiency: 0.9,
      mass: 75,
      grip: 1.12
    },
    parts: {
      body: { key: 'bike-touring-body', path: '/basebound-game/vehicles/motor%20bikes/motor%20bikes/touring/body.png' },
      wheelBack: { key: 'bike-touring-wheel-back', path: '/basebound-game/vehicles/motor%20bikes/motor%20bikes/touring/tire.png' },
      wheelFront: { key: 'bike-touring-wheel-front', path: '/basebound-game/vehicles/motor%20bikes/motor%20bikes/touring/tire.png' }
    },
    audio: makeAudio('bike-touring')
  },
  {
    id: 8,
    slug: 'bike-enduro',
    name: 'Enduro Bike',
    isStarter: false,
    unlockDistance: 2100,
    price: 1400,
    baseStats: {
      maxSpeed: 31,
      torque: 17,
      suspension: 1.1,
      fuelCapacity: 95,
      fuelEfficiency: 0.9,
      mass: 78,
      grip: 1.2
    },
    parts: {
      body: { key: 'bike-enduro-body', path: '/basebound-game/vehicles/motor%20bikes/motor%20bikes/enduro/body.png' },
      wheelBack: { key: 'bike-enduro-wheel-back', path: '/basebound-game/vehicles/motor%20bikes/motor%20bikes/enduro/tire.png' },
      wheelFront: { key: 'bike-enduro-wheel-front', path: '/basebound-game/vehicles/motor%20bikes/motor%20bikes/enduro/tire.png' }
    },
    audio: makeAudio('bike-enduro')
  },
  {
    id: 9,
    slug: 'bike-naked',
    name: 'Naked Bike',
    isStarter: false,
    unlockDistance: 2400,
    price: 1600,
    baseStats: {
      maxSpeed: 33,
      torque: 17,
      suspension: 0.95,
      fuelCapacity: 92,
      fuelEfficiency: 0.9,
      mass: 72,
      grip: 1.18
    },
    parts: {
      body: { key: 'bike-naked-body', path: '/basebound-game/vehicles/motor%20bikes/motor%20bikes/naked/body.png' },
      wheelBack: { key: 'bike-naked-wheel-back', path: '/basebound-game/vehicles/motor%20bikes/motor%20bikes/naked/tire.png' },
      wheelFront: { key: 'bike-naked-wheel-front', path: '/basebound-game/vehicles/motor%20bikes/motor%20bikes/naked/tire.png' }
    },
    audio: makeAudio('bike-naked')
  },
  {
    id: 10,
    slug: 'bike-off-road',
    name: 'Off Road Bike',
    isStarter: false,
    unlockDistance: 2700,
    price: 1800,
    baseStats: {
      maxSpeed: 31,
      torque: 18,
      suspension: 1.15,
      fuelCapacity: 92,
      fuelEfficiency: 0.9,
      mass: 80,
      grip: 1.22
    },
    parts: {
      body: { key: 'bike-offroad-body', path: '/basebound-game/vehicles/motor%20bikes/motor%20bikes/off%20road/body.png' },
      wheelBack: { key: 'bike-offroad-wheel-back', path: '/basebound-game/vehicles/motor%20bikes/motor%20bikes/off%20road/tire.png' },
      wheelFront: { key: 'bike-offroad-wheel-front', path: '/basebound-game/vehicles/motor%20bikes/motor%20bikes/off%20road/tire.png' }
    },
    audio: makeAudio('bike-off-road')
  },
  {
    id: 11,
    slug: 'bike-super-sport',
    name: 'Super Sport',
    isStarter: false,
    unlockDistance: 3000,
    price: 2000,
    baseStats: {
      maxSpeed: 36,
      torque: 18,
      suspension: 0.95,
      fuelCapacity: 90,
      fuelEfficiency: 0.88,
      mass: 70,
      grip: 1.15
    },
    parts: {
      body: { key: 'bike-supersport-body', path: '/basebound-game/vehicles/motor%20bikes/motor%20bikes/super%20sport/body.png' },
      wheelBack: { key: 'bike-supersport-wheel-back', path: '/basebound-game/vehicles/motor%20bikes/motor%20bikes/super%20sport/tire.png' },
      wheelFront: { key: 'bike-supersport-wheel-front', path: '/basebound-game/vehicles/motor%20bikes/motor%20bikes/super%20sport/tire.png' }
    },
    audio: makeAudio('bike-super-sport')
  },
  {
    id: 12,
    slug: 'bike-super-touring',
    name: 'Super Touring',
    isStarter: false,
    unlockDistance: 3300,
    price: 2200,
    baseStats: {
      maxSpeed: 34,
      torque: 19,
      suspension: 1.0,
      fuelCapacity: 98,
      fuelEfficiency: 0.9,
      mass: 85,
      grip: 1.12
    },
    parts: {
      body: { key: 'bike-supertouring-body', path: '/basebound-game/vehicles/motor%20bikes/motor%20bikes/super%20touring/body.png' },
      wheelBack: { key: 'bike-supertouring-wheel-back', path: '/basebound-game/vehicles/motor%20bikes/motor%20bikes/super%20touring/tire.png' },
      wheelFront: { key: 'bike-supertouring-wheel-front', path: '/basebound-game/vehicles/motor%20bikes/motor%20bikes/super%20touring/tire.png' }
    },
    audio: makeAudio('bike-super-touring')
  },
  {
    id: 13,
    slug: 'bike-custom',
    name: 'Custom Bike',
    isStarter: false,
    unlockDistance: 3600,
    price: 2400,
    baseStats: {
      maxSpeed: 33,
      torque: 20,
      suspension: 0.95,
      fuelCapacity: 95,
      fuelEfficiency: 0.9,
      mass: 88,
      grip: 1.1
    },
    parts: {
      body: { key: 'bike-custom-body', path: '/basebound-game/vehicles/motor%20bikes/motor%20bikes/cutom/body.png' },
      wheelBack: { key: 'bike-custom-wheel-back', path: '/basebound-game/vehicles/motor%20bikes/motor%20bikes/cutom/tire.png' },
      wheelFront: { key: 'bike-custom-wheel-front', path: '/basebound-game/vehicles/motor%20bikes/motor%20bikes/cutom/tire.png' }
    },
    audio: makeAudio('bike-custom')
  }
]
