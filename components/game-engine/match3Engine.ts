export interface Tile {
  id: string
  type: number
  x: number
  y: number
  isMatched: boolean
  isFalling: boolean
}

export interface GameState {
  grid: Tile[][]
  score: number
  moves: number
  targetScore: number
  timeLeft: number
  level: number
  isPlaying: boolean
  selectedTile: { x: number; y: number } | null
  boosters: {
    hammer: number
    shuffle: number
    colorBomb: number
  }
}

export const GRID_SIZE = 8
export const TILE_TYPES = 8
export const TIME_TILE_TYPE = 7
export const MAX_LEVEL = 150

// Level configuration with progressive difficulty curve
// Levels 1-10: Easy (tutorial phase)
// Levels 11-50: Gradual increase
// Levels 51-100: Moderate to hard
// Levels 101-150: Very hard to nearly impossible
export const getLevelConfig = (level: number) => {
  const clampedLevel = Math.min(level, MAX_LEVEL)

  // Calculate difficulty multiplier (0 = easiest, 1 = hardest)
  let difficultyFactor: number
  if (clampedLevel <= 10) {
    // Levels 1-10: Very easy progression (0 to 0.1)
    difficultyFactor = (clampedLevel - 1) / 100
  } else if (clampedLevel <= 50) {
    // Levels 11-50: Gradual increase (0.1 to 0.4)
    difficultyFactor = 0.1 + ((clampedLevel - 10) / 40) * 0.3
  } else if (clampedLevel <= 100) {
    // Levels 51-100: Moderate to hard (0.4 to 0.7)
    difficultyFactor = 0.4 + ((clampedLevel - 50) / 50) * 0.3
  } else {
    // Levels 101-150: Very hard to nearly impossible (0.7 to 1.0)
    difficultyFactor = 0.7 + ((clampedLevel - 100) / 50) * 0.3
  }

  // Target Score: Easier progression
  const baseScore = 900
  const scoreMultiplier = clampedLevel <= 10
    ? 1 + (clampedLevel - 1) * 0.15  // Slower increase for levels 1-10
    : 1 + (clampedLevel - 1) * 0.3  // Easier scaling after level 10
  const targetScore = Math.floor(baseScore * scoreMultiplier)

  // Moves: More generous and slower reduction
  const baseMoves = clampedLevel <= 10
    ? 45  // More generous for levels 1-10
    : 40  // Higher base for others
  const moveReduction = clampedLevel <= 10
    ? clampedLevel * 0.3  // Very small reduction for levels 1-10
    : 3 + (clampedLevel - 10) * 0.2  // Slower reduction after level 10
  const moves = Math.max(20, Math.floor(baseMoves - moveReduction))

  // Time Limit: Fixed at 100 seconds for all levels
  const timeLimit = 100

  // Tile Types: Keep fewer base types per level, time tile added separately
  const tileTypes = Math.min(7, 4 + Math.floor((clampedLevel - 1) / 10))  // 4 -> 7 over time

  return {
    targetScore,
    moves,
    timeLimit,
    tileTypes,
    difficultyFactor, // For reference/display
  }
}

// Generate a random tile type
const getTilePool = (baseTypes = TILE_TYPES): number[] => {
  const clamped = Math.max(1, Math.min(baseTypes, TILE_TYPES - 1))
  const pool = Array.from({ length: clamped }, (_, i) => i)
  if (!pool.includes(TIME_TILE_TYPE)) pool.push(TIME_TILE_TYPE)
  return pool
}

// Generate a random tile type (always includes time tile)
export const getRandomTileType = (baseTypes = TILE_TYPES): number => {
  const pool = getTilePool(baseTypes)
  return pool[Math.floor(Math.random() * pool.length)]
}

// Create a unique tile ID
export const createTileId = (x: number, y: number): string => {
  return `tile-${x}-${y}-${Date.now()}-${Math.random()}`
}

// Initialize game grid
export const initializeGrid = (tileTypes = TILE_TYPES): Tile[][] => {
  const grid: Tile[][] = []
  
  for (let y = 0; y < GRID_SIZE; y++) {
    grid[y] = []
    for (let x = 0; x < GRID_SIZE; x++) {
      grid[y][x] = {
        id: createTileId(x, y),
        type: getRandomTileType(tileTypes),
        x,
        y,
        isMatched: false,
        isFalling: false,
      }
    }
  }

  // Ensure no initial matches
  let hasMatches = true
  let iterations = 0
  while (hasMatches && iterations < 100) {
    hasMatches = false
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const matches = findMatches(grid, x, y)
        if (matches.length >= 3) {
          grid[y][x].type = getRandomTileType(tileTypes)
          hasMatches = true
        }
      }
    }
    iterations++
  }

  // Ensure time tiles appear every level (at least 3 tiles) without creating matches
  const timeTiles: Tile[] = []
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (grid[y][x].type === TIME_TILE_TYPE) timeTiles.push(grid[y][x])
    }
  }
  if (timeTiles.length < 3) {
    const needed = 3 - timeTiles.length
    let placed = 0
    let attempts = 0
    const maxAttempts = 200

    const wouldCreateMatch = (x: number, y: number) => {
      const left1 = x > 0 ? grid[y][x - 1].type === TIME_TILE_TYPE : false
      const left2 = x > 1 ? grid[y][x - 2].type === TIME_TILE_TYPE : false
      const right1 = x < GRID_SIZE - 1 ? grid[y][x + 1].type === TIME_TILE_TYPE : false
      const right2 = x < GRID_SIZE - 2 ? grid[y][x + 2].type === TIME_TILE_TYPE : false
      const up1 = y > 0 ? grid[y - 1][x].type === TIME_TILE_TYPE : false
      const up2 = y > 1 ? grid[y - 2][x].type === TIME_TILE_TYPE : false
      const down1 = y < GRID_SIZE - 1 ? grid[y + 1][x].type === TIME_TILE_TYPE : false
      const down2 = y < GRID_SIZE - 2 ? grid[y + 2][x].type === TIME_TILE_TYPE : false

      if (left1 && left2) return true
      if (right1 && right2) return true
      if (left1 && right1) return true
      if (up1 && up2) return true
      if (down1 && down2) return true
      if (up1 && down1) return true
      return false
    }

    while (placed < needed && attempts < maxAttempts) {
      const x = Math.floor(Math.random() * GRID_SIZE)
      const y = Math.floor(Math.random() * GRID_SIZE)
      if (grid[y][x].type !== TIME_TILE_TYPE && !wouldCreateMatch(x, y)) {
        grid[y][x].type = TIME_TILE_TYPE
        placed++
      }
      attempts++
    }
  }

  return grid
}

// Shuffle the grid when no moves available
export const shuffleGrid = (grid: Tile[][], tileTypes = TILE_TYPES): Tile[][] => {
  const flatTiles = grid.flat()
  const types = flatTiles.map(tile => tile.type)
  
  // Fisher-Yates shuffle
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]]
  }
  
  // Assign shuffled types back to grid
  const newGrid = grid.map(row => [...row])
  let index = 0
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      newGrid[y][x] = {
        ...newGrid[y][x],
        type: types[index],
        isMatched: false,
        isFalling: false,
      }
      index++
    }
  }
  
  // Ensure no matches after shuffle
  let hasMatches = true
  let iterations = 0
  while (hasMatches && iterations < 50) {
    hasMatches = false
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const matches = findMatches(newGrid, x, y)
        if (matches.length >= 3) {
          const availableTypes = getTilePool(tileTypes).filter(t => t !== newGrid[y][x].type)
          newGrid[y][x].type = availableTypes[Math.floor(Math.random() * availableTypes.length)]
          hasMatches = true
        }
      }
    }
    iterations++
  }
  
  return newGrid
}

// Find matches for a specific tile (improved to prevent missed matches)
export const findMatches = (grid: Tile[][], x: number, y: number): Tile[] => {
  const tile = grid[y][x]
  if (!tile || tile.isMatched) return []

  const matches: Tile[] = []

  // Check horizontal matches
  const horizontalMatches: Tile[] = [tile]

  // Check left
  for (let i = x - 1; i >= 0; i--) {
    const leftTile = grid[y][i]
    if (leftTile && leftTile.type === tile.type && !leftTile.isMatched) {
      horizontalMatches.unshift(leftTile)
    } else {
      break
    }
  }

  // Check right
  for (let i = x + 1; i < GRID_SIZE; i++) {
    const rightTile = grid[y][i]
    if (rightTile && rightTile.type === tile.type && !rightTile.isMatched) {
      horizontalMatches.push(rightTile)
    } else {
      break
    }
  }

  if (horizontalMatches.length >= 3) {
    matches.push(...horizontalMatches)
  }

  // Check vertical matches
  const verticalMatches: Tile[] = [tile]

  // Check up
  for (let i = y - 1; i >= 0; i--) {
    const upTile = grid[i][x]
    if (upTile && upTile.type === tile.type && !upTile.isMatched) {
      verticalMatches.unshift(upTile)
    } else {
      break
    }
  }

  // Check down
  for (let i = y + 1; i < GRID_SIZE; i++) {
    const downTile = grid[i][x]
    if (downTile && downTile.type === tile.type && !downTile.isMatched) {
      verticalMatches.push(downTile)
    } else {
      break
    }
  }

  if (verticalMatches.length >= 3) {
    matches.push(...verticalMatches)
  }

  // Remove duplicates and ensure all tiles are valid
  return Array.from(new Set(matches)).filter(tile => tile && !tile.isMatched)
}

// Find all matches in the grid
export const findAllMatches = (grid: Tile[][]): Tile[] => {
  const allMatches = new Set<Tile>()

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const matches = findMatches(grid, x, y)
      matches.forEach(match => allMatches.add(match))
    }
  }

  return Array.from(allMatches)
}

// Check if two tiles can be swapped
export const canSwap = (x1: number, y1: number, x2: number, y2: number): boolean => {
  // Check if tiles are adjacent
  const dx = Math.abs(x1 - x2)
  const dy = Math.abs(y1 - y2)
  
  return (dx === 1 && dy === 0) || (dx === 0 && dy === 1)
}

// Swap two tiles
export const swapTiles = (grid: Tile[][], x1: number, y1: number, x2: number, y2: number): Tile[][] => {
  const newGrid = grid.map(row => [...row])
  
  const temp = newGrid[y1][x1]
  newGrid[y1][x1] = newGrid[y2][x2]
  newGrid[y2][x2] = temp

  // Update positions
  newGrid[y1][x1].x = x1
  newGrid[y1][x1].y = y1
  newGrid[y2][x2].x = x2
  newGrid[y2][x2].y = y2

  return newGrid
}

// Remove matched tiles and apply gravity with improved logic
export const applyGravity = (grid: Tile[][], tileTypes = TILE_TYPES): Tile[][] => {
  const newGrid = grid.map(row => [...row])

  for (let x = 0; x < GRID_SIZE; x++) {
    let emptySpaces = 0

    // Process from bottom to top
    for (let y = GRID_SIZE - 1; y >= 0; y--) {
      if (newGrid[y][x].isMatched) {
        emptySpaces++
        // Mark as placeholder
        newGrid[y][x] = {
          id: `empty-${x}-${y}`,
          type: -1,
          x,
          y,
          isMatched: false,
          isFalling: false,
        }
      } else if (emptySpaces > 0) {
        // Move tile down
        const newY = y + emptySpaces
        newGrid[newY][x] = {
          ...newGrid[y][x],
          y: newY,
          isFalling: true, // Mark as falling for animation
        }
        // Replace current position with placeholder
        newGrid[y][x] = {
          id: `empty-${x}-${y}`,
          type: -1,
          x,
          y,
          isMatched: false,
          isFalling: false,
        }
      }
    }

    // Fill top with new tiles
    for (let y = 0; y < emptySpaces; y++) {
      newGrid[y][x] = {
        id: createTileId(x, y),
        type: getRandomTileType(tileTypes),
        x,
        y,
        isMatched: false,
        isFalling: true, // New tiles start falling
      }
    }
  }

  return newGrid
}

// Calculate score based on matches with better multipliers
export const calculateScore = (matches: Tile[]): number => {
  if (matches.length < 3) return 0

  const baseScore = 10
  const matchLength = matches.length

  // Base score for match length
  let score = baseScore * matchLength

  // Bonus multipliers for longer matches
  if (matchLength === 4) score *= 1.5  // 4-match bonus
  else if (matchLength === 5) score *= 2  // 5-match bonus
  else if (matchLength >= 6) score *= 3  // 6+ match bonus

  // Special bonus for time tiles (type 7)
  if (matches[0].type === 7) {
    score *= 1.2  // Time tiles give 20% more points
  }

  return Math.floor(score)
}

// Check if there are any valid moves
export const hasValidMoves = (grid: Tile[][]): boolean => {
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      // Try swapping with right neighbor
      if (x < GRID_SIZE - 1) {
        const testGrid = swapTiles(grid, x, y, x + 1, y)
        if (findAllMatches(testGrid).length > 0) {
          return true
        }
      }
      
      // Try swapping with bottom neighbor
      if (y < GRID_SIZE - 1) {
        const testGrid = swapTiles(grid, x, y, x, y + 1)
        if (findAllMatches(testGrid).length > 0) {
          return true
        }
      }
    }
  }
  return false
}
