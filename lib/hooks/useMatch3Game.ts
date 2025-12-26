import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { formatEther } from 'viem'
import { CONTRACT_ADDRESSES } from '../contracts/addresses'
import { MATCH3_GAME_ABI } from '../contracts/abis'
import { useState, useEffect } from 'react'

export function useMatch3Game() {
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()

  // Start game
  const { 
    writeContractAsync: startGameWrite,
    isPending: isStartPending 
  } = useWriteContract()

  const { isLoading: isStartConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  // Submit result
  const { 
    writeContractAsync: submitResultWrite,
    isPending: isSubmitPending 
  } = useWriteContract()

  // Buy single boosters
  const { 
    writeContractAsync: buyBoosterWrite,
    isPending: isBuyPending 
  } = useWriteContract()

  const startGame = async (level: number, value?: bigint) => {
    const hash = await startGameWrite({
      address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
      abi: MATCH3_GAME_ABI,
      functionName: 'startGame',
      args: [level],
      value: value || 0n,
    })
    setTxHash(hash)
    return hash
  }

  // Note: Match3Game auto-handles game completion - no manual submit needed

  const buyHammer = async (value: bigint) => {
    const hash = await buyBoosterWrite({
      address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
      abi: MATCH3_GAME_ABI,
      functionName: 'buyHammer',
      value,
    })
    setTxHash(hash)
    return hash
  }

  const buyShuffle = async (value: bigint) => {
    const hash = await buyBoosterWrite({
      address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
      abi: MATCH3_GAME_ABI,
      functionName: 'buyShuffle',
      value,
    })
    setTxHash(hash)
    return hash
  }

  const buyColorBomb = async (value: bigint) => {
    const hash = await buyBoosterWrite({
      address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
      abi: MATCH3_GAME_ABI,
      functionName: 'buyColorBomb',
      value,
    })
    setTxHash(hash)
    return hash
  }

  const buyHammerPack = async (value: bigint) => {
    const hash = await buyBoosterWrite({
      address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
      abi: MATCH3_GAME_ABI,
      functionName: 'buyHammerPack',
      value,
    })
    setTxHash(hash)
    return hash
  }

  const buyShufflePack = async (value: bigint) => {
    const hash = await buyBoosterWrite({
      address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
      abi: MATCH3_GAME_ABI,
      functionName: 'buyShufflePack',
      value,
    })
    setTxHash(hash)
    return hash
  }

  const buyColorBombPack = async (value: bigint) => {
    const hash = await buyBoosterWrite({
      address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
      abi: MATCH3_GAME_ABI,
      functionName: 'buyColorBombPack',
      value,
    })
    setTxHash(hash)
    return hash
  }

  // Complete level
  const { 
    writeContractAsync: completeLevelWrite,
    isPending: isCompletePending 
  } = useWriteContract()

  const completeLevel = async (sessionId: bigint, level: number) => {
    const hash = await completeLevelWrite({
      address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
      abi: MATCH3_GAME_ABI,
      functionName: 'completeLevel',
      args: [sessionId, level],
    })
    setTxHash(hash)
    return hash
  }

  return {
    startGame,
    completeLevel,
    isStarting: isStartPending || isStartConfirming,
    isCompleting: isCompletePending,
    buyHammer,
    buyShuffle,
    buyColorBomb,
    buyHammerPack,
    buyShufflePack,
    buyColorBombPack,
    isBuying: isBuyPending,
    txHash,
  }
}

export function useMatch3GameData(address?: string) {
  const { data: playerData, isLoading: isLoadingPlayer, refetch: refetchPlayer } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
    abi: MATCH3_GAME_ABI,
    functionName: 'getPlayerData',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
    },
  })

  const { data: canPlayFree, isLoading: isLoadingFree, refetch: refetchFree } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
    abi: MATCH3_GAME_ABI,
    functionName: 'canPlayFree',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
    },
  })

  const { data: playFee, isLoading: isLoadingFee } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
    abi: MATCH3_GAME_ABI,
    functionName: 'playFee',
  })

  const { data: hammerPrice } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
    abi: MATCH3_GAME_ABI,
    functionName: 'hammerPrice',
  })

  const { data: shufflePrice } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
    abi: MATCH3_GAME_ABI,
    functionName: 'shufflePrice',
  })

  const { data: colorBombPrice } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
    abi: MATCH3_GAME_ABI,
    functionName: 'colorBombPrice',
  })

  const { data: hammerPackPrice } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
    abi: MATCH3_GAME_ABI,
    functionName: 'hammerPackPrice',
  })

  const { data: shufflePackPrice } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
    abi: MATCH3_GAME_ABI,
    functionName: 'shufflePackPrice',
  })

  const { data: colorBombPackPrice } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
    abi: MATCH3_GAME_ABI,
    functionName: 'colorBombPackPrice',
  })

  return {
    playerData: playerData as any,
    canPlayFree: canPlayFree as boolean,
    playFee: playFee as bigint,
    boosterPrices: {
      hammer: hammerPrice as bigint,
      shuffle: shufflePrice as bigint,
      colorBomb: colorBombPrice as bigint,
      hammerPack: hammerPackPrice as bigint,
      shufflePack: shufflePackPrice as bigint,
      colorBombPack: colorBombPackPrice as bigint,
    },
    isLoading: isLoadingPlayer || isLoadingFree || isLoadingFee,
    refetch: () => {
      refetchPlayer()
      refetchFree()
    },
  }
}

export function useMatch3LevelReward(level: number) {
  const { data: reward } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
    abi: MATCH3_GAME_ABI,
    functionName: 'levelRewards',
    args: [level],
  })

  return reward as bigint
}

export function useLevelRewardsManager() {
  const [levelRewards, setLevelRewards] = useState<Record<number, string>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load level rewards from database API
    const loadRewards = async () => {
      try {
        console.log('🎁 Loading level rewards from database...')
        const response = await fetch('/api/level-rewards')
        if (response.ok) {
          const data = await response.json()
          setLevelRewards(data)
          console.log('✅ Level rewards loaded from database:', data)
        } else {
          console.error('Failed to load level rewards from database')
        }
      } catch (error) {
        console.error('Error loading level rewards:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadRewards()
  }, [])

  const getRewardForLevel = (level: number): string => {
    const reward = levelRewards[level]
    return reward || '0'
  }

  const getRewardAmount = (level: number): number => {
    const reward = getRewardForLevel(level)
    return parseFloat(reward) || 0
  }

  const saveReward = async (level: number, reward: string) => {
    try {
      const response = await fetch('/api/level-rewards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ level, reward }),
      })

      if (response.ok) {
        // Update local state
        setLevelRewards(prev => ({ ...prev, [level]: reward }))
        return true
      }
      return false
    } catch (error) {
      console.error('Error saving level reward:', error)
      return false
    }
  }

  const deleteReward = async (level: number) => {
    try {
      const response = await fetch('/api/level-rewards', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ level }),
      })

      if (response.ok) {
        // Update local state
        setLevelRewards(prev => {
          const newRewards = { ...prev }
          delete newRewards[level]
          return newRewards
        })
        return true
      }
      return false
    } catch (error) {
      console.error('Error deleting level reward:', error)
      return false
    }
  }

  return {
    getRewardForLevel,
    getRewardAmount,
    levelRewards,
    isLoading,
    saveReward,
    deleteReward
  }
}
