import { useAccount, usePublicClient, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { CONTRACT_ADDRESSES } from '../contracts/addresses'
import { MATCH3_GAME_ABI } from '../contracts/abis'
import { useState } from 'react'
import { erc20Abi, maxUint256 } from 'viem'

type PaymentSource = 'wallet' | 'deposit'

type BoosterType = 'hammer' | 'shuffle' | 'colorBomb'

const BOOSTER_TYPE_MAP: Record<BoosterType, number> = {
  hammer: 0,
  shuffle: 1,
  colorBomb: 2,
}

export function useMatch3Game() {
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const { address } = useAccount()
  const publicClient = usePublicClient()

  const { writeContractAsync: gameWrite, isPending } = useWriteContract()

  const { isLoading: isStartConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const ensureUsdcAllowance = async (amount: bigint) => {
    if (!publicClient || !address || amount <= 0n) return

    const allowance = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.rewardToken as `0x${string}`,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [address as `0x${string}`, CONTRACT_ADDRESSES.treasury as `0x${string}`],
    })

    if (allowance >= amount) return

    const approvalHash = await gameWrite({
      address: CONTRACT_ADDRESSES.rewardToken as `0x${string}`,
      abi: erc20Abi,
      functionName: 'approve',
      args: [CONTRACT_ADDRESSES.treasury as `0x${string}`, maxUint256],
    })

    await publicClient.waitForTransactionReceipt({ hash: approvalHash })
  }

  const startGame = async (_level: number, value?: bigint) => {
    await ensureUsdcAllowance(value || 0n)

    const hash = await gameWrite({
      address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
      abi: MATCH3_GAME_ABI,
      functionName: 'startGame',
      args: [CONTRACT_ADDRESSES.rewardToken as `0x${string}`, false],
      value: 0n,
    })
    setTxHash(hash)
    return hash
  }

  const continueLevel = async (sessionId: bigint, value?: bigint) => {
    await ensureUsdcAllowance(value || 0n)

    const hash = await gameWrite({
      address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
      abi: MATCH3_GAME_ABI,
      functionName: 'continueLevel',
      args: [sessionId, false],
      value: 0n,
    })
    setTxHash(hash)
    return hash
  }

  const completeLevel = async (sessionId: bigint, reward: bigint, signature: `0x${string}`) => {
    const hash = await gameWrite({
      address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
      abi: MATCH3_GAME_ABI,
      functionName: 'completeLevel',
      args: [sessionId, reward, signature],
    })
    setTxHash(hash)
    return hash
  }

  const buyBooster = async (
    type: BoosterType,
    isPack: boolean,
    value: bigint,
    paymentSource: PaymentSource = 'wallet',
  ) => {
    const useDeposit = paymentSource === 'deposit'

    if (!useDeposit) {
      await ensureUsdcAllowance(value)
    }

    const hash = await gameWrite({
      address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
      abi: MATCH3_GAME_ABI,
      functionName: 'buyBooster',
      args: [BOOSTER_TYPE_MAP[type], isPack, CONTRACT_ADDRESSES.rewardToken as `0x${string}`, useDeposit],
      value: 0n,
    })
    setTxHash(hash)
    return hash
  }

  const buyHammer = (value: bigint, paymentSource?: PaymentSource) =>
    buyBooster('hammer', false, value, paymentSource)
  const buyShuffle = (value: bigint, paymentSource?: PaymentSource) =>
    buyBooster('shuffle', false, value, paymentSource)
  const buyColorBomb = (value: bigint, paymentSource?: PaymentSource) =>
    buyBooster('colorBomb', false, value, paymentSource)
  const buyHammerPack = (value: bigint, paymentSource?: PaymentSource) =>
    buyBooster('hammer', true, value, paymentSource)
  const buyShufflePack = (value: bigint, paymentSource?: PaymentSource) =>
    buyBooster('shuffle', true, value, paymentSource)
  const buyColorBombPack = (value: bigint, paymentSource?: PaymentSource) =>
    buyBooster('colorBomb', true, value, paymentSource)

  return {
    startGame,
    continueLevel,
    completeLevel,
    isStarting: isPending || isStartConfirming,
    isCompleting: isPending,
    buyHammer,
    buyShuffle,
    buyColorBomb,
    buyHammerPack,
    buyShufflePack,
    buyColorBombPack,
    isBuying: false,
    txHash,
  }
}

export function useMatch3GameData(address?: string) {
  const { data: hammerPrice, refetch: refetchHammerPrice } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
    abi: MATCH3_GAME_ABI,
    functionName: 'hammerPrice',
  })

  const { data: shufflePrice, refetch: refetchShufflePrice } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
    abi: MATCH3_GAME_ABI,
    functionName: 'shufflePrice',
  })

  const { data: colorBombPrice, refetch: refetchColorBombPrice } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
    abi: MATCH3_GAME_ABI,
    functionName: 'colorBombPrice',
  })

  const { data: hammerPackPrice, refetch: refetchHammerPackPrice } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
    abi: MATCH3_GAME_ABI,
    functionName: 'hammerPackPrice',
  })

  const { data: shufflePackPrice, refetch: refetchShufflePackPrice } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
    abi: MATCH3_GAME_ABI,
    functionName: 'shufflePackPrice',
  })

  const { data: colorBombPackPrice, refetch: refetchColorBombPackPrice } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
    abi: MATCH3_GAME_ABI,
    functionName: 'colorBombPackPrice',
  })

  const { data: nextSessionId, isLoading: isLoadingSession, refetch: refetchSession } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
    abi: MATCH3_GAME_ABI,
    functionName: 'nextSessionId',
  })

  const { data: playFee, isLoading: isLoadingFee, refetch: refetchPlayFee } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
    abi: MATCH3_GAME_ABI,
    functionName: 'playFee',
  })

  const { data: continueFee, isLoading: isLoadingContinueFee, refetch: refetchContinueFee } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
    abi: MATCH3_GAME_ABI,
    functionName: 'continueFee',
  })

  const { data: maxReward, refetch: refetchMaxReward } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
    abi: MATCH3_GAME_ABI,
    functionName: 'maxReward',
  })

  const { data: maxContinues } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
    abi: MATCH3_GAME_ABI,
    functionName: 'maxContinues',
  })

  const { data: sessionDuration } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
    abi: MATCH3_GAME_ABI,
    functionName: 'sessionDuration',
  })

  const { data: treasury } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
    abi: MATCH3_GAME_ABI,
    functionName: 'treasury',
  })

  const { data: signer } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
    abi: MATCH3_GAME_ABI,
    functionName: 'signer',
  })

  const { data: owner } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
    abi: MATCH3_GAME_ABI,
    functionName: 'owner',
  })

  return {
    playerData: undefined,
    canPlayFree: false,
    playFee: playFee as bigint,
    continueFee: continueFee as bigint,
    maxReward: maxReward as bigint,
    maxContinues: maxContinues as number,
    sessionDuration: sessionDuration as bigint,
    nextSessionId: nextSessionId as bigint,
    treasury: treasury as `0x${string}`,
    signer: signer as `0x${string}`,
    owner: owner as `0x${string}`,
    boosterPrices: {
      hammer: (hammerPrice as bigint) || 0n,
      shuffle: (shufflePrice as bigint) || 0n,
      colorBomb: (colorBombPrice as bigint) || 0n,
      hammerPack: (hammerPackPrice as bigint) || 0n,
      shufflePack: (shufflePackPrice as bigint) || 0n,
      colorBombPack: (colorBombPackPrice as bigint) || 0n,
    },
    isLoading: isLoadingSession || isLoadingFee || isLoadingContinueFee,
    refetch: () => {
      refetchSession()
      refetchPlayFee()
      refetchContinueFee()
      refetchMaxReward()
      refetchHammerPrice()
      refetchShufflePrice()
      refetchColorBombPrice()
      refetchHammerPackPrice()
      refetchShufflePackPrice()
      refetchColorBombPackPrice()
    },
  }
}

