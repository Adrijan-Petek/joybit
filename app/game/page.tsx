'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useBalance } from 'wagmi'
import { formatEther } from 'viem'
import { useAudio } from '@/components/audio/AudioContext'
import { WalletButton } from '@/components/WalletButton'
import { AudioButtons } from '@/components/AudioButtons'
import { getStorageItem, setStorageItem } from '@/lib/utils/storage'
import { useMatch3Game, useMatch3GameData, useMatch3LevelReward } from '@/lib/hooks/useMatch3Game'
import { useMatch3Stats } from '@/lib/hooks/useMatch3Stats'
import { calculateLeaderboardPoints } from '@/lib/utils/scoring'
import { detectInvalidScore, detectSpeedHack } from '@/lib/utils/cheatingDetection'
import {
  initializeGrid,
  findAllMatches,
  canSwap,
  swapTiles,
  applyGravity,
  calculateScore,
  hasValidMoves,
  shuffleGrid,
  getLevelConfig,
  type GameState,
  type Tile,
  GRID_SIZE,
} from '@/components/game-engine/match3Engine'

const TILE_IMAGE_MAP = [1, 2, 3, 4, 5, 6, 7, 18] as const
const getTileImage = (type: number) => {
  const index = Math.max(0, Math.min(type, TILE_IMAGE_MAP.length - 1))
  return `/tiles/${TILE_IMAGE_MAP[index]}.png`
}

export default function Match3Game() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { data: nativeBalance } = useBalance({
    address,
    query: {
      enabled: !!address,
    },
  })
  const { playSound, playMusic } = useAudio()
  const processingRef = useRef(false)
  const [mounted, setMounted] = useState(false)
  
  // Hook for contract interaction
  const { 
    startGame: startGameContract, 
    completeLevel,
    isStarting, 
    buyHammer,
    buyShuffle,
    buyColorBomb,
    buyHammerPack,
    buyShufflePack,
    buyColorBombPack
  } = useMatch3Game()
  const { playerData, canPlayFree, playFee, boosterPrices, refetch } = useMatch3GameData(address)
  const { stats: match3Stats, saveStats } = useMatch3Stats(address)
  
  const [gameState, setGameState] = useState<GameState>(() => {
    const config = getLevelConfig(1)
    return {
      grid: initializeGrid(config.tileTypes),
      score: 0,
      moves: config.moves,
      targetScore: config.targetScore,
      timeLeft: config.timeLimit,
      level: 1,
      isPlaying: false,
      selectedTile: null,
      boosters: {
        hammer: 0,
        shuffle: 0,
        colorBomb: 0,
      },
    }
  })

  // Get level reward for current level
  const levelReward = useMatch3LevelReward(gameState.level)

  const [animating, setAnimating] = useState(false)
  const [showShuffleMessage, setShowShuffleMessage] = useState(false)
  const [showBoosterShop, setShowBoosterShop] = useState(false)
  const [showStartPopup, setShowStartPopup] = useState(true)
  const [showResultPopup, setShowResultPopup] = useState(false)
  const [gameResult, setGameResult] = useState<'win' | 'lose' | null>(null)
  const [sessionId, setSessionId] = useState<bigint | null>(null)
  const [buyingBooster, setBuyingBooster] = useState<string | null>(null)
  const [activeBooster, setActiveBooster] = useState<'hammer' | 'colorBomb' | null>(null)
  const [userData, setUserData] = useState<{ username?: string; pfpUrl?: string }>({})
  const [allLevelRewards, setAllLevelRewards] = useState<Array<{level: number, amount: string}>>([])

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
    playMusic('main-menu')
    
    // Initialize Farcaster SDK
    const initSDK = async () => {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk')
        await sdk.actions.ready()
        
        // Get user data
        const context = await sdk.context
        setUserData({
          username: context?.user?.username,
          pfpUrl: context?.user?.pfpUrl
        })
      } catch (error) {
        console.log('Not in Farcaster Mini App context')
      }
    }
    
    initSDK()
  }, [playMusic])

  // Get last played level from contract
  const lastPlayedLevel = playerData && Array.isArray(playerData) ? Number(playerData[2]) || 1 : 1

  // Load boosters from storage on mount
  useEffect(() => {
    if (!address) return

    const key = `boosters_${address}`
    const loadBoosters = async () => {
      try {
        const saved = await getStorageItem(key)
        if (saved) {
          const boosters = JSON.parse(saved)
          setGameState(prev => ({
            ...prev,
            boosters: boosters,
          }))
        }
      } catch (error) {
        console.warn('Failed to load boosters:', error)
      }
    }

    loadBoosters()
  }, [address])

  const ensureCanPay = useCallback((value: bigint, actionLabel: string) => {
    if (value <= 0n) return true

    if (!nativeBalance) {
      alert('Unable to verify wallet balance yet. Please try again in a moment.')
      return false
    }

    if (nativeBalance.value < value) {
      alert(
        `Insufficient funds for ${actionLabel}. Need ${formatEther(value)} ETH, but wallet has ${formatEther(nativeBalance.value)} ETH.`
      )
      return false
    }

    return true
  }, [nativeBalance])

  // Start game
  const startGame = useCallback(async (level: number, isPaid: boolean = false) => {
    if (!isConnected || !address) return
    
    try {
      const config = getLevelConfig(level)
      
      // If continuing from last level, user must pay
      // If starting from level 1, can use free play if available
      const shouldPay = isPaid || (level > 1)
      if (shouldPay && playFee === undefined) {
        console.log('Paid game fee is still loading, skipping paid start request.')
        return
      }

      const value = shouldPay ? (playFee as bigint) : (canPlayFree ? 0n : (playFee ?? 0n))

      if (!ensureCanPay(value, shouldPay ? 'starting the game' : 'playing this round')) {
        return
      }
      
      await startGameContract(level, value)
      const newSessionId = BigInt(Date.now())
      setSessionId(newSessionId)
      
      setGameState({
        grid: initializeGrid(config.tileTypes),
        score: 0,
        moves: config.moves,
        targetScore: config.targetScore,
        timeLeft: config.timeLimit,
        level: level,
        isPlaying: true,
        selectedTile: null,
        boosters: gameState.boosters,
      })
      setShowStartPopup(false)
      playSound?.('start')
      refetch()
    } catch (error) {
      console.error('Failed to start game:', error)
    }
  }, [playSound, gameState.boosters, canPlayFree, playFee, startGameContract, isConnected, address, refetch, ensureCanPay])

  // Submit game result
  const endGame = useCallback(async (won: boolean) => {
    if (!sessionId || !address) return

    // Cheating detection
    const levelConfig = getLevelConfig(gameState.level)
    const expectedMaxScore = levelConfig.targetScore * 3 // Allow reasonable margin for combos

    // Check for invalid score (too high for level)
    detectInvalidScore(address, gameState.score, expectedMaxScore)

    // Check for speed hack (completed too fast)
    if (levelConfig.timeLimit > 0) {
      const expectedMinTime = Math.max(30, levelConfig.timeLimit - gameState.timeLeft) // At least 30 seconds or time spent
      detectSpeedHack(address, expectedMinTime, levelConfig.timeLimit)
    }

    setGameState(prev => ({ ...prev, isPlaying: false }))
    setGameResult(won ? 'win' : 'lose')
    setShowResultPopup(true)
    
    // Increment games played count in database
    const currentGamesPlayed = match3Stats.gamesPlayed || 0
    const newGamesPlayed = currentGamesPlayed + 1
    
    // Save stats to database
    try {
      await saveStats(gameState.score, gameState.level, newGamesPlayed)
      console.log('✅ Game stats saved to database:', { score: gameState.score, level: gameState.level, gamesPlayed: newGamesPlayed })
    } catch (error) {
      console.error('❌ Failed to save game stats:', error)
    }
    
    // Update global leaderboard (scores calculated automatically from stats)
    console.log(`✅ Leaderboard updated for ${won ? 'win' : 'game'}`)
    
    // Play game over sound
    if (!won) {
      playSound?.('game-over')
    }
  }, [sessionId, address, gameState.score, gameState.level, playSound, saveStats, match3Stats.gamesPlayed])

  // Process matches and cascading with improved timing
  const processMatches = useCallback(async (grid: Tile[][]) => {
    if (processingRef.current) return grid
    processingRef.current = true
    setAnimating(true)

    let currentGrid = grid.map(row => [...row])
    let hasMatches = true
    let cascadeCount = 0
    const maxCascades = 10 // Prevent infinite cascades
    const { tileTypes } = getLevelConfig(gameState.level)

    while (hasMatches && cascadeCount < maxCascades) {
      const matches = findAllMatches(currentGrid)

      if (matches.length === 0) {
        hasMatches = false
        break
      }

      // Mark all matched tiles
      matches.forEach(tile => {
        currentGrid[tile.y][tile.x].isMatched = true
      })

      const matchScore = calculateScore(matches) * (cascadeCount + 1)

      // Check if level would be completed
      const currentScore = gameState.score + matchScore
      const wouldCompleteLevel = currentScore >= gameState.targetScore

      // Add bonus time for time tiles
      let timeBonus = 0
      const isTimeTileMatch = matches.length > 0 && matches[0].type === 7

      if (isTimeTileMatch) {
        if (matches.length === 3) timeBonus = 15
        else if (matches.length === 4) timeBonus = 20
        else if (matches.length === 5) timeBonus = 25
        else if (matches.length >= 6) timeBonus = 30
      }

      // Play sound and update score immediately
      playSound?.('pop')

      setGameState(prev => ({
        ...prev,
        grid: currentGrid.map(row => [...row]),
        score: prev.score + matchScore,
        timeLeft: prev.timeLeft + timeBonus,
      }))

      // Delay for match highlight flash
      await new Promise(resolve => setTimeout(resolve, 120))

      // Apply gravity with falling animation
      currentGrid = applyGravity(currentGrid, tileTypes)

      setGameState(prev => ({
        ...prev,
        grid: currentGrid.map(row => [...row]),
      }))

      // Delay for falling animation
      await new Promise(resolve => setTimeout(resolve, 160))

      // Reset tile states for next cascade
      currentGrid = currentGrid.map(row =>
        row.map(tile => ({ ...tile, isFalling: false, isMatched: false }))
      )

      cascadeCount++

      // Stop if level completed
      if (wouldCompleteLevel) {
        hasMatches = false
        break
      }
    }

    // Ensure no matches remain after processing
    const remainingMatches = findAllMatches(currentGrid)
    if (remainingMatches.length > 0) {
      console.warn('Remaining matches after processing:', remainingMatches.length)
      // Force remove any remaining matches
      remainingMatches.forEach(tile => {
        currentGrid[tile.y][tile.x].isMatched = true
      })
      currentGrid = applyGravity(currentGrid, tileTypes)
    }

    setAnimating(false)
    processingRef.current = false
    return currentGrid
  }, [playSound, gameState.score, gameState.targetScore, gameState.level])

  // Auto-shuffle when no valid moves
  const checkAndShuffle = useCallback(async (grid: Tile[][]) => {
    if (!hasValidMoves(grid)) {
      setShowShuffleMessage(true)
      playSound?.('shuffle')
      await new Promise(resolve => setTimeout(resolve, 1000))
      const { tileTypes } = getLevelConfig(gameState.level)
      const shuffled = shuffleGrid(grid, tileTypes)
      setShowShuffleMessage(false)
      return shuffled
    }
    return grid
  }, [playSound, gameState.level])

  // Use booster - activates booster mode
  const handleBooster = useCallback(async (type: 'hammer' | 'shuffle' | 'colorBomb') => {
    if (!gameState.isPlaying || gameState.boosters[type] <= 0 || !address) return

    if (type === 'shuffle') {
      // Shuffle works immediately
      const newBoosters = {
        ...gameState.boosters,
        shuffle: gameState.boosters.shuffle - 1,
      }
      
      setGameState(prev => ({
        ...prev,
        boosters: newBoosters,
      }))
      
      // Save to storage
      const key = `boosters_${address}`
      setStorageItem(key, JSON.stringify(newBoosters)).catch(error => {
        console.warn('Failed to save boosters:', error)
      })
      
      playSound?.('shuffle')
      const { tileTypes } = getLevelConfig(gameState.level)
      const shuffled = shuffleGrid(gameState.grid, tileTypes)
      setGameState(prev => ({ ...prev, grid: shuffled }))
    } else {
      // Hammer and colorBomb require tile selection - activate mode
      setActiveBooster(type)
    }
  }, [gameState.isPlaying, gameState.boosters, gameState.grid, playSound, address])

  // Apply booster to clicked tile
  const applyBoosterToTile = useCallback(async (x: number, y: number) => {
    if (!activeBooster || !address) return

    // Decrement booster count
    const newBoosters = {
      ...gameState.boosters,
      [activeBooster]: gameState.boosters[activeBooster] - 1,
    }
    
    setGameState(prev => ({
      ...prev,
      boosters: newBoosters,
    }))
    
    // Save to storage
    const key = `boosters_${address}`
    setStorageItem(key, JSON.stringify(newBoosters)).catch(error => {
      console.warn('Failed to save boosters:', error)
    })

    if (activeBooster === 'hammer') {
      let newGrid = gameState.grid.map(row => [...row])
      newGrid[y][x].isMatched = true
      setGameState(prev => ({ ...prev, grid: newGrid }))
      playSound?.('match')
      setActiveBooster(null)
      
      // Apply gravity after short delay
      await new Promise(resolve => setTimeout(resolve, 250))
      const { tileTypes } = getLevelConfig(gameState.level)
      newGrid = applyGravity(newGrid, tileTypes)
      setGameState(prev => ({ ...prev, grid: newGrid }))
      
      // Process any new matches
      await new Promise(resolve => setTimeout(resolve, 200))
      newGrid = await processMatches(newGrid)
      setGameState(prev => ({ ...prev, grid: newGrid }))
    } else if (activeBooster === 'colorBomb') {
      const targetType = gameState.grid[y][x].type
      let newGrid = gameState.grid.map(row => [...row])
      newGrid.forEach((row, rowY) => {
        row.forEach((tile, colX) => {
          if (tile.type === targetType) {
            newGrid[rowY][colX].isMatched = true
          }
        })
      })
      setGameState(prev => ({ ...prev, grid: newGrid }))
      playSound?.('match')
      setActiveBooster(null)
      
      // Apply gravity after short delay
      await new Promise(resolve => setTimeout(resolve, 300))
      const { tileTypes } = getLevelConfig(gameState.level)
      newGrid = applyGravity(newGrid, tileTypes)
      setGameState(prev => ({ ...prev, grid: newGrid }))
      
      // Process any new matches
      await new Promise(resolve => setTimeout(resolve, 400))
      newGrid = await processMatches(newGrid)
      setGameState(prev => ({ ...prev, grid: newGrid }))
    }
  }, [activeBooster, gameState.grid, gameState.boosters, playSound, processMatches, address])

  // Handle tile click
  const handleTileClick = useCallback(async (x: number, y: number) => {
    if (!gameState.isPlaying || animating || processingRef.current) return

    // If a booster is active, apply it to this tile
    if (activeBooster) {
      await applyBoosterToTile(x, y)
      return
    }

    const { selectedTile, grid } = gameState

    if (!selectedTile) {
      setGameState(prev => ({
        ...prev,
        selectedTile: { x, y },
      }))
      playSound?.('click')
    } else {
      if (selectedTile.x === x && selectedTile.y === y) {
        setGameState(prev => ({ ...prev, selectedTile: null }))
        return
      }

      if (canSwap(selectedTile.x, selectedTile.y, x, y)) {
        playSound?.('swap')
        
        let newGrid = swapTiles(grid, selectedTile.x, selectedTile.y, x, y)
        
        const matches = findAllMatches(newGrid)
        
        if (matches.length > 0) {
          setGameState(prev => ({
            ...prev,
            grid: newGrid,
            selectedTile: null,
            moves: Math.max(0, prev.moves - 1), // Prevent moves from going below 0
          }))

          newGrid = await processMatches(newGrid)
          newGrid = await checkAndShuffle(newGrid)
          
          setGameState(prev => ({ ...prev, grid: newGrid }))
        } else {
          newGrid = swapTiles(newGrid, selectedTile.x, selectedTile.y, x, y)
          setGameState(prev => ({
            ...prev,
            grid: newGrid,
            selectedTile: null,
          }))
        }
      }
    }
  }, [gameState, animating, playSound, processMatches, checkAndShuffle, activeBooster, applyBoosterToTile])

  // Timer countdown
  useEffect(() => {
    // Pause timer when booster shop is open
    if (!gameState.isPlaying || gameState.timeLeft <= 0 || showBoosterShop) return

    const timer = setInterval(() => {
      setGameState(prev => ({
        ...prev,
        timeLeft: Math.max(0, prev.timeLeft - 1),
      }))
    }, 1000)

    return () => clearInterval(timer)
  }, [gameState.isPlaying, gameState.timeLeft, showBoosterShop])

  // Check win/lose conditions
  useEffect(() => {
    if (!gameState.isPlaying) return

    // Win condition: reach target score (time and moves become irrelevant)
    if (gameState.score >= gameState.targetScore) {
      playSound?.('win')
      endGame(true)
    }
    // Lose condition: when out of moves OR time runs out, AND haven't reached target score
    else if (gameState.moves <= 0 || gameState.timeLeft <= 0) {
      playSound?.('lose')
      endGame(false)
    }
  }, [gameState.score, gameState.moves, gameState.timeLeft, gameState.targetScore, gameState.isPlaying, playSound, endGame])

  const handlePlayAgain = () => {
    setShowResultPopup(false)
    setGameResult(null)
    setShowStartPopup(true)
  }

  const handleShareResult = useCallback((channel?: 'base') => {
    if (typeof window === 'undefined') return
    const outcome = gameResult === 'win' ? 'won' : 'hit Game Over'
    const shareText = `🎮 I ${outcome} in Joybit Match-3!\n` +
      `🏆 Score: ${gameState.score}\n` +
      `🎯 Level: ${gameState.level}\n\n` +
      `Come play Joybit! #Joybit`
    const shareUrl = `${window.location.origin}/game`
    const url = new URL('https://warpcast.com/~/compose')
    url.searchParams.set('text', shareText)
    url.searchParams.append('embeds[]', shareUrl)
    if (channel) url.searchParams.set('channel', channel)
    window.open(url.toString(), '_blank', 'noopener,noreferrer')
  }, [gameResult, gameState.level, gameState.score])

  const handleContinueLevel = useCallback(async () => {
    if (!isConnected || !address) return
    
    try {
      // Continue current level - always payable (no free continues)
      if (playFee === undefined) {
        console.log('Game fee is still loading, skipping continue request.')
        return
      }

      const value = playFee

      if (!ensureCanPay(value, 'continuing this level')) {
        return
      }

      await startGameContract(gameState.level, value)
      const newSessionId = BigInt(Date.now())
      setSessionId(newSessionId)
      
      const config = getLevelConfig(gameState.level)
      setGameState(prev => ({
        ...prev,
        grid: initializeGrid(config.tileTypes),
        score: 0,
        moves: config.moves,
        targetScore: config.targetScore,
        timeLeft: config.timeLimit,
        isPlaying: true,
        selectedTile: null,
      }))
      setShowResultPopup(false)
      setGameResult(null)
      playSound?.('start')
      refetch()
    } catch (error) {
      console.error('Failed to continue level:', error)
    }
  }, [gameState.level, playFee, startGameContract, isConnected, address, playSound, refetch, ensureCanPay])

  const handleNextLevel = () => {
    const nextLevel = gameState.level + 1
    const config = getLevelConfig(nextLevel)
    
    // Generate new session ID for tracking (no contract call needed)
    const newSessionId = BigInt(Date.now())
    setSessionId(newSessionId)
    
    // Update game state locally - no blockchain interaction
    setGameState({
      grid: initializeGrid(config.tileTypes),
      score: 0,
      moves: config.moves,
      targetScore: config.targetScore,
      timeLeft: config.timeLimit,
      level: nextLevel,
      isPlaying: true,
      selectedTile: null,
      boosters: gameState.boosters,
    })
    
    setShowResultPopup(false)
    setGameResult(null)
    playSound?.('start')
  }

  const handleBuyBooster = async (type: 'hammer' | 'shuffle' | 'colorBomb', isPack: boolean = false) => {
    if (!boosterPrices || buyingBooster || !address) return
    
    const boosterKey = `${type}${isPack ? '-pack' : ''}`
    setBuyingBooster(boosterKey)
    
    try {
      let hash: `0x${string}` | undefined
      let cost: bigint | undefined
      
      if (type === 'hammer') {
        cost = isPack ? boosterPrices.hammerPack : boosterPrices.hammer
        if (cost === undefined || cost === null) {
          alert('Booster price is still loading. Please try again.')
          return
        }
        if (!ensureCanPay(cost, `buying ${isPack ? 'Hammer Pack' : 'Hammer'}`)) return
        hash = isPack 
          ? await buyHammerPack(cost)
          : await buyHammer(cost)
      } else if (type === 'shuffle') {
        cost = isPack ? boosterPrices.shufflePack : boosterPrices.shuffle
        if (cost === undefined || cost === null) {
          alert('Booster price is still loading. Please try again.')
          return
        }
        if (!ensureCanPay(cost, `buying ${isPack ? 'Shuffle Pack' : 'Shuffle'}`)) return
        hash = isPack
          ? await buyShufflePack(cost)
          : await buyShuffle(cost)
      } else if (type === 'colorBomb') {
        cost = isPack ? boosterPrices.colorBombPack : boosterPrices.colorBomb
        if (cost === undefined || cost === null) {
          alert('Booster price is still loading. Please try again.')
          return
        }
        if (!ensureCanPay(cost, `buying ${isPack ? 'Color Bomb Pack' : 'Color Bomb'}`)) return
        hash = isPack
          ? await buyColorBombPack(cost)
          : await buyColorBomb(cost)
      }
      
      // Wait for transaction confirmation
      if (hash) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Save to storage immediately
        const key = `boosters_${address}`
        const saved = await getStorageItem(key)
        const boosters = saved ? JSON.parse(saved) : { hammer: 0, shuffle: 0, colorBomb: 0 }

        const amount = isPack ? 5 : 1
        boosters[type] = (boosters[type] || 0) + amount
        setStorageItem(key, JSON.stringify(boosters)).catch(error => {
          console.warn('Failed to save boosters:', error)
        })
        
        // Update UI immediately
        setGameState(prev => ({
          ...prev,
          boosters: boosters,
        }))
        
        playSound?.('win')
      }
    } catch (error) {
      console.error('Failed to buy booster:', error)
    } finally {
      setBuyingBooster(null)
    }
  }

  if (!mounted) return null

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: 'var(--theme-background)',
        color: 'var(--theme-text)',
        fontFamily: 'var(--theme-font-family)'
      }}
    >
      <div className="fixed top-2 right-2 z-50 flex items-center gap-2">
        <AudioButtons />
        <WalletButton />
      </div>

      <div className="relative isolate min-h-screen overflow-hidden">

        <div className="container relative z-10 mx-auto max-w-md pt-14 pb-4 px-2">
        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          <button
            onClick={() => router.push('/')}
            className="px-3 py-1.5 rounded-lg transition-all text-xs border hover:opacity-90"
            style={{
              backgroundColor: 'var(--theme-surface)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)'
            }}
          >
            ← Back
          </button>
          <h1 className="text-base font-bold">🎮 Match-3</h1>
          <button
            onClick={() => setShowBoosterShop(!showBoosterShop)}
            className="theme-button-primary px-3 py-1.5 rounded-lg transition-all text-xs hover:opacity-90"
            style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-text)' }}
          >
            🛒 Shop
          </button>
        </div>

        {/* Game Info Panel */}
        <div
          className="backdrop-blur rounded-xl p-2 mb-2 border shadow-lg"
          style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
        >
          {/* Single Row: All Game Stats */}
          <div className="flex items-center justify-between gap-1 text-center">
            <div className="flex flex-col items-center">
              <div className="text-[8px] font-medium" style={{ color: 'var(--theme-text-secondary)' }}>Level</div>
              <div className="text-xs font-bold" style={{ color: 'var(--theme-primary)' }}>{gameState.level}</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-[8px] font-medium" style={{ color: 'var(--theme-text-secondary)' }}>Score</div>
              <div className="text-xs font-bold" style={{ color: 'var(--theme-success)' }}>{gameState.score.toLocaleString()}</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-[8px] font-medium" style={{ color: 'var(--theme-text-secondary)' }}>Moves</div>
              <div className="text-xs font-bold" style={{ color: 'var(--theme-secondary)' }}>{gameState.moves}</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-[8px] font-medium" style={{ color: 'var(--theme-text-secondary)' }}>Time</div>
              <div className="text-xs font-bold" style={{ color: 'var(--theme-warning)' }}>{gameState.timeLeft}s</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-[8px] font-medium" style={{ color: 'var(--theme-text-secondary)' }}>Target</div>
              <div className="text-xs font-bold" style={{ color: 'var(--theme-accent)' }}>{gameState.targetScore.toLocaleString()}</div>
            </div>
          </div>

          {/* Bottom Row: Level Rewards */}
          <div
            className="rounded-lg p-3 border"
            style={{
              borderColor: 'var(--theme-accent)',
              background:
                'linear-gradient(90deg, color-mix(in srgb, var(--theme-accent) 18%, transparent), color-mix(in srgb, var(--theme-warning) 12%, transparent))'
            }}
          >
            <div className="text-center text-[10px] font-bold mb-2" style={{ color: 'var(--theme-accent)' }}>
              🎁 Level Rewards
            </div>
            {/* Progress Bar */}
            {(() => {
              const configuredRewards = allLevelRewards.filter(reward => reward.level >= 1 && reward.level <= 100)
              const maxLevel = configuredRewards.length > 0 ? Math.max(...configuredRewards.map(r => r.level)) : 100
              const progressPercent = maxLevel > 0 ? Math.min((gameState.level / maxLevel) * 100, 100) : 0
              
              return (
                <div
                  className="relative w-full h-2 rounded-full mb-2"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--theme-border) 60%, transparent)' }}
                >
                  <div 
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${progressPercent}%`,
                      background: 'linear-gradient(90deg, var(--theme-accent), var(--theme-primary))'
                    }}
                  ></div>
                  {/* Milestones */}
                  {configuredRewards.map((reward) => {
                    const position = maxLevel > 0 ? (reward.level / maxLevel) * 100 : 0
                    const isUnlocked = gameState.level >= reward.level
                    const isClaimed = gameState.level > reward.level // Assume claimed if past level
                    return (
                      <div
                        key={reward.level}
                        className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 rounded-full border-2 cursor-pointer"
                        style={{ left: `${position}%`, transform: 'translate(-50%, -50%)', borderColor: 'var(--theme-border)' }}
                        title={`Level ${reward.level}\nReward: ${reward.amount} JOYB`}
                      >
                        <div
                          className="w-full h-full rounded-full"
                          style={{
                            backgroundColor: isClaimed
                              ? 'var(--theme-success)'
                              : isUnlocked
                                ? 'var(--theme-accent)'
                                : 'color-mix(in srgb, var(--theme-border) 70%, transparent)',
                            borderColor: isClaimed
                              ? 'var(--theme-success)'
                              : isUnlocked
                                ? 'var(--theme-accent)'
                                : 'var(--theme-border)'
                          }}
                        >
                          {isClaimed && (
                            <span
                              className="absolute inset-0 flex items-center justify-center text-[8px]"
                              style={{ color: 'var(--theme-text)' }}
                            >
                              ✔
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
            {/* Milestone Labels */}
            <div className="relative w-full h-4 mt-1">
              {allLevelRewards.filter(reward => reward.level >= 1 && reward.level <= 100).map((reward) => {
                const configuredRewards = allLevelRewards.filter(r => r.level >= 1 && r.level <= 100)
                const maxLevel = configuredRewards.length > 0 ? Math.max(...configuredRewards.map(r => r.level)) : 100
                const position = maxLevel > 0 ? (reward.level / maxLevel) * 100 : 0
                return (
                  <div
                    key={`label-${reward.level}`}
                    className="absolute top-0 text-[8px] font-medium"
                    style={{
                      color: 'var(--theme-text-secondary)',
                      left: `${position}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    Lv.{reward.level}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Boosters */}
        {gameState.isPlaying && (
          <div className="flex gap-1.5 mb-2">
            <button
              onClick={() => handleBooster('hammer')}
              disabled={gameState.boosters.hammer <= 0}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${activeBooster === 'hammer' ? 'animate-pulse' : ''}`}
              style={{
                backgroundColor: activeBooster === 'hammer'
                  ? 'var(--theme-warning)'
                  : 'color-mix(in srgb, var(--theme-warning) 75%, var(--theme-surface))',
                color: 'var(--theme-text)',
                boxShadow: activeBooster === 'hammer'
                  ? '0 0 0 2px color-mix(in srgb, var(--theme-accent) 70%, transparent)'
                  : undefined
              }}
            >
              🔨 {gameState.boosters.hammer}
            </button>
            <button
              onClick={() => handleBooster('shuffle')}
              disabled={gameState.boosters.shuffle <= 0}
              className="flex-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--theme-secondary)',
                color: 'var(--theme-text)'
              }}
            >
              🔀 {gameState.boosters.shuffle}
            </button>
            <button
              onClick={() => handleBooster('colorBomb')}
              disabled={gameState.boosters.colorBomb <= 0}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${activeBooster === 'colorBomb' ? 'animate-pulse' : ''}`}
              style={{
                backgroundColor: activeBooster === 'colorBomb'
                  ? 'var(--theme-error)'
                  : 'color-mix(in srgb, var(--theme-error) 80%, var(--theme-surface))',
                color: 'var(--theme-text)',
                boxShadow: activeBooster === 'colorBomb'
                  ? '0 0 0 2px color-mix(in srgb, var(--theme-accent) 70%, transparent)'
                  : undefined
              }}
            >
              💣 {gameState.boosters.colorBomb}
            </button>
          </div>
        )}

        {/* Active Booster Indicator */}
        {activeBooster && (
          <div className="mb-2 text-center">
            <div
              className="rounded-lg px-3 py-2 text-xs font-bold animate-pulse border"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--theme-accent) 18%, transparent)',
                borderColor: 'var(--theme-accent)',
                color: 'var(--theme-accent)'
              }}
            >
              {activeBooster === 'hammer' && '🔨 Click any tile to destroy it!'}
              {activeBooster === 'colorBomb' && '💣 Click a tile to destroy all tiles of that color!'}
            </div>
          </div>
        )}

        {/* Game Stats - Old removed, Level Selector removed */}

        {/* Game Grid */}
        <div className="relative">
        <div
          className="backdrop-blur-lg rounded-lg p-1.5 border"
          style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
        >
            <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}>
              {gameState.grid.map((row, y) =>
                row.map((tile, x) => {
                  const isSelected = gameState.selectedTile?.x === x && gameState.selectedTile?.y === y
                  return (
                    <motion.button
                      key={tile.id}
                      onClick={() => handleTileClick(x, y)}
                      className="aspect-square p-0.5 md:p-1 rounded-md relative"
                      style={{
                        backgroundColor: 'transparent',
                        outline: 'none',
                        zIndex: isSelected ? 10 : 'auto',
                      }}
                      initial={tile.isFalling ? { y: -40, opacity: 0 } : false}
                      animate={{
                        scale: tile.isMatched
                          ? 0
                          : isSelected
                            ? 1.22
                            : 1,
                        opacity: tile.isMatched ? 0 : 1,
                        y: 0,
                        filter: tile.isMatched
                          ? 'brightness(2.5) saturate(2)'
                          : isSelected
                            ? 'brightness(1.25) drop-shadow(0 0 6px rgba(255,220,50,0.85))'
                            : 'brightness(1) drop-shadow(0 0 0px transparent)',
                      }}
                      transition={{
                        scale: { type: 'spring', stiffness: 500, damping: 22 },
                        y: { type: 'spring', stiffness: 380, damping: 28 },
                        opacity: { duration: 0.15 },
                        filter: { duration: 0.15 },
                      }}
                      whileHover={!tile.isMatched && !animating ? { scale: isSelected ? 1.22 : 1.1 } : {}}
                      whileTap={!tile.isMatched ? { scale: 0.88 } : {}}
                    >
                      {isSelected && (
                        <motion.span
                          className="absolute inset-0 rounded-md pointer-events-none"
                          style={{
                            boxShadow: '0 0 0 2.5px rgba(255,220,50,0.9), 0 0 10px 2px rgba(255,200,0,0.5)',
                            borderRadius: 6,
                          }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.1 }}
                        />
                      )}
                      <img 
                        src={getTileImage(tile.type)} 
                        alt={`Tile ${tile.type}`}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    </motion.button>
                  )
                })
              )}
            </div>
          </div>

        </div>

        {/* Shuffle Message */}
        <AnimatePresence>
          {showShuffleMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed inset-0 flex items-center justify-center z-50"
              style={{ backgroundColor: 'color-mix(in srgb, var(--theme-background) 70%, transparent)' }}
            >
              <div
                className="px-8 py-4 rounded-xl text-xl font-bold shadow-2xl"
                style={{ backgroundColor: 'var(--theme-secondary)', color: 'var(--theme-text)' }}
              >
                🔀 Shuffling Board...
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Start Popup */}
        <AnimatePresence>
          {showStartPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ backgroundColor: 'color-mix(in srgb, var(--theme-background) 80%, transparent)' }}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              className="rounded-2xl p-4 md:p-6 max-w-sm w-full border-2 shadow-2xl"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-primary)' }}
            >
              <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-center" style={{ color: 'var(--theme-primary)' }}>
                🎮 Match-3 Game
              </h2>
              
              <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                <div className="rounded-lg p-2 md:p-3 text-xs md:text-sm border" style={{ backgroundColor: 'var(--theme-background)', borderColor: 'var(--theme-border)' }}>
                  <div className="flex justify-between mb-1">
                    <span style={{ color: 'var(--theme-text-secondary)' }}>Your Progress:</span>
                    <span style={{ color: 'var(--theme-primary)' }} className="font-bold">Level {lastPlayedLevel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--theme-text-secondary)' }}>Free Play:</span>
                    <span style={{ color: canPlayFree ? 'var(--theme-success)' : 'var(--theme-error)' }}>
                      {canPlayFree ? '✅ Available' : '❌ Not Available'}
                    </span>
                  </div>
                </div>

                {/* Level Rewards Preview */}
                <div
                  className="rounded-lg p-2 md:p-3 border"
                  style={{
                    borderColor: 'var(--theme-accent)',
                    background:
                      'linear-gradient(90deg, color-mix(in srgb, var(--theme-accent) 16%, transparent), color-mix(in srgb, var(--theme-warning) 10%, transparent))'
                  }}
                >
                  <div className="text-center font-bold text-xs md:text-sm mb-2" style={{ color: 'var(--theme-accent)' }}>
                    🎁 Level Rewards
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center text-center">
                    {allLevelRewards.filter(reward => reward.level >= 1 && reward.level <= 100).map((reward) => {
                      return (
                        <div key={reward.level} className="flex flex-col items-center min-w-[40px]">
                          <div
                            className="text-[10px] font-bold"
                            style={{ color: lastPlayedLevel >= reward.level ? 'var(--theme-success)' : 'var(--theme-text-secondary)' }}
                          >
                            Lv.{reward.level}
                          </div>
                          <div
                            className="text-[9px]"
                            style={{ color: lastPlayedLevel >= reward.level ? 'var(--theme-success)' : 'var(--theme-text-secondary)' }}
                          >
                            {reward.amount !== '0' && reward.amount !== '' ? (
                              parseFloat(reward.amount) >= 1000 ? `${(parseFloat(reward.amount) / 1000).toFixed(1)}K` : reward.amount
                            ) : '-'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="text-center text-[9px] mt-1" style={{ color: 'var(--theme-text-secondary)' }}>
                    Complete levels to earn JOYB rewards!
                  </div>
                </div>
              </div>

              {!isConnected ? (
                <div className="space-y-3">
                  <p className="text-center text-sm" style={{ color: 'var(--theme-warning)' }}>⚠️ Please connect wallet to play</p>
                  
                  <div className="flex flex-col gap-2">
                    <WalletButton />
                    
                    <button
                      onClick={() => router.push('/')}
                      className="w-full px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold transition-all text-sm md:text-base border hover:opacity-90"
                      style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                    >
                      ← Back to Home
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 md:space-y-3">
                  {/* Start from Level 1 */}
                  <button
                    onClick={() => startGame(1, false)}
                    disabled={isStarting}
                    className="theme-button-primary w-full px-4 md:px-6 py-3 md:py-4 rounded-xl font-bold transition-all shadow-lg disabled:opacity-50 text-sm md:text-base hover:opacity-90"
                    style={{
                      background: 'linear-gradient(90deg, var(--theme-success), color-mix(in srgb, var(--theme-primary) 70%, var(--theme-success)))',
                      color: 'var(--theme-text)'
                    }}
                  >
                    <div className="text-base md:text-lg mb-1">🆕 Start from Level 1</div>
                    <div className="text-xs opacity-90">
                      {canPlayFree ? 'FREE ✅' : `${formatEther(playFee || 0n)} ETH`}
                    </div>
                  </button>

                  {/* Continue from Last Level */}
                  {lastPlayedLevel > 1 && (
                    <button
                      onClick={() => startGame(lastPlayedLevel, true)}
                      disabled={isStarting || playFee === undefined}
                      className="theme-button-secondary w-full px-4 md:px-6 py-3 md:py-4 rounded-xl font-bold transition-all shadow-lg disabled:opacity-50 text-sm md:text-base hover:opacity-90"
                      style={{
                        background: 'linear-gradient(90deg, var(--theme-primary), var(--theme-secondary))',
                        color: 'var(--theme-text)'
                      }}
                    >
                      <div className="text-base md:text-lg mb-1">▶️ Continue from Level {lastPlayedLevel}</div>
                      <div className="text-xs opacity-90">
                        {formatEther(playFee || 0n)} ETH (Required)
                      </div>
                    </button>
                  )}

                  <button
                    onClick={() => router.push('/')}
                    className="w-full px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold transition-all text-sm md:text-base border hover:opacity-90"
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                  >
                    ← Back to Home
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>

        {/* Result Popup */}
        <AnimatePresence>
          {showResultPopup && gameResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ backgroundColor: 'color-mix(in srgb, var(--theme-background) 80%, transparent)' }}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              className="rounded-2xl p-4 md:p-6 max-w-sm w-full border shadow-2xl"
              style={{
                borderColor: 'var(--theme-border)',
                backgroundColor: 'var(--theme-surface)'
              }}
            >
              <div className="text-center">
                <div className="text-5xl md:text-6xl mb-3 md:mb-4">
                  {gameResult === 'win' ? '🎉' : '😢'}
                </div>
                <h2
                  className="text-2xl md:text-3xl font-bold mb-2"
                  style={{ color: gameResult === 'win' ? 'var(--theme-success)' : 'var(--theme-error)' }}
                >
                  {gameResult === 'win' ? 'You Won!' : 'Game Over'}
                </h2>
                <div
                  className="rounded-lg p-3 md:p-4 mb-3 md:mb-4"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--theme-background) 70%, transparent)' }}
                >
                  <div className="text-xs md:text-sm opacity-90 mb-1">Final Score</div>
                  <div className="text-3xl md:text-4xl font-bold">{gameState.score}</div>
                  <div className="text-xs md:text-sm opacity-75 mt-1">Target: {gameState.targetScore}</div>
                </div>
                {gameResult === 'win' && levelReward && levelReward > 0n && (
                  <p className="mb-3 md:mb-4 text-base md:text-lg">
                    🎁 You earned <span className="font-bold">{formatEther(levelReward)} JOYB</span>!<br/>
                    <span className="text-xs md:text-sm">Claim in Profile</span>
                  </p>
                )}
                <div className="space-y-2">
                  {gameResult === 'win' && (
                    <button
                      onClick={handleNextLevel}
                      className="theme-button-primary w-full px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold transition-all shadow-lg text-sm md:text-base hover:opacity-90"
                      style={{
                        background: 'linear-gradient(90deg, var(--theme-success), color-mix(in srgb, var(--theme-primary) 70%, var(--theme-success)))',
                        color: 'var(--theme-text)'
                      }}
                    >
                      ▶️ Next Level ({gameState.level + 1})
                    </button>
                  )}
                  {gameResult === 'lose' && (
                    <button
                      onClick={handleContinueLevel}
                      disabled={playFee === undefined}
                      className="theme-button-secondary w-full px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold transition-all shadow-lg text-sm md:text-base hover:opacity-90"
                      style={{
                        background: 'linear-gradient(90deg, var(--theme-secondary), color-mix(in srgb, var(--theme-primary) 70%, var(--theme-secondary)))',
                        color: 'var(--theme-text)'
                      }}
                    >
                      🔄 Continue Level ({formatEther(playFee || 0n)} ETH)
                    </button>
                  )}
                  {gameResult === 'lose' && (
                    <button
                      onClick={handlePlayAgain}
                      className="w-full px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold transition-all text-sm md:text-base border hover:opacity-90"
                      style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                    >
                      🎮 Play Again
                    </button>
                  )}
                  <button
                    onClick={() => router.push('/profile')}
                    className="theme-button-primary w-full px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold transition-all text-sm md:text-base hover:opacity-90"
                    style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-text)' }}
                  >
                    👤 Go to Profile
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleShareResult()}
                      className="px-4 py-2 rounded-xl font-bold transition-all text-xs md:text-sm border hover:opacity-90"
                      style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                    >
                      🔁 Recast
                    </button>
                    <button
                      onClick={() => handleShareResult('base')}
                      className="px-4 py-2 rounded-xl font-bold transition-all text-xs md:text-sm border hover:opacity-90"
                      style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                    >
                      🔁 Recast Channel
                    </button>
                  </div>
                  <button
                    onClick={() => router.push('/')}
                    className="w-full px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold transition-all text-sm md:text-base border hover:opacity-90"
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                  >
                    ← Back to Home
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>

        {/* Booster Shop Modal */}
        <AnimatePresence>
          {showBoosterShop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ backgroundColor: 'color-mix(in srgb, var(--theme-background) 75%, transparent)' }}
            onClick={() => setShowBoosterShop(false)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="rounded-lg p-4 max-w-md w-full border"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-primary)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--theme-primary)' }}>🛒 Booster Shop</h2>
              <div className="space-y-2">
                <div className="rounded-lg p-3 border" style={{ backgroundColor: 'var(--theme-background)', borderColor: 'var(--theme-border)' }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold">🔨 Hammer</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs mb-1" style={{ color: 'var(--theme-warning)' }}>{formatEther(boosterPrices?.hammer || 0n)} ETH</div>
                      <button 
                        onClick={() => handleBuyBooster('hammer', false)}
                        disabled={!!buyingBooster}
                        className="w-full py-2 rounded text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                        style={{ backgroundColor: 'var(--theme-warning)', color: 'var(--theme-text)' }}
                      >
                        {buyingBooster === 'hammer' ? 'Buying...' : 'Buy 1x'}
                      </button>
                    </div>
                    <div>
                      <div className="text-xs mb-1" style={{ color: 'var(--theme-warning)' }}>{formatEther(boosterPrices?.hammerPack || 0n)} ETH</div>
                      <button 
                        onClick={() => handleBuyBooster('hammer', true)}
                        disabled={!!buyingBooster}
                        className="w-full py-2 rounded text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                        style={{ backgroundColor: 'var(--theme-warning)', color: 'var(--theme-text)' }}
                      >
                        {buyingBooster === 'hammer-pack' ? 'Buying...' : 'Buy 5x'}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg p-3 border" style={{ backgroundColor: 'var(--theme-background)', borderColor: 'var(--theme-border)' }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold">🔀 Shuffle</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs mb-1" style={{ color: 'var(--theme-secondary)' }}>{formatEther(boosterPrices?.shuffle || 0n)} ETH</div>
                      <button 
                        onClick={() => handleBuyBooster('shuffle', false)}
                        disabled={!!buyingBooster}
                        className="w-full py-2 rounded text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                        style={{ backgroundColor: 'var(--theme-secondary)', color: 'var(--theme-text)' }}
                      >
                        {buyingBooster === 'shuffle' ? 'Buying...' : 'Buy 1x'}
                      </button>
                    </div>
                    <div>
                      <div className="text-xs mb-1" style={{ color: 'var(--theme-secondary)' }}>{formatEther(boosterPrices?.shufflePack || 0n)} ETH</div>
                      <button 
                        onClick={() => handleBuyBooster('shuffle', true)}
                        disabled={!!buyingBooster}
                        className="w-full py-2 rounded text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                        style={{ backgroundColor: 'var(--theme-secondary)', color: 'var(--theme-text)' }}
                      >
                        {buyingBooster === 'shuffle-pack' ? 'Buying...' : 'Buy 5x'}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg p-3 border" style={{ backgroundColor: 'var(--theme-background)', borderColor: 'var(--theme-border)' }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold">💣 Color Bomb</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs mb-1" style={{ color: 'var(--theme-error)' }}>{formatEther(boosterPrices?.colorBomb || 0n)} ETH</div>
                      <button 
                        onClick={() => handleBuyBooster('colorBomb', false)}
                        disabled={!!buyingBooster}
                        className="w-full py-2 rounded text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                        style={{ backgroundColor: 'var(--theme-error)', color: 'var(--theme-text)' }}
                      >
                        {buyingBooster === 'colorBomb' ? 'Buying...' : 'Buy 1x'}
                      </button>
                    </div>
                    <div>
                      <div className="text-xs mb-1" style={{ color: 'var(--theme-error)' }}>{formatEther(boosterPrices?.colorBombPack || 0n)} ETH</div>
                      <button 
                        onClick={() => handleBuyBooster('colorBomb', true)}
                        disabled={!!buyingBooster}
                        className="w-full py-2 rounded text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                        style={{ backgroundColor: 'var(--theme-error)', color: 'var(--theme-text)' }}
                      >
                        {buyingBooster === 'colorBomb-pack' ? 'Buying...' : 'Buy 5x'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowBoosterShop(false)}
                className="mt-4 w-full py-2 rounded text-sm border hover:opacity-90"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>
    </div>
  )
}
