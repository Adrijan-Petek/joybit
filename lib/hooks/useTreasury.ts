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

    if (token.toLowerCase() !== (CONTRACT_ADDRESSES.rewardToken || '').toLowerCase()) {
      throw new Error('Only USDC rewards are supported.')
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
  const hasValidUsdcAddress = isAddress(CONTRACT_ADDRESSES.rewardToken)

  const { data: allPendingRewards, isLoading: isLoadingAllRewards, refetch: refetchAllRewards } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury as `0x${string}`,
    abi: TREASURY_ABI,
    functionName: 'getAllPendingRewards',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
    },
  })

  const { data: usdcRewards, isLoading: isLoadingUsdcRewards } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury as `0x${string}`,
    abi: TREASURY_ABI,
    functionName: 'getPendingRewards',
    args: address ? [address as `0x${string}`, CONTRACT_ADDRESSES.rewardToken] : undefined,
    query: {
      enabled: !!address && hasValidUsdcAddress,
    },
  })

  const { data: ethBalance, isLoading: isLoadingETH } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury as `0x${string}`,
    abi: TREASURY_ABI,
    functionName: 'treasuryBalanceETH',
  })

  const { data: usdcBalance, isLoading: isLoadingUSDC } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury as `0x${string}`,
    abi: TREASURY_ABI,
    functionName: 'treasuryBalanceToken',
    args: [CONTRACT_ADDRESSES.rewardToken],
    query: {
      enabled: hasValidUsdcAddress,
    },
  })

  const { data: totalETHCollected } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury as `0x${string}`,
    abi: TREASURY_ABI,
    functionName: 'totalETHCollected',
  })

  const { data: totalUSDCDistributed } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury as `0x${string}`,
    abi: TREASURY_ABI,
    functionName: 'totalTokenDistributed',
    args: [CONTRACT_ADDRESSES.rewardToken],
    query: {
      enabled: hasValidUsdcAddress,
    },
  })

  const pendingRewardsTuple = allPendingRewards as [`0x${string}`[], bigint[]] | undefined
  const supportedRewardTokens = new Set([(CONTRACT_ADDRESSES.rewardToken || '').toLowerCase()])
  const filteredPendingRewards = pendingRewardsTuple
    ? pendingRewardsTuple[0]
        .map((token, index) => ({ token, amount: pendingRewardsTuple[1][index] || 0n }))
        .filter((reward) => supportedRewardTokens.has(reward.token.toLowerCase()))
    : []

  return {
    pendingRewards: usdcRewards as bigint, // Keep for backward compatibility
    allPendingRewards: {
      tokens: filteredPendingRewards.map((reward) => reward.token),
      amounts: filteredPendingRewards.map((reward) => reward.amount),
    },
    ethBalance: ethBalance as bigint,
    joybBalance: usdcBalance as bigint,
    totalETHCollected: totalETHCollected as bigint,
    totalJOYBDistributed: totalUSDCDistributed as bigint,
    isLoading: isLoadingAllRewards || isLoadingUsdcRewards || isLoadingETH || isLoadingUSDC,
    refetch: refetchAllRewards,
  }
}
