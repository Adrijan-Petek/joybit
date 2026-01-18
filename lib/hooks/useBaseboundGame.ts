import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { useState } from 'react'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { BASEBOUND_GAME_ABI } from '@/lib/contracts/abis'

export function useBaseboundGame() {
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()

  const { writeContractAsync: startGameWrite, isPending: isStartPending } = useWriteContract()
  const { isLoading: isStartConfirming, isSuccess: isStartConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const startGame = async (value: bigint) => {
    const hash = await startGameWrite({
      address: CONTRACT_ADDRESSES.baseboundGame as `0x${string}`,
      abi: BASEBOUND_GAME_ABI,
      functionName: 'playGame',
      value,
    })
    setTxHash(hash)
    return hash
  }

  const retryGame = async (value: bigint) => {
    const hash = await startGameWrite({
      address: CONTRACT_ADDRESSES.baseboundGame as `0x${string}`,
      abi: BASEBOUND_GAME_ABI,
      functionName: 'retryGame',
      value,
    })
    setTxHash(hash)
    return hash
  }

  return {
    startGame,
    retryGame,
    txHash,
    isStarting: isStartPending || isStartConfirming,
    isConfirmed: isStartConfirmed,
  }
}

export function useBaseboundGameData(address?: string) {
  const { data: canPlayFree } = useReadContract({
    address: CONTRACT_ADDRESSES.baseboundGame as `0x${string}`,
    abi: BASEBOUND_GAME_ABI,
    functionName: 'canPlayFree',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
    },
  })

  const { data: playFee } = useReadContract({
    address: CONTRACT_ADDRESSES.baseboundGame as `0x${string}`,
    abi: BASEBOUND_GAME_ABI,
    functionName: 'playFee',
  })

  const { data: retryFee } = useReadContract({
    address: CONTRACT_ADDRESSES.baseboundGame as `0x${string}`,
    abi: BASEBOUND_GAME_ABI,
    functionName: 'retryFee',
  })

  return {
    canPlayFree: canPlayFree as boolean | undefined,
    playFee: playFee as bigint | undefined,
    retryFee: retryFee as bigint | undefined,
  }
}
