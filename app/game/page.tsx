'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount } from 'wagmi'
import { formatEther, parseEther } from 'viem'
import { useAudio } from '@/components/audio/AudioContext'
import { WalletButton } from '@/components/WalletButton'
import { AudioButtons } from '@/components/AudioButtons'
import { SettingsButton } from '@/components/SettingsButton'
import { getStorageItem, setStorageItem } from '@/lib/utils/storage'
import { useMatch3Game, useMatch3GameData, useMatch3LevelReward, useLevelRewardsManager } from '@/lib/hooks/useMatch3Game'
import { useMatch3Stats } from '@/lib/hooks/useMatch3Stats'
import { notifyAdminReward } from '@/lib/utils/farcasterNotifications'
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

const TILE_COLORS = [
  'bg-red-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-orange-500',
  'bg-cyan-500',
]

export default function Match3Game() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
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
  const { getRewardForLevel, getRewardAmount, levelRewards } = useLevelRewardsManager()

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

  // Load level rewards from database
  useEffect(() => {
    const fetchLevelRewards = async () => {
      try {
        const response = await fetch('/api/level-rewards')
        if (response.ok) {
          const rewardsObj = await response.json()
          // Convert object to array: {5: "100"} -> [{level: 5, amount: "100"}]
          const rewardsArray = Object.entries(rewardsObj).map(([level, amount]) => ({
            level: parseInt(level),
            amount: amount as string
          }))
          // Sort by level ascending
          const sortedRewards = rewardsArray.sort((a, b) => a.level - b.level)
          setAllLevelRewards(sortedRewards)
        }
      } catch (error) {
        console.error('Failed to fetch level rewards:', error)
      }
    }
    fetchLevelRewards()
  }, [])

  // Start game
  const startGame = useCallback(async (level: number, isPaid: boolean = false) => {
    if (!isConnected || !address) return
    
    try {
      const config = getLevelConfig(level)
      
      // If continuing from last level, user must pay
      // If starting from level 1, can use free play if available
      const shouldPay = isPaid || (level > 1)
      const value = shouldPay ? (playFee || parseEther('0.001')) : (canPlayFree ? 0n : (playFee || parseEther('0.001')))
      
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
  }, [playSound, gameState.boosters, canPlayFree, playFee, startGameContract, isConnected, address, refetch])

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
    // If player won, record level completion in database
    if (won) {
      const rewardAmount = getRewardAmount(gameState.level)
      if (rewardAmount > 0) {
        try {
          // Record the level completion in database
          console.log(`🎁 Recording level ${gameState.level} completion with ${rewardAmount} JOYB reward`)
          
          const response = await fetch('/api/level-completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              address,
              level: gameState.level,
              rewardAmount: rewardAmount.toString()
            })
          })
          
          if (response.ok) {
            console.log(`✅ Level ${gameState.level} completion saved to database`)
          } else {
            console.error(`❌ Failed to save level ${gameState.level} completion:`, response.status)
          }
          
          // Send notification about the reward
          await notifyAdminReward(rewardAmount.toString(), 'JOYB')
        } catch (error) {
          console.error('Failed to record level completion:', error)
        }
      }
    }
    
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
  }, [sessionId, address, gameState.score, gameState.level, playSound, saveStats, match3Stats.gamesPlayed, getRewardAmount])

  // Process matches and cascading with improved timing
  const processMatches = useCallback(async (grid: Tile[][]) => {
    if (processingRef.current) return grid
    processingRef.current = true
    setAnimating(true)

    let currentGrid = grid.map(row => [...row])
    let hasMatches = true
    let cascadeCount = 0
    const maxCascades = 10 // Prevent infinite cascades

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

      // Shorter delay for match highlighting
      await new Promise(resolve => setTimeout(resolve, 150))

      // Apply gravity with falling animation
      currentGrid = applyGravity(currentGrid)

      setGameState(prev => ({
        ...prev,
        grid: currentGrid.map(row => [...row]),
      }))

      // Shorter delay for falling animation
      await new Promise(resolve => setTimeout(resolve, 200))

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
      currentGrid = applyGravity(currentGrid)
    }

    setAnimating(false)
    processingRef.current = false
    return currentGrid
  }, [playSound, gameState.score, gameState.targetScore])

  // Auto-shuffle when no valid moves
  const checkAndShuffle = useCallback(async (grid: Tile[][]) => {
    if (!hasValidMoves(grid)) {
      setShowShuffleMessage(true)
      playSound?.('shuffle')
      await new Promise(resolve => setTimeout(resolve, 1000))
      const shuffled = shuffleGrid(grid)
      setShowShuffleMessage(false)
      return shuffled
    }
    return grid
  }, [playSound])

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
      const shuffled = shuffleGrid(gameState.grid)
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
      newGrid = applyGravity(newGrid)
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
      newGrid = applyGravity(newGrid)
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

  const handleContinueLevel = useCallback(async () => {
    if (!isConnected || !address) return
    
    try {
      // Continue current level - always payable (no free continues)
      const value = playFee || parseEther('0.001')
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
  }, [gameState.level, playFee, startGameContract, isConnected, address, playSound, refetch])

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
      
      if (type === 'hammer') {
        hash = isPack 
          ? await buyHammerPack(boosterPrices.hammerPack)
          : await buyHammer(boosterPrices.hammer)
      } else if (type === 'shuffle') {
        hash = isPack
          ? await buyShufflePack(boosterPrices.shufflePack)
          : await buyShuffle(boosterPrices.shuffle)
      } else if (type === 'colorBomb') {
        hash = isPack
          ? await buyColorBombPack(boosterPrices.colorBombPack)
          : await buyColorBomb(boosterPrices.colorBomb)
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
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-2">
      <div className="fixed top-2 right-2 z-50 flex items-center gap-2">
        <AudioButtons />
        <SettingsButton />
        <WalletButton />
      </div>

      <div className="container mx-auto max-w-md pt-14 pb-4 px-2">
        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          <button
            onClick={() => router.push('/')}
            className="bg-cyan-500 hover:bg-cyan-600 px-3 py-1.5 rounded-lg transition-all text-xs"
          >
            ← Back
          </button>
          <h1 className="text-base font-bold">🎮 Match-3</h1>
          <button
            onClick={() => setShowBoosterShop(!showBoosterShop)}
            className="bg-purple-500 hover:bg-purple-600 px-3 py-1.5 rounded-lg transition-all text-xs"
          >
            🛒 Shop
          </button>
        </div>

        {/* Game Info Panel */}
        <div className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur rounded-xl p-2 mb-2 border border-gray-700/50 shadow-lg">
          {/* Single Row: All Game Stats */}
          <div className="flex items-center justify-between gap-1 text-center">
            <div className="flex flex-col items-center">
              <div className="text-[8px] text-blue-300 font-medium">Level</div>
              <div className="text-xs font-bold text-blue-400">{gameState.level}</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-[8px] text-green-300 font-medium">Score</div>
              <div className="text-xs font-bold text-green-400">{gameState.score.toLocaleString()}</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-[8px] text-purple-300 font-medium">Moves</div>
              <div className="text-xs font-bold text-purple-400">{gameState.moves}</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-[8px] text-orange-300 font-medium">Time</div>
              <div className="text-xs font-bold text-orange-400">{gameState.timeLeft}s</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-[8px] text-cyan-300 font-medium">Target</div>
              <div className="text-xs font-bold text-cyan-400">{gameState.targetScore.toLocaleString()}</div>
            </div>
          </div>

          {/* Bottom Row: Level Rewards */}
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-3">
            <div className="text-center text-[10px] font-bold text-yellow-400 mb-2">
              🎁 Level Rewards
            </div>
            {/* Progress Bar */}
            {(() => {
              const configuredRewards = allLevelRewards.filter(reward => reward.level >= 1 && reward.level <= 100)
              const maxLevel = configuredRewards.length > 0 ? Math.max(...configuredRewards.map(r => r.level)) : 100
              const progressPercent = maxLevel > 0 ? Math.min((gameState.level / maxLevel) * 100, 100) : 0
              
              return (
                <div className="relative w-full h-2 bg-gray-600 rounded-full mb-2">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
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
                        style={{ left: `${position}%`, transform: 'translate(-50%, -50%)' }}
                        title={`Level ${reward.level}\nReward: ${reward.amount} JOYB`}
                      >
                        <div className={`w-full h-full rounded-full ${isClaimed ? 'bg-green-500 border-green-300' : isUnlocked ? 'bg-yellow-400 border-yellow-300' : 'bg-gray-500 border-gray-400'}`}>
                          {isClaimed && <span className="absolute inset-0 flex items-center justify-center text-white text-[8px]">✔</span>}
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
                    className="absolute top-0 text-[8px] text-gray-400 font-medium"
                    style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
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
              className={`flex-1 hover:bg-orange-600 disabled:bg-gray-600 disabled:opacity-50 px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeBooster === 'hammer' ? 'bg-orange-600 ring-2 ring-yellow-400 animate-pulse' : 'bg-orange-500'
              }`}
            >
              🔨 {gameState.boosters.hammer}
            </button>
            <button
              onClick={() => handleBooster('shuffle')}
              disabled={gameState.boosters.shuffle <= 0}
              className="flex-1 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 disabled:opacity-50 px-2 py-1.5 rounded-lg text-xs font-bold"
            >
              🔀 {gameState.boosters.shuffle}
            </button>
            <button
              onClick={() => handleBooster('colorBomb')}
              disabled={gameState.boosters.colorBomb <= 0}
              className={`flex-1 hover:bg-red-600 disabled:bg-gray-600 disabled:opacity-50 px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeBooster === 'colorBomb' ? 'bg-red-600 ring-2 ring-yellow-400 animate-pulse' : 'bg-red-500'
              }`}
            >
              💣 {gameState.boosters.colorBomb}
            </button>
          </div>
        )}

        {/* Active Booster Indicator */}
        {activeBooster && (
          <div className="mb-2 text-center">
            <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg px-3 py-2 text-xs font-bold text-yellow-300 animate-pulse">
              {activeBooster === 'hammer' && '🔨 Click any tile to destroy it!'}
              {activeBooster === 'colorBomb' && '💣 Click a tile to destroy all tiles of that color!'}
            </div>
          </div>
        )}

        {/* Game Stats - Old removed, Level Selector removed */}

        {/* Game Grid */}
        <div className="bg-gray-900/50 backdrop-blur-lg rounded-lg p-1.5 border border-gray-800">
          <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}>
            {gameState.grid.map((row, y) =>
              row.map((tile, x) => (
                <motion.button
                  key={tile.id}
                  onClick={() => handleTileClick(x, y)}
                  disabled={!gameState.isPlaying || animating}
                  className={`
                    aspect-square rounded flex items-center justify-center overflow-hidden
                    ${tile.isMatched ? 'opacity-0' : 'opacity-100'}
                    ${gameState.selectedTile?.x === x && gameState.selectedTile?.y === y ? 'ring-2 ring-white' : ''}
                    disabled:cursor-not-allowed
                  `}
                  initial={false}
                  animate={{
                    scale: tile.isMatched ? 0 : 1,
                    opacity: tile.isMatched ? 0 : 1,
                  }}
                  transition={{ 
                    duration: 0.2,
                    ease: "easeOut"
                  }}
                >
                  <img 
                    src={`/tiles/tile-${tile.type}.png`} 
                    alt={`Tile ${tile.type}`}
                    className="w-full h-full object-cover"
                  />
                </motion.button>
              ))
            )}
          </div>
        </div>

        {/* Shuffle Message */}
        <AnimatePresence>
          {showShuffleMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed inset-0 flex items-center justify-center z-50 bg-black/50"
            >
              <div className="bg-cyan-500 text-white px-8 py-4 rounded-xl text-xl font-bold shadow-2xl">
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
            className="fixed inset-0 flex items-center justify-center z-50 bg-black/80 p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-4 md:p-6 max-w-sm w-full border-2 border-purple-500 shadow-2xl"
            >
              <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                🎮 Match-3 Game
              </h2>
              
              <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                <div className="bg-gray-800/50 rounded-lg p-2 md:p-3 text-xs md:text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">Your Progress:</span>
                    <span className="text-purple-400 font-bold">Level {lastPlayedLevel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Free Play:</span>
                    <span className={canPlayFree ? 'text-green-400' : 'text-red-400'}>
                      {canPlayFree ? '✅ Available' : '❌ Not Available'}
                    </span>
                  </div>
                </div>

                {/* Level Rewards Preview */}
                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-2 md:p-3">
                  <div className="text-center text-yellow-400 font-bold text-xs md:text-sm mb-2">
                    🎁 Level Rewards
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center text-center">
                    {allLevelRewards.filter(reward => reward.level >= 1 && reward.level <= 100).map((reward) => {
                      return (
                        <div key={reward.level} className="flex flex-col items-center min-w-[40px]">
                          <div className={`text-[10px] font-bold ${lastPlayedLevel >= reward.level ? 'text-green-400' : 'text-gray-400'}`}>
                            Lv.{reward.level}
                          </div>
                          <div className={`text-[9px] ${lastPlayedLevel >= reward.level ? 'text-green-300' : 'text-gray-500'}`}>
                            {reward.amount !== '0' && reward.amount !== '' ? (
                              parseFloat(reward.amount) >= 1000 ? `${(parseFloat(reward.amount) / 1000).toFixed(1)}K` : reward.amount
                            ) : '-'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="text-center text-[9px] text-gray-400 mt-1">
                    Complete levels to earn JOYB rewards!
                  </div>
                </div>
              </div>

              {!isConnected ? (
                <div className="space-y-3">
                  <p className="text-yellow-400 text-center text-sm">⚠️ Please connect wallet to play</p>
                  
                  <div className="flex flex-col gap-2">
                    <WalletButton />
                    
                    <button
                      onClick={() => router.push('/')}
                      className="w-full bg-gray-700 hover:bg-gray-600 px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold transition-all text-sm md:text-base"
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
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 px-4 md:px-6 py-3 md:py-4 rounded-xl font-bold transition-all shadow-lg disabled:opacity-50 text-sm md:text-base"
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
                      disabled={isStarting}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 px-4 md:px-6 py-3 md:py-4 rounded-xl font-bold transition-all shadow-lg disabled:opacity-50 text-sm md:text-base"
                    >
                      <div className="text-base md:text-lg mb-1">▶️ Continue from Level {lastPlayedLevel}</div>
                      <div className="text-xs opacity-90">
                        {formatEther(playFee || 0n)} ETH (Required)
                      </div>
                    </button>
                  )}

                  <button
                    onClick={() => router.push('/')}
                    className="w-full bg-gray-700 hover:bg-gray-600 px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold transition-all text-sm md:text-base"
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
            className="fixed inset-0 flex items-center justify-center z-50 bg-black/80 p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              className={`
                rounded-2xl p-4 md:p-6 max-w-sm w-full border-2 shadow-2xl
                ${gameResult === 'win' 
                  ? 'bg-gradient-to-br from-green-600 to-emerald-700 border-green-400' 
                  : 'bg-gradient-to-br from-red-600 to-pink-700 border-red-400'
                }
              `}
            >
              <div className="text-center">
                <div className="text-5xl md:text-6xl mb-3 md:mb-4">
                  {gameResult === 'win' ? '🎉' : '😢'}
                </div>
                <h2 className="text-2xl md:text-3xl font-bold mb-2">
                  {gameResult === 'win' ? 'You Won!' : 'Game Over'}
                </h2>
                <div className="bg-black/20 rounded-lg p-3 md:p-4 mb-3 md:mb-4">
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
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold transition-all shadow-lg text-sm md:text-base"
                    >
                      ▶️ Next Level ({gameState.level + 1})
                    </button>
                  )}
                  {gameResult === 'lose' && (
                    <button
                      onClick={handleContinueLevel}
                      className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold transition-all shadow-lg text-sm md:text-base"
                    >
                      🔄 Continue Level ({formatEther(playFee || parseEther('0.001'))} ETH)
                    </button>
                  )}
                  {gameResult === 'lose' && (
                    <button
                      onClick={handlePlayAgain}
                      className="w-full bg-white text-gray-900 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold hover:bg-gray-100 transition-all text-sm md:text-base"
                    >
                      🎮 Play Again
                    </button>
                  )}
                  <button
                    onClick={() => router.push('/profile')}
                    className="w-full bg-purple-600 hover:bg-purple-700 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold transition-all text-sm md:text-base"
                  >
                    👤 Go to Profile
                  </button>
                  <button
                    onClick={() => router.push('/')}
                    className="w-full bg-gray-700 hover:bg-gray-600 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold transition-all text-sm md:text-base"
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
            className="fixed inset-0 flex items-center justify-center z-50 bg-black/70 p-4"
            onClick={() => setShowBoosterShop(false)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="bg-gray-900 rounded-lg p-4 max-w-md w-full border border-purple-500"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-4 text-purple-400">🛒 Booster Shop</h2>
              <div className="space-y-2">
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold">🔨 Hammer</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-orange-400 text-xs mb-1">{formatEther(boosterPrices?.hammer || 0n)} ETH</div>
                      <button 
                        onClick={() => handleBuyBooster('hammer', false)}
                        disabled={!!buyingBooster}
                        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed py-2 rounded text-sm font-bold transition-all"
                      >
                        {buyingBooster === 'hammer' ? 'Buying...' : 'Buy 1x'}
                      </button>
                    </div>
                    <div>
                      <div className="text-orange-400 text-xs mb-1">{formatEther(boosterPrices?.hammerPack || 0n)} ETH</div>
                      <button 
                        onClick={() => handleBuyBooster('hammer', true)}
                        disabled={!!buyingBooster}
                        className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed py-2 rounded text-sm font-bold transition-all"
                      >
                        {buyingBooster === 'hammer-pack' ? 'Buying...' : 'Buy 5x'}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold">🔀 Shuffle</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-cyan-400 text-xs mb-1">{formatEther(boosterPrices?.shuffle || 0n)} ETH</div>
                      <button 
                        onClick={() => handleBuyBooster('shuffle', false)}
                        disabled={!!buyingBooster}
                        className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed py-2 rounded text-sm font-bold transition-all"
                      >
                        {buyingBooster === 'shuffle' ? 'Buying...' : 'Buy 1x'}
                      </button>
                    </div>
                    <div>
                      <div className="text-cyan-400 text-xs mb-1">{formatEther(boosterPrices?.shufflePack || 0n)} ETH</div>
                      <button 
                        onClick={() => handleBuyBooster('shuffle', true)}
                        disabled={!!buyingBooster}
                        className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed py-2 rounded text-sm font-bold transition-all"
                      >
                        {buyingBooster === 'shuffle-pack' ? 'Buying...' : 'Buy 5x'}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold">💣 Color Bomb</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-red-400 text-xs mb-1">{formatEther(boosterPrices?.colorBomb || 0n)} ETH</div>
                      <button 
                        onClick={() => handleBuyBooster('colorBomb', false)}
                        disabled={!!buyingBooster}
                        className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed py-2 rounded text-sm font-bold transition-all"
                      >
                        {buyingBooster === 'colorBomb' ? 'Buying...' : 'Buy 1x'}
                      </button>
                    </div>
                    <div>
                      <div className="text-red-400 text-xs mb-1">{formatEther(boosterPrices?.colorBombPack || 0n)} ETH</div>
                      <button 
                        onClick={() => handleBuyBooster('colorBomb', true)}
                        disabled={!!buyingBooster}
                        className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed py-2 rounded text-sm font-bold transition-all"
                      >
                        {buyingBooster === 'colorBomb-pack' ? 'Buying...' : 'Buy 5x'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowBoosterShop(false)}
                className="mt-4 w-full bg-gray-700 hover:bg-gray-600 py-2 rounded text-sm"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
