import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { CONTRACT_ADDRESSES } from '../contracts/addresses'
import { CARD_GAME_ABI } from '../contracts/abis'
import { useState } from 'react'

export function useCardGame() {
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()

  // Play card game
  const { 
    writeContractAsync: playGameWrite,
    isPending: isPlayPending 
  } = useWriteContract()

  const { isLoading: isPlayConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const playGame = async (selectedCard: number, value?: bigint) => {
    const hash = await playGameWrite({
      address: CONTRACT_ADDRESSES.cardGame as `0x${string}`,
      abi: CARD_GAME_ABI,
      functionName: 'playGame',
      args: [selectedCard],
      value: value || 0n,
    })
    setTxHash(hash)
    return hash
  }

  return {
    playGame,
    isPlaying: isPlayPending || isPlayConfirming,
    txHash,
  }
}

export function useCardGameData(address?: string) {
  const { data: playerData, isLoading: isLoadingData, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.cardGame as `0x${string}`,
    abi: CARD_GAME_ABI,
    functionName: 'players',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
    },
  })

  const { data: canPlayFree, isLoading: isLoadingFree } = useReadContract({
    address: CONTRACT_ADDRESSES.cardGame as `0x${string}`,
    abi: CARD_GAME_ABI,
    functionName: 'canPlayFree',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
    },
  })

  const { data: playFee } = useReadContract({
    address: CONTRACT_ADDRESSES.cardGame as `0x${string}`,
    abi: CARD_GAME_ABI,
    functionName: 'playFee',
  })

  const { data: winReward } = useReadContract({
    address: CONTRACT_ADDRESSES.cardGame as `0x${string}`,
    abi: CARD_GAME_ABI,
    functionName: 'winReward',
  })

  return {
    playerData: playerData as any,
    canPlayFree: canPlayFree as boolean,
    playFee: playFee as bigint,
    winReward: winReward as bigint,
    isLoading: isLoadingData || isLoadingFree,
    refetch,
  }
}

