'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useBalance, useReadContract } from 'wagmi'
import { formatUnits, isAddress, zeroAddress } from 'viem'
import { useAudio } from '@/components/audio/AudioContext'
import { WalletButton } from '@/components/WalletButton'
import { AudioButtons } from '@/components/AudioButtons'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { TREASURY_ABI } from '@/lib/contracts/abis'
import { getStorageItem, setStorageItem } from '@/lib/utils/storage'
import { useMatch3Game, useMatch3GameData } from '@/lib/hooks/useMatch3Game'
import { useMatch3Stats } from '@/lib/hooks/useMatch3Stats'
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

function formatRewardAmount(rawAmount: bigint, tokenDecimals: number) {
  const formatted = formatUnits(rawAmount, tokenDecimals)
  const [wholePart, fractionalPart = ''] = formatted.split('.')
  const trimmedFraction = fractionalPart.replace(/0+$/, '').slice(0, 4)
  return trimmedFraction ? `${wholePart}.${trimmedFraction}` : wholePart
}

function getRewardTokenSymbol(tokenAddress: string) {
  const normalizedAddress = tokenAddress.toLowerCase()
  const configuredToken = CONTRACT_ADDRESSES.rewardToken.toLowerCase()

  if (normalizedAddress && normalizedAddress === configuredToken) {
    return 'USDC'
  }

  const configuredRewardTokens = (process.env.NEXT_PUBLIC_REWARD_TOKENS || '')
    .split(',')
    .map((entry) => {
      const [addressPart, symbolPart] = entry.split(':').map((part) => part.trim())
      return {
        address: (addressPart || '').toLowerCase(),
        symbol: symbolPart || 'TOKEN',
      }
    })

  const configured = configuredRewardTokens.find((entry) => entry.address === normalizedAddress)
  if (configured) return configured.symbol

  if (tokenAddress.length >= 10) {
    return `${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`
  }

  return 'TOKEN'
}

type WeeklyRewardSummary = {
  poolAmount: string
  tokenSymbol: string
  winnersCount: number
}

export default function Match3Game() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const rewardTokenAddress = isAddress(CONTRACT_ADDRESSES.rewardToken) ? CONTRACT_ADDRESSES.rewardToken as `0x${string}` : undefined
  const { data: nativeBalance } = useBalance({
    address,
    query: {
      enabled: !!address,
    },
  })
  const { data: usdcBalance } = useBalance({
    address,
    token: rewardTokenAddress,
    query: {
      enabled: !!address && !!rewardTokenAddress,
    },
  })
  const { data: depositedUsdc } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury as `0x${string}`,
    abi: TREASURY_ABI,
    functionName: 'balances',
    args: [address || zeroAddress, (CONTRACT_ADDRESSES.rewardToken || zeroAddress) as `0x${string}`],
    query: {
      enabled: !!address && isAddress(CONTRACT_ADDRESSES.rewardToken),
    },
  })
  const { playSound, playMusic } = useAudio()
  const processingRef = useRef(false)
  const [mounted, setMounted] = useState(false)
  
  // Hook for contract interaction
  const { 
    startGame: startGameContract, 
    continueLevel,
    completeLevel,
    isStarting, 
    buyHammer,
    buyShuffle,
    buyColorBomb,
    buyHammerPack,
    buyShufflePack,
    buyColorBombPack
  } = useMatch3Game()
  const { playFee, continueFee, maxReward, nextSessionId, boosterPrices, refetch } = useMatch3GameData(address)
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

  const [animating, setAnimating] = useState(false)
  const [showShuffleMessage, setShowShuffleMessage] = useState(false)
  const [showBoosterShop, setShowBoosterShop] = useState(false)
  const [showStartPopup, setShowStartPopup] = useState(true)
  const [showResultPopup, setShowResultPopup] = useState(false)
  const [gameResult, setGameResult] = useState<'win' | 'lose' | null>(null)
  const [sessionId, setSessionId] = useState<bigint | null>(null)
  const [buyingBooster, setBuyingBooster] = useState<string | null>(null)
  const [activeBooster, setActiveBooster] = useState<'hammer' | 'colorBomb' | null>(null)
  const [boosterPaymentSource, setBoosterPaymentSource] = useState<'wallet' | 'deposit'>('wallet')
  const [userData, setUserData] = useState<{ username?: string; pfpUrl?: string; fid?: number }>({})
  const [weeklyRewardSummary, setWeeklyRewardSummary] = useState<WeeklyRewardSummary | null>(null)

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
          pfpUrl: context?.user?.pfpUrl,
          fid: context?.user?.fid
        })
      } catch (error) {
        console.log('Not in Farcaster Mini App context')
      }
    }
    
    initSDK()
  }, [playMusic])

  const lastPlayedLevel = Math.max(1, gameState.level)

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

  useEffect(() => {
    let cancelled = false

    const loadWeeklyRewards = async () => {
      try {
        const response = await fetch('/api/rewards/epochs', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(`Failed to load weekly rewards: ${response.status}`)
        }

        const payload = await response.json() as {
          latestEpochs?: Array<{
            period?: string
            status?: string
            tokenAddress?: string
            tokenDecimals?: number
            budgetRaw?: string
            metadata?: string | { payoutPercents?: number[]; winnersCount?: number }
          }>
        }

        const weeklyEpoch = payload.latestEpochs?.find((epoch) => epoch.period === 'weekly')
        if (!weeklyEpoch || !weeklyEpoch.metadata || !weeklyEpoch.budgetRaw) {
          if (!cancelled) setWeeklyRewardSummary(null)
          return
        }

        const metadata: { payoutPercents?: number[]; winnersCount?: number } = typeof weeklyEpoch.metadata === 'string'
          ? JSON.parse(weeklyEpoch.metadata) as { payoutPercents?: number[]; winnersCount?: number }
          : weeklyEpoch.metadata

        const payoutPercents = Array.isArray(metadata?.payoutPercents) ? metadata.payoutPercents : []

        const budgetRaw = BigInt(weeklyEpoch.budgetRaw)
        const tokenDecimals = typeof weeklyEpoch.tokenDecimals === 'number' ? weeklyEpoch.tokenDecimals : 18
        const tokenSymbol = getRewardTokenSymbol(weeklyEpoch.tokenAddress || '')
        const winnersCount = Number(metadata?.winnersCount || 0)
        const resolvedWinnersCount = winnersCount > 0 ? winnersCount : payoutPercents.length
        const poolAmount = formatRewardAmount(budgetRaw, tokenDecimals)

        if (!cancelled) {
          setWeeklyRewardSummary({
            poolAmount,
            tokenSymbol,
            winnersCount: resolvedWinnersCount > 0 ? resolvedWinnersCount : 10,
          })
        }
      } catch (error) {
        console.warn('Failed to load weekly rewards:', error)
        if (!cancelled) setWeeklyRewardSummary(null)
      }
    }

    loadWeeklyRewards()

    return () => {
      cancelled = true
    }
  }, [])

  const ensureCanPayUsdc = useCallback((value: bigint, actionLabel: string) => {
    if (value <= 0n) return true

    if (!usdcBalance) {
      alert('Unable to verify USDC balance yet. Please try again in a moment.')
      return false
    }

    if (usdcBalance.value < value) {
      alert(
        `Insufficient USDC for ${actionLabel}. Need ${formatUnits(value, 6)} USDC, but wallet has ${formatUnits(usdcBalance.value, 6)} USDC.`
      )
      return false
    }

    return true
  }, [usdcBalance])

  const ensureCanPayBooster = useCallback((value: bigint, actionLabel: string) => {
    if (boosterPaymentSource === 'wallet') {
      return ensureCanPayUsdc(value, actionLabel)
    }

    const current = (depositedUsdc as bigint) || 0n
    if (current < value) {
      alert(`Insufficient deposited USDC for ${actionLabel}. Need ${formatUnits(value, 6)} USDC, deposit has ${formatUnits(current, 6)} USDC.`)
      return false
    }
    return true
  }, [boosterPaymentSource, ensureCanPayUsdc, depositedUsdc])

  const formatBoosterPrice = useCallback((value: bigint) => {
    return `${formatUnits(value, 6)} USDC`
  }, [])

  // Start game
  const startGame = useCallback(async (level: number, isPaid: boolean = false) => {
    if (!isConnected || !address) return
    
    try {
      const config = getLevelConfig(level)
      
      // Start fees are charged in USDC via Treasury-v4.
      if (playFee === undefined) {
        console.log('Game fee is still loading, skipping start request.')
        return
      }

      const value = playFee

      if (!ensureCanPayUsdc(value, 'starting the game')) {
        return
      }
      
      const sessionPreview = nextSessionId ? BigInt(nextSessionId) : null
      await startGameContract(level, value)
      setSessionId(sessionPreview ?? BigInt(Date.now()))
      
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
  }, [playSound, gameState.boosters, playFee, startGameContract, isConnected, address, refetch, ensureCanPayUsdc, nextSessionId])

  // Submit game result
  const endGame = useCallback(async (won: boolean) => {
    if (!sessionId || !address) return

    // Cheating detection
    const levelConfig = getLevelConfig(gameState.level)
    const expectedMaxScore = Math.max(gameState.targetScore * 2, levelConfig.targetScore * 3)

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
      const savedStats = await saveStats(gameState.score, gameState.level, newGamesPlayed)
      console.log('✅ Game stats saved to database:', { score: gameState.score, level: gameState.level, gamesPlayed: newGamesPlayed })

      const leaderboardScore = Math.max(gameState.score, savedStats?.highScore || 0)
      await fetch('/api/leaderboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
          score: leaderboardScore,
          username: userData.username,
          pfp: userData.pfpUrl,
          fid: userData.fid,
        }),
      })

      if (won && sessionId) {
        const rewardCap = typeof maxReward === 'bigint' ? maxReward : BigInt(gameState.score)
        const rewardAmount = BigInt(gameState.score) > rewardCap ? rewardCap : BigInt(gameState.score)

        const signatureResponse = await fetch('/api/match3/sign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: sessionId.toString(),
            reward: rewardAmount.toString(),
            player: address,
            token: CONTRACT_ADDRESSES.rewardToken,
          }),
        })

        if (signatureResponse.ok) {
          const signatureData = await signatureResponse.json() as { signature?: `0x${string}` }
          if (signatureData.signature) {
            await completeLevel(sessionId, rewardAmount, signatureData.signature)
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to save game stats:', error)
    }
    
    // Update global leaderboard (scores calculated automatically from stats)
    console.log(`✅ Leaderboard updated for ${won ? 'win' : 'game'}`)
    
    // Play game over sound
    if (!won) {
      playSound?.('game-over')
    }
  }, [sessionId, address, gameState.score, gameState.level, gameState.targetScore, playSound, saveStats, match3Stats.gamesPlayed, userData.username, userData.pfpUrl, userData.fid, completeLevel, maxReward])

  // Process matches and cascading with improved timing
  const processMatches = useCallback(async (grid: Tile[][]) => {
    if (processingRef.current) return grid
    processingRef.current = true
    setAnimating(true)

    let currentGrid = grid.map(row => [...row])
    let hasMatches = true
    let cascadeCount = 0
    let runningScore = gameState.score
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
      const currentScore = runningScore + matchScore
      const wouldCompleteLevel = currentScore >= gameState.targetScore
      runningScore = currentScore

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
    const frameUrl = window.location.origin
    const url = new URL('https://warpcast.com/~/compose')
    url.searchParams.set('text', shareText)
    url.searchParams.append('embeds[]', frameUrl)
    if (channel) url.searchParams.set('channel', channel)
    window.open(url.toString(), '_blank', 'noopener,noreferrer')
  }, [gameResult, gameState.level, gameState.score])

  const handleContinueLevel = useCallback(async () => {
    if (!isConnected || !address || !sessionId) return
    
    try {
      // Continue current session - charged in USDC
      if (continueFee === undefined) {
        console.log('Game fee is still loading, skipping continue request.')
        return
      }

      const value = continueFee

      if (!ensureCanPayUsdc(value, 'continuing this level')) {
        return
      }

      await continueLevel(sessionId, value)
      
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
  }, [gameState.level, continueFee, continueLevel, isConnected, address, playSound, refetch, ensureCanPayUsdc, sessionId])

  const handleNextLevel = () => {
    const nextLevel = gameState.level + 1
    const config = getLevelConfig(nextLevel)
    
    // Generate new session ID for tracking (no contract call needed)
    const newSessionId = BigInt(Date.now())
    setSessionId(newSessionId)
    
    // Update game state locally - no blockchain interaction
    setGameState(prev => ({
      ...prev,
      grid: initializeGrid(config.tileTypes),
      moves: config.moves,
      // Keep run score and increase the next checkpoint by this level's requirement.
      targetScore: prev.targetScore + config.targetScore,
      timeLeft: config.timeLimit,
      level: nextLevel,
      isPlaying: true,
      selectedTile: null,
    }))
    
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
        if (!ensureCanPayBooster(cost, `buying ${isPack ? 'Hammer Pack' : 'Hammer'}`)) return
        hash = isPack 
          ? await buyHammerPack(cost, boosterPaymentSource)
          : await buyHammer(cost, boosterPaymentSource)
      } else if (type === 'shuffle') {
        cost = isPack ? boosterPrices.shufflePack : boosterPrices.shuffle
        if (cost === undefined || cost === null) {
          alert('Booster price is still loading. Please try again.')
          return
        }
        if (!ensureCanPayBooster(cost, `buying ${isPack ? 'Shuffle Pack' : 'Shuffle'}`)) return
        hash = isPack
          ? await buyShufflePack(cost, boosterPaymentSource)
          : await buyShuffle(cost, boosterPaymentSource)
      } else if (type === 'colorBomb') {
        cost = isPack ? boosterPrices.colorBombPack : boosterPrices.colorBomb
        if (cost === undefined || cost === null) {
          alert('Booster price is still loading. Please try again.')
          return
        }
        if (!ensureCanPayBooster(cost, `buying ${isPack ? 'Color Bomb Pack' : 'Color Bomb'}`)) return
        hash = isPack
          ? await buyColorBombPack(cost, boosterPaymentSource)
          : await buyColorBomb(cost, boosterPaymentSource)
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

          {/* Bottom Row: Weekly Rewards */}
          <div
            className="rounded-xl p-2 border shadow-sm"
            style={{
              borderColor: 'color-mix(in srgb, var(--theme-accent) 70%, var(--theme-border))',
              background:
                'linear-gradient(135deg, color-mix(in srgb, var(--theme-accent) 20%, transparent), color-mix(in srgb, var(--theme-primary) 12%, transparent), color-mix(in srgb, var(--theme-warning) 10%, transparent))'
            }}
          >
            {weeklyRewardSummary ? (
              <div className="mx-auto max-w-[220px] text-center py-1">
                <div className="text-[8px] uppercase tracking-[0.14em] font-bold" style={{ color: 'var(--theme-accent)' }}>
                  Weekly Pool
                </div>
                <div className="text-xs md:text-sm font-black" style={{ color: 'var(--theme-text)' }}>
                  {weeklyRewardSummary.poolAmount} {weeklyRewardSummary.tokenSymbol}
                </div>
                <div className="text-[8px] mt-1" style={{ color: 'var(--theme-text-secondary)' }}>
                  Distributed across top {weeklyRewardSummary.winnersCount} players each week.
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed px-3 py-4 text-center text-[9px]" style={{ borderColor: 'color-mix(in srgb, var(--theme-border) 75%, transparent)', color: 'var(--theme-text-secondary)' }}>
                No weekly rewards configured yet.
              </div>
            )}
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
                            ? 1.1
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
                      whileHover={!tile.isMatched && !animating ? { scale: isSelected ? 1.1 : 1.06 } : {}}
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
                      <span style={{ color: 'var(--theme-text-secondary)' }}>Start Fee:</span>
                      <span style={{ color: 'var(--theme-success)' }}>
                        {formatUnits(playFee || 0n, 6)} USDC
                    </span>
                  </div>
                </div>

                {/* Level Rewards Preview */}
                <div
                  className="rounded-xl p-2 md:p-2.5 border shadow-sm"
                  style={{
                      borderColor: 'color-mix(in srgb, var(--theme-accent) 70%, var(--theme-border))',
                    background:
                          'linear-gradient(135deg, color-mix(in srgb, var(--theme-accent) 18%, transparent), color-mix(in srgb, var(--theme-primary) 10%, transparent), color-mix(in srgb, var(--theme-warning) 8%, transparent))'
                  }}
                >
                      <div className="text-center font-bold text-xs md:text-sm mb-1.5" style={{ color: 'var(--theme-accent)' }}>
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 border text-[10px] uppercase tracking-[0.18em]"
                          style={{ borderColor: 'color-mix(in srgb, var(--theme-accent) 65%, transparent)', backgroundColor: 'color-mix(in srgb, var(--theme-accent) 14%, transparent)' }}>
                          Weekly Rewards
                        </span>
                  </div>
                      <div className="text-center text-[9px] md:text-[10px] mb-2" style={{ color: 'var(--theme-text-secondary)' }}>
                        This week’s milestones and JOYB rewards.
                      </div>
                      {weeklyRewardSummary ? (
                        <div className="mx-auto max-w-[240px] text-center py-1">
                          <div className="text-[8px] uppercase tracking-[0.14em] font-bold" style={{ color: 'var(--theme-accent)' }}>
                            Weekly Pool
                          </div>
                          <div className="text-xs md:text-sm font-black" style={{ color: 'var(--theme-text)' }}>
                            {weeklyRewardSummary.poolAmount} {weeklyRewardSummary.tokenSymbol}
                          </div>
                          <div className="text-[8px] mt-1" style={{ color: 'var(--theme-text-secondary)' }}>
                            Distributed across top {weeklyRewardSummary.winnersCount} players each week.
                          </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed px-3 py-4 text-center text-[10px]" style={{ borderColor: 'color-mix(in srgb, var(--theme-border) 75%, transparent)', color: 'var(--theme-text-secondary)' }}>
                      No weekly rewards configured yet.
                    </div>
                  )}
                  <div className="text-center text-[9px] mt-1" style={{ color: 'var(--theme-text-secondary)' }}>
                    Complete levels this week to earn JOYB rewards.
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
                      backgroundColor: 'var(--theme-primary)',
                      color: 'var(--theme-text)'
                    }}
                  >
                    <div className="text-base md:text-lg mb-1">🆕 Start from Level 1</div>
                    <div className="text-xs opacity-90">
                      {`${formatUnits(playFee || 0n, 6)} USDC`}
                    </div>
                  </button>

                  {/* Continue from Last Level */}
                  {lastPlayedLevel > 1 && (
                    <button
                      onClick={handleContinueLevel}
                      disabled={isStarting || continueFee === undefined || !sessionId}
                      className="theme-button-secondary w-full px-4 md:px-6 py-3 md:py-4 rounded-xl font-bold transition-all shadow-lg disabled:opacity-50 text-sm md:text-base hover:opacity-90"
                      style={{
                        backgroundColor: 'var(--theme-secondary)',
                        color: 'var(--theme-text)'
                      }}
                    >
                      <div className="text-base md:text-lg mb-1">▶️ Continue from Level {lastPlayedLevel}</div>
                      <div className="text-xs opacity-90">
                        {formatUnits(continueFee || 0n, 6)} USDC (Required)
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
                      disabled={continueFee === undefined || !sessionId}
                      className="theme-button-secondary w-full px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold transition-all shadow-lg text-sm md:text-base hover:opacity-90"
                      style={{
                        background: 'linear-gradient(90deg, var(--theme-secondary), color-mix(in srgb, var(--theme-primary) 70%, var(--theme-secondary)))',
                        color: 'var(--theme-text)'
                      }}
                    >
                      🔄 Continue Level ({formatUnits(continueFee || 0n, 6)} USDC)
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
                <div className="grid grid-cols-2 gap-2 rounded-lg border p-2" style={{ backgroundColor: 'var(--theme-background)', borderColor: 'var(--theme-border)' }}>
                  <div className="rounded border border-white/10 bg-black/30 px-2 py-1 text-xs text-center">
                    USDC
                  </div>
                  <select
                    value={boosterPaymentSource}
                    onChange={(e) => setBoosterPaymentSource(e.target.value as 'wallet' | 'deposit')}
                    className="rounded border border-white/10 bg-black/30 px-2 py-1 text-xs"
                  >
                    <option value="wallet">Wallet</option>
                    <option value="deposit">Treasury Deposit</option>
                  </select>
                </div>
                <div className="rounded-lg p-3 border" style={{ backgroundColor: 'var(--theme-background)', borderColor: 'var(--theme-border)' }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold">🔨 Hammer</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs mb-1" style={{ color: 'var(--theme-warning)' }}>{formatBoosterPrice(boosterPrices?.hammer || 0n)}</div>
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
                      <div className="text-xs mb-1" style={{ color: 'var(--theme-warning)' }}>{formatBoosterPrice(boosterPrices?.hammerPack || 0n)}</div>
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
                      <div className="text-xs mb-1" style={{ color: 'var(--theme-secondary)' }}>{formatBoosterPrice(boosterPrices?.shuffle || 0n)}</div>
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
                      <div className="text-xs mb-1" style={{ color: 'var(--theme-secondary)' }}>{formatBoosterPrice(boosterPrices?.shufflePack || 0n)}</div>
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
                      <div className="text-xs mb-1" style={{ color: 'var(--theme-error)' }}>{formatBoosterPrice(boosterPrices?.colorBomb || 0n)}</div>
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
                      <div className="text-xs mb-1" style={{ color: 'var(--theme-error)' }}>{formatBoosterPrice(boosterPrices?.colorBombPack || 0n)}</div>
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
