// @ts-nocheck
export interface LevelConfig {
  id: number
  name: string
  terrain: {
    baseY: number
    amplitude: number
    frequency: number
    groundColor: number
    groundTopColor: number
    skyColor: string
    obstacleColor: number
  }
  environment: {
    backgroundColor: string
    hasStars: boolean
    hasClouds: boolean
  }
}

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: 'Countryside',
    terrain: {
      baseY: 450,
      amplitude: 200,
      frequency: 0.008,
      groundColor: 0x228B22,      // Forest green
      groundTopColor: 0x32CD32,   // Lime green
      skyColor: '#87CEEB',        // Sky blue
      obstacleColor: 0x8B4513     // Brown rocks
    },
    environment: {
      backgroundColor: '#87CEEB',
      hasStars: false,
      hasClouds: true
    }
  },
  {
    id: 2,
    name: 'Desert',
    terrain: {
      baseY: 450,
      amplitude: 180,
      frequency: 0.009,
      groundColor: 0xDEB887,      // Burlywood
      groundTopColor: 0xF4A460,   // Sandy brown
      skyColor: '#FFD700',        // Gold sky
      obstacleColor: 0x8B7355     // Desert rocks
    },
    environment: {
      backgroundColor: '#FFD700',
      hasStars: false,
      hasClouds: false
    }
  },
  {
    id: 3,
    name: 'Arctic',
    terrain: {
      baseY: 450,
      amplitude: 160,
      frequency: 0.010,
      groundColor: 0xE0FFFF,      // Light cyan
      groundTopColor: 0xFFFFFF,   // White
      skyColor: '#B0E0E6',        // Powder blue
      obstacleColor: 0x4682B4     // Steel blue ice
    },
    environment: {
      backgroundColor: '#B0E0E6',
      hasStars: false,
      hasClouds: true
    }
  },
  {
    id: 4,
    name: 'Mountain',
    terrain: {
      baseY: 420,
      amplitude: 250,
      frequency: 0.006,
      groundColor: 0x696969,      // Dim gray
      groundTopColor: 0x808080,   // Gray
      skyColor: '#4682B4',        // Steel blue
      obstacleColor: 0x2F4F4F     // Dark slate gray
    },
    environment: {
      backgroundColor: '#4682B4',
      hasStars: false,
      hasClouds: true
    }
  },
  {
    id: 5,
    name: 'Volcano',
    terrain: {
      baseY: 450,
      amplitude: 220,
      frequency: 0.007,
      groundColor: 0x8B0000,      // Dark red
      groundTopColor: 0xFF4500,   // Orange red
      skyColor: '#FF6347',        // Tomato red sky
      obstacleColor: 0x000000     // Black lava rocks
    },
    environment: {
      backgroundColor: '#FF6347',
      hasStars: false,
      hasClouds: false
    }
  },
  {
    id: 6,
    name: 'Moon',
    terrain: {
      baseY: 450,
      amplitude: 140,
      frequency: 0.012,
      groundColor: 0x696969,      // Dim gray
      groundTopColor: 0xA9A9A9,   // Dark gray
      skyColor: '#000000',        // Black space
      obstacleColor: 0x2F4F4F     // Dark slate gray
    },
    environment: {
      backgroundColor: '#000000',
      hasStars: true,
      hasClouds: false
    }
  }
]

export function getLevelConfig(levelId: number): LevelConfig {
  return LEVELS.find(l => l.id === levelId) || LEVELS[0]
}
