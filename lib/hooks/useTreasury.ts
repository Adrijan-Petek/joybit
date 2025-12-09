import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { CONTRACT_ADDRESSES } from '../contracts/addresses'
import { TREASURY_ABI } from '../contracts/abis'
import { useState } from 'react'

export function useTreasury() {
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()

  // Claim rewards
  const { 
    writeContractAsync: claimRewardsWrite,
    isPending: isClaimPending 
  } = useWriteContract()

  const { isLoading: isClaimConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const claimRewards = async () => {
    const hash = await claimRewardsWrite({
      address: CONTRACT_ADDRESSES.treasury as `0x${string}`,
      abi: TREASURY_ABI,
      functionName: 'claimAllTokens',
    })
    setTxHash(hash)
    return hash
  }

  return {
    claimRewards,
    isClaiming: isClaimPending || isClaimConfirming,
    txHash,
  }
}

export function useTreasuryData(address?: string) {
  const { data: allPendingRewards, isLoading: isLoadingAllRewards, refetch: refetchAllRewards } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury as `0x${string}`,
    abi: TREASURY_ABI,
    functionName: 'getAllPendingRewards',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
    },
  })

  const { data: joybRewards, isLoading: isLoadingJoybRewards, refetch: refetchJoybRewards } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury as `0x${string}`,
    abi: TREASURY_ABI,
    functionName: 'getPendingRewards',
    args: address ? [address as `0x${string}`, CONTRACT_ADDRESSES.joybitToken] : undefined,
    query: {
      enabled: !!address,
    },
  })

  const { data: ethBalance, isLoading: isLoadingETH } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury as `0x${string}`,
    abi: TREASURY_ABI,
    functionName: 'treasuryBalanceETH',
  })

  const { data: joybBalance, isLoading: isLoadingJOYB } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury as `0x${string}`,
    abi: TREASURY_ABI,
    functionName: 'treasuryBalanceToken',
    args: [CONTRACT_ADDRESSES.joybitToken],
  })

  const { data: totalETHCollected } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury as `0x${string}`,
    abi: TREASURY_ABI,
    functionName: 'totalETHCollected',
  })

  const { data: totalJOYBDistributed } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury as `0x${string}`,
    abi: TREASURY_ABI,
    functionName: 'totalTokenDistributed',
    args: [CONTRACT_ADDRESSES.joybitToken],
  })

  return {
    pendingRewards: joybRewards as bigint, // Keep for backward compatibility
    allPendingRewards: allPendingRewards ? {
      tokens: allPendingRewards[0] as `0x${string}`[],
      amounts: allPendingRewards[1] as bigint[]
    } : { tokens: [], amounts: [] },
    ethBalance: ethBalance as bigint,
    joybBalance: joybBalance as bigint,
    totalETHCollected: totalETHCollected as bigint,
    totalJOYBDistributed: totalJOYBDistributed as bigint,
    isLoading: isLoadingAllRewards || isLoadingJoybRewards || isLoadingETH || isLoadingJOYB,
    refetch: refetchAllRewards,
  }
}
