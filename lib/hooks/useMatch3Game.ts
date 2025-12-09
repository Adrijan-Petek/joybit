import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
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

  return {
    startGame,
    isStarting: isStartPending || isStartConfirming,
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

  useEffect(() => {
    // Load level rewards from localStorage
    const saved = localStorage.getItem('joybit_level_rewards')
    if (saved) {
      setLevelRewards(JSON.parse(saved))
    }
  }, [])

  const getRewardForLevel = (level: number): string => {
    return levelRewards[level] || '0'
  }

  const getRewardAmount = (level: number): number => {
    const reward = getRewardForLevel(level)
    return parseFloat(reward) || 0
  }

  return {
    getRewardForLevel,
    getRewardAmount,
    levelRewards
  }
}
