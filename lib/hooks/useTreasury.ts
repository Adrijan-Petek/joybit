import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { CONTRACT_ADDRESSES } from '../contracts/addresses'
import { TREASURY_ABI } from '../contracts/abis'
import { useState } from 'react'
import { isAddress } from 'viem'

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

  const claimTokenRewards = async (token: `0x${string}`) => {
    if (!isAddress(token)) {
      throw new Error('Token address is invalid.')
    }

    const hash = await claimRewardsWrite({
      address: CONTRACT_ADDRESSES.treasury as `0x${string}`,
      abi: TREASURY_ABI,
      functionName: 'claimToken',
      args: [token],
    })
    setTxHash(hash)
    return hash
  }

  return {
    claimRewards,
    claimTokenRewards,
    isClaiming: isClaimPending || isClaimConfirming,
    txHash,
  }
}

export function useTreasuryData(address?: string) {
  const hasValidJoybAddress = isAddress(CONTRACT_ADDRESSES.joybitToken)

  const { data: allPendingRewards, isLoading: isLoadingAllRewards, refetch: refetchAllRewards } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury as `0x${string}`,
    abi: TREASURY_ABI,
    functionName: 'getAllPendingRewards',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
    },
  })

  const { data: joybRewards, isLoading: isLoadingJoybRewards } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury as `0x${string}`,
    abi: TREASURY_ABI,
    functionName: 'getPendingRewards',
    args: address ? [address as `0x${string}`, CONTRACT_ADDRESSES.joybitToken] : undefined,
    query: {
      enabled: !!address && hasValidJoybAddress,
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
    query: {
      enabled: hasValidJoybAddress,
    },
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
    query: {
      enabled: hasValidJoybAddress,
    },
  })

  const pendingRewardsTuple = allPendingRewards as [`0x${string}`[], bigint[]] | undefined

  return {
    pendingRewards: joybRewards as bigint, // Keep for backward compatibility
    allPendingRewards: pendingRewardsTuple ? {
      tokens: pendingRewardsTuple[0],
      amounts: pendingRewardsTuple[1]
    } : { tokens: [], amounts: [] },
    ethBalance: ethBalance as bigint,
    joybBalance: joybBalance as bigint,
    totalETHCollected: totalETHCollected as bigint,
    totalJOYBDistributed: totalJOYBDistributed as bigint,
    isLoading: isLoadingAllRewards || isLoadingJoybRewards || isLoadingETH || isLoadingJOYB,
    refetch: refetchAllRewards,
  }
}
