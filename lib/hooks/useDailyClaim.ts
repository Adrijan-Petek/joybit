import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { CONTRACT_ADDRESSES } from '../contracts/addresses'
import { DAILY_CLAIM_ABI } from '../contracts/abis'
import { useState } from 'react'

export function useDailyClaim() {
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()

  // Claim daily reward
  const { 
    writeContractAsync: claimDailyWrite,
    isPending 
  } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const claimDaily = async () => {
    const hash = await claimDailyWrite({
      address: CONTRACT_ADDRESSES.dailyClaim as `0x${string}`,
      abi: DAILY_CLAIM_ABI,
      functionName: 'claimDaily',
    })
    setTxHash(hash)
    return hash
  }

  return {
    claimDaily,
    isClaiming: isPending || isConfirming,
    isSuccess,
    txHash,
  }
}

export function useClaimData(address?: string) {
  const { data: playerData, isLoading: isLoadingData, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.dailyClaim as `0x${string}`,
    abi: DAILY_CLAIM_ABI,
    functionName: 'players',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
    },
  })

  const { data: canClaim, isLoading: isLoadingCanClaim } = useReadContract({
    address: CONTRACT_ADDRESSES.dailyClaim as `0x${string}`,
    abi: DAILY_CLAIM_ABI,
    functionName: 'canClaim',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
    },
  })

  const { data: claimableReward, isLoading: isLoadingReward } = useReadContract({
    address: CONTRACT_ADDRESSES.dailyClaim as `0x${string}`,
    abi: DAILY_CLAIM_ABI,
    functionName: 'getClaimableReward',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
    },
  })

  const { data: timeUntilNext } = useReadContract({
    address: CONTRACT_ADDRESSES.dailyClaim as `0x${string}`,
    abi: DAILY_CLAIM_ABI,
    functionName: 'getTimeUntilNextClaim',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
    },
  })

  const { data: baseReward } = useReadContract({
    address: CONTRACT_ADDRESSES.dailyClaim as `0x${string}`,
    abi: DAILY_CLAIM_ABI,
    functionName: 'baseReward',
  })

  const { data: streakBonus } = useReadContract({
    address: CONTRACT_ADDRESSES.dailyClaim as `0x${string}`,
    abi: DAILY_CLAIM_ABI,
    functionName: 'streakBonus',
  })

  return {
    playerData: playerData as any,
    canClaim: canClaim as boolean,
    claimableReward: claimableReward as bigint,
    timeUntilNext: timeUntilNext as bigint,
    baseReward: baseReward as bigint,
    streakBonus: streakBonus as bigint,
    isLoading: isLoadingData || isLoadingCanClaim || isLoadingReward,
    refetch,
  }
}

