'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { formatEther, formatUnits, isAddress, parseEther, parseUnits, zeroAddress } from 'viem'
import { AudioButtons } from '@/components/AudioButtons'
import { Logo } from '@/components/Logo'
import { WalletButton } from '@/components/WalletButton'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { MATCH3_GAME_ABI, TREASURY_ABI } from '@/lib/contracts/abis'

type SeasonalEpoch = {
  id: number
  period: 'weekly' | 'monthly'
  status: string
  tokenAddress: string
  tokenDecimals: number
  budgetRaw: string
  startAt: number
  endAt: number
}

const ERC20_META_ABI = [
  {
    type: 'function',
    stateMutability: 'view',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const

function formatTokenAmount(value: bigint, decimals: number) {
  const [intPart, decimalPart = ''] = formatUnits(value, decimals).split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const trimmed = decimalPart.slice(0, 6).replace(/0+$/, '')
  return trimmed ? `${grouped}.${trimmed}` : grouped
}

function formatEpochPeriod(period: unknown): string {
  const normalized = typeof period === 'string' ? period.toLowerCase() : ''
  if (normalized === 'weekly' || normalized === 'monthly') return normalized.toUpperCase()
  return 'UNKNOWN'
}

function formatEpochDate(value: unknown): string {
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num) || num <= 0) return '-'
  return new Date(num).toLocaleString()
}

function formatRaw(value: bigint): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function getDecimalsForSymbol(symbol: string): number {
  return symbol.toUpperCase() === 'USDC' ? 6 : 18
}

function formatExactToken(value: bigint, symbol: string): string {
  const decimals = getDecimalsForSymbol(symbol)
  return `${formatUnits(value, decimals)} ${symbol}`
}

function formatDisplayToken(value: bigint, symbol: string, maxDecimals = 6): string {
  const decimals = getDecimalsForSymbol(symbol)
  const [intPart, decimalPart = ''] = formatUnits(value, decimals).split('.')
  const trimmed = decimalPart.slice(0, maxDecimals).replace(/0+$/, '')
  const groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${trimmed ? `${groupedInt}.${trimmed}` : groupedInt} ${symbol}`
}

function formatRawTokenAmount(raw: string | undefined, symbol: string, decimals = 18): string {
  if (!raw) return `0 ${symbol}`
  try {
    return `${formatUnits(BigInt(raw), decimals)} ${symbol}`
  } catch {
    return `0 ${symbol}`
  }
}

export default function AdminPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { writeContractAsync, isPending } = useWriteContract()

  const [mounted, setMounted] = useState(false)
  const [userFid, setUserFid] = useState<number | null>(null)
  const [isUnlocked, setIsUnlocked] = useState(false)

  const [newPlayFeeUsdc, setNewPlayFeeUsdc] = useState('0.5')
  const [newContinueFeeUsdc, setNewContinueFeeUsdc] = useState('0.25')
  const [newTreasuryAddress, setNewTreasuryAddress] = useState<string>(CONTRACT_ADDRESSES.treasury || '')
  const [newGameSignerAddress, setNewGameSignerAddress] = useState<string>(process.env.NEXT_PUBLIC_GAME_SIGNER_ADDRESS || '')
  const [newGameMaxRewardEth, setNewGameMaxRewardEth] = useState('1000')
  const [newMaxContinues, setNewMaxContinues] = useState('3')
  const [newGameOwnershipAddress, setNewGameOwnershipAddress] = useState<string>(address || '')
  const [newTreasuryOwnershipAddress, setNewTreasuryOwnershipAddress] = useState<string>(address || '')
  const [newAuthorizedGameAddress, setNewAuthorizedGameAddress] = useState<string>(CONTRACT_ADDRESSES.match3Game || '')
  const [newFeePercent, setNewFeePercent] = useState('5')
  const [withdrawEthAmount, setWithdrawEthAmount] = useState('0.01')
  const [withdrawTokenAmount, setWithdrawTokenAmount] = useState('10')
  const [seasonalPeriod, setSeasonalPeriod] = useState<'weekly' | 'monthly'>('weekly')
  const [seasonalTokenAddress] = useState<string>(CONTRACT_ADDRESSES.rewardToken || '')
  const [seasonalBudgetAmount, setSeasonalBudgetAmount] = useState('10')
  const [seasonalWinnersCount, setSeasonalWinnersCount] = useState('10')
  const [seasonalPayoutPercents, setSeasonalPayoutPercents] = useState('25,20,15,10,8,7,5,4,3,3')
  const [seasonalEpochId, setSeasonalEpochId] = useState('')
  const [seasonalFundAmount, setSeasonalFundAmount] = useState('10')
  const [adminSecret, setAdminSecret] = useState('')
  const [seasonalEpochs, setSeasonalEpochs] = useState<SeasonalEpoch[]>([])
  const [seasonalBusy, setSeasonalBusy] = useState(false)
  const [boosterBusy, setBoosterBusy] = useState(false)
  const [boosterFees, setBoosterFees] = useState({
    hammer: '0.1',
    shuffle: '0.2',
    colorBomb: '0.5',
    hammerPack: '0.5',
    shufflePack: '1',
    colorBombPack: '2.5',
  })
  const [tokenManageAddress, setTokenManageAddress] = useState('')
  const [tokenMinimumBalance, setTokenMinimumBalance] = useState('0')
  const [tokenManageBusy, setTokenManageBusy] = useState(false)
  const [leaderboardBusy, setLeaderboardBusy] = useState(false)
  const [fullResetBusy, setFullResetBusy] = useState(false)
  const [status, setStatus] = useState('')

  const adminWalletList = (process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESSES || process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
  const adminFid = Number(process.env.NEXT_PUBLIC_ADMIN_FARCASTER_FID || '0')
  const validMatch3Address = isAddress(CONTRACT_ADDRESSES.match3Game)
  const validTreasuryAddress = isAddress(CONTRACT_ADDRESSES.treasury)
  const validRewardTokenAddress = isAddress(CONTRACT_ADDRESSES.rewardToken)
  const match3Address = validMatch3Address ? CONTRACT_ADDRESSES.match3Game : zeroAddress
  const treasuryAddress = validTreasuryAddress ? CONTRACT_ADDRESSES.treasury : zeroAddress
  const rewardTokenAddress = validRewardTokenAddress ? CONTRACT_ADDRESSES.rewardToken : zeroAddress
  const validTokenManageAddress = isAddress(tokenManageAddress)
  const tokenManageAddressSafe = validTokenManageAddress ? tokenManageAddress as `0x${string}` : zeroAddress

  useEffect(() => {
    setMounted(true)

    if (typeof window !== 'undefined') {
      try {
        setIsUnlocked(window.sessionStorage.getItem('joybit_admin_unlock') === '1')
      } catch {
        setIsUnlocked(false)
      }
    }

    import('@farcaster/miniapp-sdk')
      .then(async ({ sdk }) => {
        try {
          const ctx = await sdk.context
          setUserFid(ctx?.user?.fid || null)
        } catch {
          setUserFid(null)
        }
      })
      .catch(() => setUserFid(null))
  }, [])

  const isAuthorized = useMemo(() => {
    const walletMatch = !!address && adminWalletList.includes(address.toLowerCase())
    const fidMatch = !!userFid && adminFid > 0 && userFid === adminFid
    return walletMatch || fidMatch
  }, [address, adminWalletList, userFid, adminFid])

  const { data: playFee, refetch: refetchPlayFee } = useReadContract({
    address: match3Address,
    abi: MATCH3_GAME_ABI,
    functionName: 'playFee',
    query: {
      enabled: validMatch3Address,
    },
  })

  const { data: continueFee, refetch: refetchContinueFee } = useReadContract({
    address: match3Address,
    abi: MATCH3_GAME_ABI,
    functionName: 'continueFee',
    query: {
      enabled: validMatch3Address,
    },
  })

  const { data: gameSigner, refetch: refetchGameSigner } = useReadContract({
    address: match3Address,
    abi: MATCH3_GAME_ABI,
    functionName: 'signer',
    query: {
      enabled: validMatch3Address,
    },
  })

  const { data: gameMaxReward, refetch: refetchGameMaxReward } = useReadContract({
    address: match3Address,
    abi: MATCH3_GAME_ABI,
    functionName: 'maxReward',
    query: {
      enabled: validMatch3Address,
    },
  })

  const { data: gameMaxContinues, refetch: refetchGameMaxContinues } = useReadContract({
    address: match3Address,
    abi: MATCH3_GAME_ABI,
    functionName: 'maxContinues',
    query: {
      enabled: validMatch3Address,
    },
  })

  const { data: gameSessionDuration, refetch: refetchGameSessionDuration } = useReadContract({
    address: match3Address,
    abi: MATCH3_GAME_ABI,
    functionName: 'sessionDuration',
    query: {
      enabled: validMatch3Address,
    },
  })

  const { data: hammerPriceRaw, refetch: refetchHammerPrice } = useReadContract({
    address: match3Address,
    abi: MATCH3_GAME_ABI,
    functionName: 'hammerPrice',
    query: {
      enabled: validMatch3Address,
    },
  })

  const { data: shufflePriceRaw, refetch: refetchShufflePrice } = useReadContract({
    address: match3Address,
    abi: MATCH3_GAME_ABI,
    functionName: 'shufflePrice',
    query: {
      enabled: validMatch3Address,
    },
  })

  const { data: colorBombPriceRaw, refetch: refetchColorBombPrice } = useReadContract({
    address: match3Address,
    abi: MATCH3_GAME_ABI,
    functionName: 'colorBombPrice',
    query: {
      enabled: validMatch3Address,
    },
  })

  const { data: hammerPackPriceRaw, refetch: refetchHammerPackPrice } = useReadContract({
    address: match3Address,
    abi: MATCH3_GAME_ABI,
    functionName: 'hammerPackPrice',
    query: {
      enabled: validMatch3Address,
    },
  })

  const { data: shufflePackPriceRaw, refetch: refetchShufflePackPrice } = useReadContract({
    address: match3Address,
    abi: MATCH3_GAME_ABI,
    functionName: 'shufflePackPrice',
    query: {
      enabled: validMatch3Address,
    },
  })

  const { data: colorBombPackPriceRaw, refetch: refetchColorBombPackPrice } = useReadContract({
    address: match3Address,
    abi: MATCH3_GAME_ABI,
    functionName: 'colorBombPackPrice',
    query: {
      enabled: validMatch3Address,
    },
  })

  const { data: gameOwner, refetch: refetchGameOwner } = useReadContract({
    address: match3Address,
    abi: MATCH3_GAME_ABI,
    functionName: 'owner',
    query: {
      enabled: validMatch3Address,
    },
  })

  const { data: treasuryEthBalance, refetch: refetchTreasuryEth } = useReadContract({
    address: treasuryAddress,
    abi: TREASURY_ABI,
    functionName: 'treasuryBalanceETH',
    query: {
      enabled: validTreasuryAddress,
    },
  })

  const { data: treasuryRewardTokenBalance, refetch: refetchTreasuryRewardToken } = useReadContract({
    address: treasuryAddress,
    abi: TREASURY_ABI,
    functionName: 'treasuryBalanceToken',
    args: [rewardTokenAddress],
    query: {
      enabled: validTreasuryAddress && validRewardTokenAddress,
    },
  })

  const { data: treasuryRewardPool, refetch: refetchTreasuryRewardPool } = useReadContract({
    address: treasuryAddress,
    abi: TREASURY_ABI,
    functionName: 'rewardPool',
    args: [rewardTokenAddress],
    query: {
      enabled: validTreasuryAddress && validRewardTokenAddress,
    },
  })

  const { data: treasuryProtocolFees, refetch: refetchTreasuryProtocolFees } = useReadContract({
    address: treasuryAddress,
    abi: TREASURY_ABI,
    functionName: 'protocolFees',
    args: [rewardTokenAddress],
    query: {
      enabled: validTreasuryAddress && validRewardTokenAddress,
    },
  })

  const { data: treasuryFeePercent, refetch: refetchTreasuryFeePercent } = useReadContract({
    address: treasuryAddress,
    abi: TREASURY_ABI,
    functionName: 'feePercent',
    query: {
      enabled: validTreasuryAddress,
    },
  })

  const { data: treasuryOwner, refetch: refetchTreasuryOwner } = useReadContract({
    address: treasuryAddress,
    abi: TREASURY_ABI,
    functionName: 'owner',
    query: {
      enabled: validTreasuryAddress,
    },
  })

  const validAuthorizedGameAddress = isAddress(newAuthorizedGameAddress)
  const authorizedGameAddress = validAuthorizedGameAddress ? newAuthorizedGameAddress as `0x${string}` : zeroAddress
  const { data: authorizedGameEnabled, refetch: refetchAuthorizedGame } = useReadContract({
    address: treasuryAddress,
    abi: TREASURY_ABI,
    functionName: 'authorizedGames',
    args: [authorizedGameAddress],
    query: {
      enabled: validTreasuryAddress && validAuthorizedGameAddress,
    },
  })

  const { data: supportedTokens, refetch: refetchSupportedTokens } = useReadContract({
    address: treasuryAddress,
    abi: TREASURY_ABI,
    functionName: 'getSupportedTokens',
    query: {
      enabled: validTreasuryAddress,
    },
  })

  const { data: tokenManageDecimalsData } = useReadContract({
    address: tokenManageAddressSafe,
    abi: ERC20_META_ABI,
    functionName: 'decimals',
    query: {
      enabled: validTokenManageAddress,
    },
  })

  const { data: rewardTokenDecimalsData } = useReadContract({
    address: rewardTokenAddress,
    abi: ERC20_META_ABI,
    functionName: 'decimals',
    query: {
      enabled: validRewardTokenAddress,
    },
  })

  const handleUpdatePlayFee = async () => {
    try {
      setStatus('Submitting play fee update...')
      const fee = parseUnits(newPlayFeeUsdc || '0', 6)
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.match3Game,
        abi: MATCH3_GAME_ABI,
        functionName: 'setPlayFee',
        args: [fee],
      })
      await refetchPlayFee()
      setStatus('Play fee updated successfully.')
    } catch (error) {
      setStatus(`Play fee update failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleUpdateContinueFee = async () => {
    try {
      setStatus('Submitting continue fee update...')
      const fee = parseUnits(newContinueFeeUsdc || '0', 6)
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.match3Game,
        abi: MATCH3_GAME_ABI,
        functionName: 'setContinueFee',
        args: [fee],
      })
      await refetchContinueFee()
      setStatus('Continue fee updated successfully.')
    } catch (error) {
      setStatus(`Continue fee update failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleSetTreasuryContract = async () => {
    try {
      if (!isAddress(newTreasuryAddress)) {
        setStatus('Invalid treasury address format.')
        return
      }

      setStatus('Submitting treasury address update...')
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.match3Game,
        abi: MATCH3_GAME_ABI,
        functionName: 'setTreasury',
        args: [newTreasuryAddress as `0x${string}`],
      })
      setStatus('Treasury address updated successfully.')
    } catch (error) {
      setStatus(`Treasury update failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleWithdrawEth = async () => {
    try {
      setStatus('Submitting ETH rescue...')
      const amount = parseEther(withdrawEthAmount || '0')
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.treasury,
        abi: TREASURY_ABI,
        functionName: 'rescueETH',
        args: [address || zeroAddress, amount],
      })
      await refetchTreasuryEth()
      setStatus('Accidental ETH rescued successfully.')
    } catch (error) {
      setStatus(`ETH rescue failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleWithdrawRewardToken = async () => {
    try {
      if (!isAddress(CONTRACT_ADDRESSES.rewardToken)) {
        setStatus('USDC address is invalid or missing in env.')
        return
      }

      setStatus('Filling reward pool with USDC...')
      const rewardTokenDecimals = Number(rewardTokenDecimalsData ?? 6)
      const amount = parseUnits(withdrawTokenAmount || '0', rewardTokenDecimals)
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.treasury,
        abi: TREASURY_ABI,
        functionName: 'fundRewardPool',
        args: [amount],
      })
      await refetchTreasuryRewardPool()
      await refetchTreasuryRewardToken()
      setStatus('Reward pool funded successfully.')
    } catch (error) {
      setStatus(`Reward pool funding failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleRescueToken = async () => {
    if (!isAddress(tokenManageAddress)) {
      setStatus('Token address format is invalid.')
      return
    }

    setTokenManageBusy(true)
    try {
      const decimals = Number(tokenManageDecimalsData ?? 18)
      const minimumRaw = parseUnits(tokenMinimumBalance || '0', decimals)
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.treasury,
        abi: TREASURY_ABI,
        functionName: 'rescueToken',
        args: [tokenManageAddress as `0x${string}`, address || zeroAddress, minimumRaw],
      })
      setStatus('Accidental token rescued successfully.')
    } catch (error) {
      setStatus(`Token rescue failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setTokenManageBusy(false)
    }
  }

  const handleSetGameSigner = async () => {
    if (!isAddress(newGameSignerAddress)) {
      setStatus('Game signer address format is invalid.')
      return
    }

    try {
      setStatus('Updating game signer...')
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.match3Game,
        abi: MATCH3_GAME_ABI,
        functionName: 'setSigner',
        args: [newGameSignerAddress as `0x${string}`],
      })
      await refetchGameSigner()
      setStatus('Game signer updated successfully.')
    } catch (error) {
      setStatus(`Set signer failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleSetGameMaxReward = async () => {
    try {
      setStatus('Updating max reward...')
      const amount = parseUnits(newGameMaxRewardEth || '0', 6)
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.match3Game,
        abi: MATCH3_GAME_ABI,
        functionName: 'setMaxReward',
        args: [amount],
      })
      await refetchGameMaxReward()
      setStatus('Max reward updated successfully.')
    } catch (error) {
      setStatus(`Set max reward failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleSetMaxContinues = async () => {
    try {
      const maxContinues = Number(newMaxContinues || '0')
      if (!Number.isFinite(maxContinues) || maxContinues < 0 || maxContinues > 255) {
        setStatus('Max continues must be a whole number between 0 and 255.')
        return
      }

      const sessionDuration = (gameSessionDuration as bigint) || 0n
      if (sessionDuration <= 0n) {
        setStatus('Session duration is not loaded yet. Please retry in a moment.')
        return
      }

      setStatus('Updating max continues...')
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.match3Game,
        abi: MATCH3_GAME_ABI,
        functionName: 'setSessionConfig',
        args: [maxContinues, sessionDuration],
      })
      await Promise.all([refetchGameMaxContinues(), refetchGameSessionDuration()])
      setStatus('Max continues updated successfully.')
    } catch (error) {
      setStatus(`Set max continues failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handlePauseGame = async () => {
    try {
      setStatus('Pausing game...')
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.match3Game,
        abi: MATCH3_GAME_ABI,
        functionName: 'pause',
      })
      setStatus('Game paused successfully.')
    } catch (error) {
      setStatus(`Pause game failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleUnpauseGame = async () => {
    try {
      setStatus('Unpausing game...')
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.match3Game,
        abi: MATCH3_GAME_ABI,
        functionName: 'unpause',
      })
      setStatus('Game unpaused successfully.')
    } catch (error) {
      setStatus(`Unpause game failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleTransferGameOwnership = async () => {
    if (!isAddress(newGameOwnershipAddress)) {
      setStatus('Game owner address format is invalid.')
      return
    }

    try {
      setStatus('Transferring game ownership...')
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.match3Game,
        abi: MATCH3_GAME_ABI,
        functionName: 'transferOwnership',
        args: [newGameOwnershipAddress as `0x${string}`],
      })
      await refetchGameOwner()
      setStatus('Game ownership transferred successfully.')
    } catch (error) {
      setStatus(`Game ownership transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleRenounceGameOwnership = async () => {
    try {
      setStatus('Renouncing game ownership...')
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.match3Game,
        abi: MATCH3_GAME_ABI,
        functionName: 'renounceOwnership',
      })
      await refetchGameOwner()
      setStatus('Game ownership renounced successfully.')
    } catch (error) {
      setStatus(`Game ownership renounce failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleSetAuthorizedGame = async (status: boolean) => {
    if (!isAddress(newAuthorizedGameAddress)) {
      setStatus('Authorized game address format is invalid.')
      return
    }

    try {
      setStatus(`${status ? 'Authorizing' : 'Revoking'} treasury access for game...`)
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.treasury,
        abi: TREASURY_ABI,
        functionName: 'setAuthorizedGame',
        args: [newAuthorizedGameAddress as `0x${string}`, status],
      })
      await refetchAuthorizedGame()
      setStatus(`Treasury game authorization ${status ? 'enabled' : 'revoked'} successfully.`)
    } catch (error) {
      setStatus(`Set authorized game failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleSetTreasuryFeePercent = async () => {
    try {
      const percent = Number(newFeePercent || '0')
      if (!Number.isFinite(percent) || percent < 0) {
        setStatus('Fee percent must be a non-negative number.')
        return
      }

      setStatus('Updating treasury fee percent...')
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.treasury,
        abi: TREASURY_ABI,
        functionName: 'setFeePercent',
        args: [BigInt(Math.floor(percent))],
      })
      await refetchTreasuryFeePercent()
      setStatus('Treasury fee percent updated successfully.')
    } catch (error) {
      setStatus(`Set fee percent failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handlePauseTreasury = async () => {
    try {
      setStatus('Pausing treasury...')
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.treasury,
        abi: TREASURY_ABI,
        functionName: 'pause',
      })
      setStatus('Treasury paused successfully.')
    } catch (error) {
      setStatus(`Pause treasury failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleUnpauseTreasury = async () => {
    try {
      setStatus('Unpausing treasury...')
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.treasury,
        abi: TREASURY_ABI,
        functionName: 'unpause',
      })
      setStatus('Treasury unpaused successfully.')
    } catch (error) {
      setStatus(`Unpause treasury failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleTransferTreasuryOwnership = async () => {
    if (!isAddress(newTreasuryOwnershipAddress)) {
      setStatus('Treasury owner address format is invalid.')
      return
    }

    try {
      setStatus('Transferring treasury ownership...')
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.treasury,
        abi: TREASURY_ABI,
        functionName: 'transferOwnership',
        args: [newTreasuryOwnershipAddress as `0x${string}`],
      })
      await refetchTreasuryOwner()
      setStatus('Treasury ownership transferred successfully.')
    } catch (error) {
      setStatus(`Treasury ownership transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleRenounceTreasuryOwnership = async () => {
    try {
      setStatus('Renouncing treasury ownership...')
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.treasury,
        abi: TREASURY_ABI,
        functionName: 'renounceOwnership',
      })
      await refetchTreasuryOwner()
      setStatus('Treasury ownership renounced successfully.')
    } catch (error) {
      setStatus(`Treasury ownership renounce failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleWithdrawProtocolEth = async () => {
    try {
      setStatus('Withdrawing accidental ETH balance...')
      const amount = parseEther(withdrawEthAmount || '0')
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.treasury,
        abi: TREASURY_ABI,
        functionName: 'rescueETH',
        args: [address || zeroAddress, amount],
      })
      await refetchTreasuryEth()
      setStatus('Accidental ETH balance rescued successfully.')
    } catch (error) {
      setStatus(`ETH rescue failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleWithdrawProtocolUsdc = async () => {
    try {
      if (!isAddress(CONTRACT_ADDRESSES.rewardToken)) {
        setStatus('USDC address is invalid or missing in env.')
        return
      }

      setStatus('Withdrawing USDC protocol fees...')
      const rewardTokenDecimals = Number(rewardTokenDecimalsData ?? 6)
      const amount = parseUnits(withdrawTokenAmount || '0', rewardTokenDecimals)
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.treasury,
        abi: TREASURY_ABI,
        functionName: 'withdrawProtocolFees',
        args: [CONTRACT_ADDRESSES.rewardToken, amount],
      })
      await refetchTreasuryRewardToken()
      await refetchTreasuryProtocolFees()
      setStatus('USDC protocol fees withdrawn successfully.')
    } catch (error) {
      setStatus(`USDC protocol fee withdraw failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const fetchSeasonalEpochs = async () => {
    try {
      const response = await fetch('/api/rewards/epochs')
      if (!response.ok) {
        setSeasonalEpochs([])
        return
      }

      const data = await response.json()
      const nextEpochs = Array.isArray(data?.latestEpochs) ? data.latestEpochs : []
      setSeasonalEpochs(nextEpochs)
    } catch (error) {
      console.error('Failed to fetch seasonal epochs:', error)
      setSeasonalEpochs([])
    }
  }

  const handleSaveBoosterFees = async () => {
    setBoosterBusy(true)
    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.match3Game,
        abi: MATCH3_GAME_ABI,
        functionName: 'setBoosterPrices',
        args: [
          parseUnits(boosterFees.hammer || '0', 6),
          parseUnits(boosterFees.shuffle || '0', 6),
          parseUnits(boosterFees.colorBomb || '0', 6),
          parseUnits(boosterFees.hammerPack || '0', 6),
          parseUnits(boosterFees.shufflePack || '0', 6),
          parseUnits(boosterFees.colorBombPack || '0', 6),
        ],
      })

      await Promise.all([
        refetchHammerPrice(),
        refetchShufflePrice(),
        refetchColorBombPrice(),
        refetchHammerPackPrice(),
        refetchShufflePackPrice(),
        refetchColorBombPackPrice(),
      ])
      setStatus('On-chain booster fees updated successfully.')
    } catch {
      setStatus('Invalid booster fee values. Please check your inputs.')
    } finally {
      setBoosterBusy(false)
    }
  }

  const callSeasonalAction = async (payload: Record<string, unknown>, successMessage: string) => {
    setSeasonalBusy(true)
    try {
      const response = await fetch('/api/rewards/epochs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminSecret ? { 'x-admin-secret': adminSecret } : {}),
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (!response.ok) {
        setStatus(data?.error || 'Seasonal rewards action failed.')
        return
      }

      setStatus(successMessage)
      await fetchSeasonalEpochs()
    } catch (error) {
      setStatus(`Seasonal rewards action failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSeasonalBusy(false)
    }
  }

  const handleFullDatabaseReset = async () => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        'FULL DATABASE RESET\n\nThis will permanently delete:\n• All leaderboard scores\n• All player stats\n• All seasonal reward epochs, allocations and fundings\n\nThis cannot be undone. Are you absolutely sure?'
      )
      if (!confirmed) return
      const doubleConfirm = window.confirm('Last chance — delete everything and start fresh?')
      if (!doubleConfirm) return
    }

    setFullResetBusy(true)
    try {
      const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminSecret ? { 'x-admin-secret': adminSecret } : {}),
        },
        body: JSON.stringify({ action: 'reset-all' }),
      })

      const data = await response.json()
      if (!response.ok) {
        setStatus(data?.error || 'Full database reset failed.')
        return
      }

      setSeasonalEpochs([])
      setStatus('Full database reset complete. All tables are now empty.')
    } catch (error) {
      setStatus(`Full database reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setFullResetBusy(false)
    }
  }

  const handleResetLeaderboard = async () => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('Reset the entire leaderboard database? This clears all scores and user metadata and cannot be undone.')
      if (!confirmed) return
    }

    setLeaderboardBusy(true)
    try {
      const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminSecret ? { 'x-admin-secret': adminSecret } : {}),
        },
        body: JSON.stringify({ action: 'reset' }),
      })

      const data = await response.json()
      if (!response.ok) {
        setStatus(data?.error || 'Leaderboard reset failed.')
        return
      }

      setStatus('Leaderboard reset successfully.')
    } catch (error) {
      setStatus(`Leaderboard reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLeaderboardBusy(false)
    }
  }

  const getTokenSymbol = (tokenAddress: string) => {
    const normalized = tokenAddress.toLowerCase()
    if (normalized === zeroAddress.toLowerCase()) return 'ETH'
    if (normalized === (CONTRACT_ADDRESSES.rewardToken || '').toLowerCase()) return 'USDC'
    return 'TOKEN'
  }

  const handleFinalizeEpoch = () => {
    try {
      const decimals = Number(rewardTokenDecimalsData ?? 6)
      const winnersCount = Math.max(1, Math.min(100, Number(seasonalWinnersCount || '10')))
      const payoutPercents = seasonalPayoutPercents
        .split(',')
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isFinite(value) && value >= 0)

      if (payoutPercents.length !== winnersCount) {
        setStatus(`Payout split must contain exactly ${winnersCount} values.`)
        return
      }

      const totalPercent = payoutPercents.reduce((acc, value) => acc + value, 0)
      if (Math.abs(totalPercent - 100) > 0.0001) {
        setStatus(`Payout split must total 100. Current total: ${totalPercent.toFixed(2)}`)
        return
      }

      const budgetRaw = parseUnits(seasonalBudgetAmount || '0', decimals).toString()
      if (BigInt(budgetRaw) <= 0n) {
        setStatus('Budget amount must be greater than 0.')
        return
      }

      callSeasonalAction({
        action: 'finalize',
        period: seasonalPeriod,
        tokenAddress: rewardTokenAddress,
        tokenDecimals: decimals,
        budgetRaw,
        winnersCount,
        payoutPercents,
      }, `${seasonalPeriod} epoch finalized successfully.`)
    } catch {
      setStatus('Invalid budget amount. Use a valid decimal number, e.g. 100 or 12.5')
    }
  }

  const handleFundEpoch = () => {
    if (!seasonalEpochId || Number(seasonalEpochId) <= 0) {
      setStatus('Enter a valid Epoch ID before funding.')
      return
    }

    try {
      const decimals = Number(rewardTokenDecimalsData ?? 6)
      const amountRaw = parseUnits(seasonalFundAmount || '0', decimals).toString()
      if (BigInt(amountRaw) <= 0n) {
        setStatus('Fund amount must be greater than 0.')
        return
      }

      callSeasonalAction({
        action: 'fund',
        epochId: Number(seasonalEpochId),
        tokenAddress: rewardTokenAddress,
        amountRaw,
        fundedBy: address || '',
      }, 'Seasonal epoch funding recorded.')
    } catch {
      setStatus('Invalid fund amount. Use a valid decimal number, e.g. 10 or 0.5')
    }
  }

  const handleDistributeEpoch = () => {
    if (!seasonalEpochId || Number(seasonalEpochId) <= 0) {
      setStatus('Enter a valid Epoch ID before distribution.')
      return
    }

    callSeasonalAction({
      action: 'distribute',
      epochId: Number(seasonalEpochId),
    }, 'Seasonal epoch marked distributed.')
  }

  const handleDeleteEpoch = (epochIdInput?: number) => {
    const parsedEpochId = epochIdInput ?? Number(seasonalEpochId)
    if (!Number.isFinite(parsedEpochId) || parsedEpochId <= 0) {
      setStatus('Enter a valid Epoch ID before deleting.')
      return
    }

    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`Delete epoch #${parsedEpochId}? This permanently removes the epoch, allocations, and funding records.`)
      if (!confirmed) return
    }

    callSeasonalAction({
      action: 'delete-epoch',
      epochId: parsedEpochId,
    }, `Seasonal epoch #${parsedEpochId} deleted.`)
  }

  useEffect(() => {
    fetchSeasonalEpochs()
  }, [])

  useEffect(() => {
    setBoosterFees({
      hammer: formatUnits((hammerPriceRaw as bigint) || 0n, 6),
      shuffle: formatUnits((shufflePriceRaw as bigint) || 0n, 6),
      colorBomb: formatUnits((colorBombPriceRaw as bigint) || 0n, 6),
      hammerPack: formatUnits((hammerPackPriceRaw as bigint) || 0n, 6),
      shufflePack: formatUnits((shufflePackPriceRaw as bigint) || 0n, 6),
      colorBombPack: formatUnits((colorBombPackPriceRaw as bigint) || 0n, 6),
    })
  }, [hammerPriceRaw, shufflePriceRaw, colorBombPriceRaw, hammerPackPriceRaw, shufflePackPriceRaw, colorBombPackPriceRaw])

  const playFeeValue = (playFee as bigint) || 0n
  const continueFeeValue = (continueFee as bigint) || 0n
  const ethTreasuryValue = (treasuryEthBalance as bigint) || 0n
  const rewardTreasuryValue = (treasuryRewardTokenBalance as bigint) || 0n
  const rewardPoolValue = (treasuryRewardPool as bigint) || 0n
  const protocolFeesValue = (treasuryProtocolFees as bigint) || 0n
  const rewardTokenDecimals = Number(rewardTokenDecimalsData ?? 6)

  if (!mounted) return null

  if (!isConnected || !isUnlocked || !isAuthorized) {
    return (
      <main className="min-h-screen px-4 py-5" style={{ backgroundColor: 'var(--theme-background)', color: 'var(--theme-text)' }}>
        <div className="fixed right-3 top-3 z-50 flex items-center gap-2">
          <WalletButton />
        </div>

        <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center">
          <section className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-6 text-center">
            <h1 className="mb-2 text-2xl font-black">Admin Access Locked</h1>
            <p className="text-sm text-gray-400">
              Connect with an authorized wallet/FID and unlock from the home logo tap sequence.
            </p>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="theme-button-brand mt-4 rounded-lg px-4 py-2 text-sm font-bold"
            >
              Back Home
            </button>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-4 py-5" style={{ backgroundColor: 'var(--theme-background)', color: 'var(--theme-text)' }}>
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/45 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Logo size="small" />
          <div className="flex items-center gap-2">
            <AudioButtons splitButtons />
            <WalletButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl pt-20">
        <div className="mb-6 flex items-center justify-between">
          <button type="button" onClick={() => router.push('/')} className="theme-button-brand-soft rounded-lg px-4 py-2 text-sm font-semibold">
            Back
          </button>
          <h1 className="text-2xl font-black">Admin Panel</h1>
          <div className="w-16" />
        </div>

        <div className="space-y-4">
          <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="mb-4 text-lg font-bold">Operations Overview</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <div className="text-xs uppercase tracking-wide text-gray-400">Play Fee</div>
                <div className="mt-1 text-sm font-bold text-white">{formatDisplayToken(playFeeValue, 'USDC')}</div>
                <div className="mt-1 font-mono text-[11px] text-gray-500">Exact: {formatExactToken(playFeeValue, 'USDC')}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <div className="text-xs uppercase tracking-wide text-gray-400">Continue Fee</div>
                <div className="mt-1 text-sm font-bold text-white">{formatDisplayToken(continueFeeValue, 'USDC')}</div>
                <div className="mt-1 font-mono text-[11px] text-gray-500">Exact: {formatExactToken(continueFeeValue, 'USDC')}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <div className="text-xs uppercase tracking-wide text-gray-400">USDC Reward Pool</div>
                <div className="mt-1 text-sm font-bold text-white">{formatTokenAmount(rewardPoolValue, rewardTokenDecimals)} USDC</div>
                <div className="mt-1 font-mono text-[11px] text-gray-500">Exact: {formatUnits(rewardPoolValue, rewardTokenDecimals)} USDC</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <div className="text-xs uppercase tracking-wide text-gray-400">USDC Protocol Fees</div>
                <div className="mt-1 text-sm font-bold text-white">{formatTokenAmount(protocolFeesValue, rewardTokenDecimals)} USDC</div>
                <div className="mt-1 font-mono text-[11px] text-gray-500">Exact: {formatUnits(protocolFeesValue, rewardTokenDecimals)} USDC</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <div className="text-xs uppercase tracking-wide text-gray-400">Accidental ETH Balance</div>
                <div className="mt-1 text-sm font-bold text-white">{formatDisplayToken(ethTreasuryValue, 'ETH')}</div>
                <div className="mt-1 font-mono text-[11px] text-gray-500">Exact: {formatExactToken(ethTreasuryValue, 'ETH')}</div>
              </div>
            </div>

            <div className="mt-4 grid gap-2 text-xs text-gray-400">
              <div className="rounded border border-white/10 bg-black/30 px-3 py-2 break-all">Joybit Blast: {CONTRACT_ADDRESSES.match3Game || 'Not configured'}</div>
              <div className="rounded border border-white/10 bg-black/30 px-3 py-2 break-all">Treasury: {CONTRACT_ADDRESSES.treasury || 'Not configured'}</div>
              <div className="rounded border border-white/10 bg-black/30 px-3 py-2 break-all">Reward Token: {CONTRACT_ADDRESSES.rewardToken || 'Not configured'}</div>
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="mb-3 text-lg font-bold">Joybit Blast Fee</h2>
            <p className="mb-1 text-sm text-gray-300">Current fee: {formatDisplayToken(playFeeValue, 'USDC')}</p>
            <p className="mb-3 font-mono text-xs text-gray-500">Exact: {formatExactToken(playFeeValue, 'USDC')}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={newPlayFeeUsdc}
                onChange={(e) => setNewPlayFeeUsdc(e.target.value)}
                placeholder="0.5"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={isPending}
                onClick={handleUpdatePlayFee}
                className="theme-button-brand rounded-lg px-4 py-2 text-sm font-bold"
              >
                Update Fee
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="mb-3 text-lg font-bold">Continue Level Fee</h2>
            <p className="mb-1 text-sm text-gray-300">Current continue fee: {formatDisplayToken(continueFeeValue, 'USDC')}</p>
            <p className="mb-3 font-mono text-xs text-gray-500">Exact: {formatExactToken(continueFeeValue, 'USDC')}</p>
            <p className="mb-3 text-xs text-gray-400">Current max continues per session: <span className="font-mono text-gray-300">{String((gameMaxContinues as number) ?? 0)}</span></p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={newContinueFeeUsdc}
                onChange={(e) => setNewContinueFeeUsdc(e.target.value)}
                placeholder="0.25"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={isPending}
                onClick={handleUpdateContinueFee}
                className="theme-button-brand rounded-lg px-4 py-2 text-sm font-bold"
              >
                Update Continue Fee
              </button>
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                value={newMaxContinues}
                onChange={(e) => setNewMaxContinues(e.target.value)}
                placeholder="3"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={isPending}
                onClick={handleSetMaxContinues}
                className="theme-button-brand-soft rounded-lg px-4 py-2 text-sm font-bold"
              >
                Update Max Continues
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="mb-3 text-lg font-bold">Joybit Blast Treasury Contract</h2>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={newTreasuryAddress}
                onChange={(e) => setNewTreasuryAddress(e.target.value)}
                placeholder="0x..."
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={isPending}
                onClick={handleSetTreasuryContract}
                className="theme-button-brand rounded-lg px-4 py-2 text-sm font-bold"
              >
                Set Treasury
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="mb-3 text-lg font-bold">Treasury Withdraw</h2>
            <p className="mb-1 text-sm text-gray-300">Accidental ETH balance: {formatDisplayToken(ethTreasuryValue, 'ETH')}</p>
            <p className="mb-3 font-mono text-xs text-gray-500">Exact: {formatExactToken(ethTreasuryValue, 'ETH')}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={withdrawEthAmount}
                onChange={(e) => setWithdrawEthAmount(e.target.value)}
                placeholder="0.01"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={isPending}
                onClick={handleWithdrawEth}
                className="theme-button-brand rounded-lg px-4 py-2 text-sm font-bold"
              >
                Rescue ETH
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleWithdrawProtocolEth}
                className="theme-button-primary rounded-lg px-4 py-2 text-sm font-bold"
              >
                Rescue ETH Balance
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="mb-3 text-lg font-bold">USDC Reward Pool</h2>
            <p className="mb-1 text-xs text-gray-400 break-all">Token: {CONTRACT_ADDRESSES.rewardToken || 'Not configured'}</p>
            <p className="mb-1 text-sm text-gray-300">Treasury USDC balance: {formatTokenAmount(rewardTreasuryValue, rewardTokenDecimals)} USDC</p>
            <p className="mb-3 font-mono text-xs text-gray-500">Exact: {formatUnits(rewardTreasuryValue, rewardTokenDecimals)} USDC</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={withdrawTokenAmount}
                onChange={(e) => setWithdrawTokenAmount(e.target.value)}
                placeholder="10"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={isPending}
                onClick={handleWithdrawRewardToken}
                className="theme-button-brand rounded-lg px-4 py-2 text-sm font-bold"
              >
                Fund Reward Pool
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleWithdrawProtocolUsdc}
                className="theme-button-primary rounded-lg px-4 py-2 text-sm font-bold"
              >
                Withdraw USDC Fees
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="mb-3 text-lg font-bold">Accidental Token Rescue</h2>
            <p className="mb-1 text-xs text-gray-400 break-all">Rescue stray ERC20 tokens to the connected admin wallet.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={tokenManageAddress}
                onChange={(e) => setTokenManageAddress(e.target.value)}
                placeholder="Token address"
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
              <input
                value={tokenMinimumBalance}
                onChange={(e) => setTokenMinimumBalance(e.target.value)}
                placeholder="Amount to rescue"
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                disabled={tokenManageBusy}
                onClick={handleRescueToken}
                className="theme-button-primary rounded-lg px-4 py-2 text-sm font-bold"
              >
                {tokenManageBusy ? 'Rescuing...' : 'Rescue Token'}
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="mb-3 text-lg font-bold">Booster Fee Setup (USDC)</h2>
            <p className="mb-3 text-xs text-gray-400">These values are used by the in-app booster shop pricing in USDC.</p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input
                value={boosterFees.hammer}
                onChange={(e) => setBoosterFees((prev) => ({ ...prev, hammer: e.target.value }))}
                placeholder="Hammer fee"
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
              <input
                value={boosterFees.shuffle}
                onChange={(e) => setBoosterFees((prev) => ({ ...prev, shuffle: e.target.value }))}
                placeholder="Shuffle fee"
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
              <input
                value={boosterFees.colorBomb}
                onChange={(e) => setBoosterFees((prev) => ({ ...prev, colorBomb: e.target.value }))}
                placeholder="Color Bomb fee"
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
              <input
                value={boosterFees.hammerPack}
                onChange={(e) => setBoosterFees((prev) => ({ ...prev, hammerPack: e.target.value }))}
                placeholder="Hammer Pack fee"
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
              <input
                value={boosterFees.shufflePack}
                onChange={(e) => setBoosterFees((prev) => ({ ...prev, shufflePack: e.target.value }))}
                placeholder="Shuffle Pack fee"
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
              <input
                value={boosterFees.colorBombPack}
                onChange={(e) => setBoosterFees((prev) => ({ ...prev, colorBombPack: e.target.value }))}
                placeholder="Color Bomb Pack fee"
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                disabled={boosterBusy}
                onClick={handleSaveBoosterFees}
                className="theme-button-primary rounded-lg px-4 py-2 text-sm font-bold"
              >
                {boosterBusy ? 'Saving...' : 'Save Booster Fees'}
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5 space-y-5">
            <div>
              <h2 className="mb-2 text-lg font-bold">Game Contract Controls</h2>
              <p className="text-xs text-gray-400">Update signer, reward cap, pause state, and ownership on the game contract.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-gray-300 break-all">
                <div className="text-gray-400">Current signer</div>
                <div className="mt-1 font-mono">{(gameSigner as string) || 'Not configured'}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-gray-300 break-all">
                <div className="text-gray-400">Current owner</div>
                <div className="mt-1 font-mono">{(gameOwner as string) || 'Not configured'}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-gray-300 break-all sm:col-span-2">
                <div className="text-gray-400">Max reward</div>
                <div className="mt-1 font-mono">{formatExactToken((gameMaxReward as bigint) || 0n, 'USDC')}</div>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-3 rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="text-sm font-semibold text-white">Set Signer</div>
                <input
                  value={newGameSignerAddress}
                  onChange={(e) => setNewGameSignerAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                />
                <button type="button" disabled={isPending} onClick={handleSetGameSigner} className="theme-button-primary w-full rounded-lg px-4 py-2 text-sm font-bold">
                  Update Signer
                </button>
              </div>

              <div className="space-y-3 rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="text-sm font-semibold text-white">Set Max Reward</div>
                <input
                  value={newGameMaxRewardEth}
                  onChange={(e) => setNewGameMaxRewardEth(e.target.value)}
                  placeholder="1.5"
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                />
                <button type="button" disabled={isPending} onClick={handleSetGameMaxReward} className="theme-button-primary w-full rounded-lg px-4 py-2 text-sm font-bold">
                  Update Max Reward
                </button>
              </div>

            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <button type="button" disabled={isPending} onClick={handlePauseGame} className="theme-button-primary rounded-lg px-4 py-2 text-sm font-bold">
                Pause Game
              </button>
              <button type="button" disabled={isPending} onClick={handleUnpauseGame} className="theme-button-primary rounded-lg px-4 py-2 text-sm font-bold">
                Unpause Game
              </button>
              <button type="button" disabled={isPending} onClick={handleTransferGameOwnership} className="theme-button-primary rounded-lg px-4 py-2 text-sm font-bold">
                Transfer Game Ownership
              </button>
              <button type="button" disabled={isPending} onClick={handleRenounceGameOwnership} className="theme-button-primary rounded-lg px-4 py-2 text-sm font-bold">
                Renounce Game Ownership
              </button>
            </div>

            <div className="border-t border-white/10 pt-5">
              <h3 className="mb-2 text-base font-bold">Treasury Contract Controls</h3>
              <p className="text-xs text-gray-400">Authorize the game, set the treasury fee percent, pause, and manage treasury ownership.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-gray-300 break-all">
                <div className="text-gray-400">Treasury owner</div>
                <div className="mt-1 font-mono">{(treasuryOwner as string) || 'Not configured'}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-gray-300 break-all">
                <div className="text-gray-400">Fee percent</div>
                <div className="mt-1 font-mono">{String((treasuryFeePercent as bigint) ?? 0n)}</div>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-3 rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="text-sm font-semibold text-white">Authorize Game</div>
                <input
                  value={newAuthorizedGameAddress}
                  onChange={(e) => setNewAuthorizedGameAddress(e.target.value)}
                  placeholder="Game address (0x...)"
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button type="button" disabled={isPending} onClick={() => handleSetAuthorizedGame(true)} className="theme-button-primary flex-1 rounded-lg px-4 py-2 text-sm font-bold">
                    Authorize
                  </button>
                  <button type="button" disabled={isPending} onClick={() => handleSetAuthorizedGame(false)} className="theme-button-primary flex-1 rounded-lg px-4 py-2 text-sm font-bold">
                    Revoke
                  </button>
                </div>
                <div className="text-xs text-gray-400">
                  Current status: {authorizedGameEnabled ? 'authorized' : 'not authorized'}
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="text-sm font-semibold text-white">Set Fee Percent</div>
                <input
                  value={newFeePercent}
                  onChange={(e) => setNewFeePercent(e.target.value)}
                  placeholder="5"
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                />
                <button type="button" disabled={isPending} onClick={handleSetTreasuryFeePercent} className="theme-button-primary w-full rounded-lg px-4 py-2 text-sm font-bold">
                  Update Fee Percent
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <button type="button" disabled={isPending} onClick={handlePauseTreasury} className="theme-button-primary rounded-lg px-4 py-2 text-sm font-bold">
                Pause Treasury
              </button>
              <button type="button" disabled={isPending} onClick={handleUnpauseTreasury} className="theme-button-primary rounded-lg px-4 py-2 text-sm font-bold">
                Unpause Treasury
              </button>
              <button type="button" disabled={isPending} onClick={handleTransferTreasuryOwnership} className="theme-button-primary rounded-lg px-4 py-2 text-sm font-bold">
                Transfer Treasury Ownership
              </button>
              <button type="button" disabled={isPending} onClick={handleRenounceTreasuryOwnership} className="theme-button-primary rounded-lg px-4 py-2 text-sm font-bold">
                Renounce Treasury Ownership
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-blue-600/40 bg-blue-950/20 p-5 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-blue-200">Admin Controls</h2>
              <p className="mt-1 text-xs text-blue-100/70">These actions change live data and should be used carefully.</p>
            </div>

            {/* Leaderboard-only reset */}
            <div className="rounded-lg border border-blue-500/30 bg-black/30 p-4">
              <div className="mb-2 text-sm font-semibold text-blue-100">Reset Leaderboard</div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-blue-100/70">Clears scores and user metadata only. Seasonal epochs are untouched.</p>
                <button
                  type="button"
                  disabled={leaderboardBusy || fullResetBusy}
                  onClick={handleResetLeaderboard}
                  className="shrink-0 rounded-lg border border-blue-400/40 bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {leaderboardBusy ? 'Resetting…' : 'Reset Leaderboard'}
                </button>
              </div>
            </div>

            {/* Full database reset */}
            <div className="rounded-lg border border-blue-500/50 bg-blue-900/30 p-4">
              <div className="mb-2 text-sm font-semibold text-white">Drop &amp; Recreate All Tables</div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-blue-100/80">Drops every table then recreates them empty and clean. Wipes leaderboard, player stats, and all seasonal reward epochs/allocations/fundings. Use this for a completely fresh start.</p>
                <button
                  type="button"
                  disabled={fullResetBusy || leaderboardBusy}
                  onClick={handleFullDatabaseReset}
                  className="shrink-0 rounded-lg border border-blue-300/50 bg-blue-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {fullResetBusy ? 'Rebuilding…' : 'Drop & Recreate All Tables'}
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="mb-3 text-lg font-bold">Seasonal Rewards (Weekly / Monthly)</h2>
            <p className="mb-3 text-xs text-gray-400">Use finalize to snapshot rankings, then fund and mark distributed when payouts are executed. After distribution, the leaderboard is reset automatically so the next weekly or monthly cycle starts fresh. All amounts below are in token units (not wei).</p>

            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-400">Admin API Secret</div>
                <input
                  value={adminSecret}
                  onChange={(e) => setAdminSecret(e.target.value)}
                  type="password"
                  placeholder="Matches REWARDS_ADMIN_SECRET on server"
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-400">Reward Token Address (USDC)</div>
                <input
                  value={seasonalTokenAddress}
                  readOnly
                  disabled
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm opacity-90"
                />
              </div>
            </div>

            <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-400">Period Window</div>
                <select
                  value={seasonalPeriod}
                  onChange={(e) => setSeasonalPeriod(e.target.value as 'weekly' | 'monthly')}
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-400">Total Reward Budget</div>
                <input
                  value={seasonalBudgetAmount}
                  onChange={(e) => setSeasonalBudgetAmount(e.target.value)}
                  placeholder="Total tokens to distribute"
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                />
              </div>
              <div>
              </div>
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-400">Number of Winners (Top N)</div>
                <input
                  value={seasonalWinnersCount}
                  onChange={(e) => setSeasonalWinnersCount(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mb-3">
              <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-400">Payout Split Percentages by Rank</div>
              <input
                value={seasonalPayoutPercents}
                onChange={(e) => setSeasonalPayoutPercents(e.target.value)}
                placeholder="Comma list for rank #1..#N, must total 100 (e.g. 25,20,15,10,8,7,5,4,3,3)"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
            </div>

            <div className="mb-3 flex justify-end">
              <button
                type="button"
                disabled={seasonalBusy}
                onClick={handleFinalizeEpoch}
                className="theme-button-brand rounded-lg px-4 py-2 text-sm font-bold"
              >
                Finalize Epoch
              </button>
            </div>

            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <input
                value={seasonalEpochId}
                onChange={(e) => setSeasonalEpochId(e.target.value)}
                placeholder="Epoch ID"
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
              <input
                value={seasonalFundAmount}
                onChange={(e) => setSeasonalFundAmount(e.target.value)}
                placeholder="Fund amount (e.g. 25)"
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={seasonalBusy}
                  onClick={handleFundEpoch}
                  className="theme-button-brand-soft rounded-lg px-4 py-2 text-sm font-bold"
                >
                  Fund
                </button>
                <button
                  type="button"
                  disabled={seasonalBusy}
                  onClick={handleDistributeEpoch}
                  className="theme-button-brand rounded-lg px-4 py-2 text-sm font-bold"
                >
                  Distribute
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {seasonalEpochs.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/15 bg-black/20 px-4 py-4 text-sm text-gray-400">
                  No seasonal epochs yet. Finalize one period first to create the first snapshot.
                </div>
              ) : (
                seasonalEpochs.map((epoch) => (
                  <div key={epoch.id} className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-gray-300">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold">#{epoch.id} {formatEpochPeriod(epoch.period)} - {String(epoch.status || '').toUpperCase() || 'UNKNOWN'}</span>
                      <div className="flex items-center gap-3">
                        <span>Token decimals: {epoch.tokenDecimals || 18}</span>
                        <button
                          type="button"
                          disabled={seasonalBusy}
                          onClick={() => handleDeleteEpoch(epoch.id)}
                          className="rounded border border-red-400/40 bg-red-500/20 px-2 py-1 text-[11px] font-semibold text-red-200 transition hover:bg-red-500/30"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="mt-1 break-all">Token: {getTokenSymbol(epoch.tokenAddress)} ({epoch.tokenAddress})</div>
                    <div className="mt-1">Budget: {formatRawTokenAmount(epoch.budgetRaw, getTokenSymbol(epoch.tokenAddress), epoch.tokenDecimals || 18)}</div>
                    <div className="mt-1">Window: {formatEpochDate(epoch.startAt)} - {formatEpochDate(epoch.endAt)}</div>
                  </div>
                ))
              )}
            </div>
          </section>

          {status && (
            <section className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-gray-200">
              {status}
            </section>
          )}
        </div>
      </div>
    </main>
  )
}
