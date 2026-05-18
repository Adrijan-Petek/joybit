'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { formatEther, formatUnits, isAddress, parseEther, parseUnits, zeroAddress } from 'viem'
import { AudioButtons } from '@/components/AudioButtons'
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

function formatExactToken(value: bigint, symbol: string): string {
  return `${formatEther(value)} ${symbol}`
}

function formatDisplayToken(value: bigint, symbol: string, maxDecimals = 6): string {
  const [intPart, decimalPart = ''] = formatEther(value).split('.')
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

  const [newPlayFeeEth, setNewPlayFeeEth] = useState('0.001')
  const [newTreasuryAddress, setNewTreasuryAddress] = useState<string>(CONTRACT_ADDRESSES.treasury || '')
  const [withdrawEthAmount, setWithdrawEthAmount] = useState('0.01')
  const [withdrawTokenAmount, setWithdrawTokenAmount] = useState('10')
  const [seasonalPeriod, setSeasonalPeriod] = useState<'weekly' | 'monthly'>('weekly')
  const [seasonalTokenAddress, setSeasonalTokenAddress] = useState<string>(CONTRACT_ADDRESSES.joybitToken || '')
  const [seasonalBudgetAmount, setSeasonalBudgetAmount] = useState('100')
  const [seasonalWinnersCount, setSeasonalWinnersCount] = useState('10')
  const [seasonalPayoutPercents, setSeasonalPayoutPercents] = useState('25,20,15,10,8,7,5,4,3,3')
  const [seasonalEpochId, setSeasonalEpochId] = useState('')
  const [seasonalFundAmount, setSeasonalFundAmount] = useState('0')
  const [adminSecret, setAdminSecret] = useState('')
  const [seasonalEpochs, setSeasonalEpochs] = useState<SeasonalEpoch[]>([])
  const [seasonalBusy, setSeasonalBusy] = useState(false)
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
  const validRewardTokenAddress = isAddress(CONTRACT_ADDRESSES.joybitToken)
  const match3Address = validMatch3Address ? CONTRACT_ADDRESSES.match3Game : zeroAddress
  const treasuryAddress = validTreasuryAddress ? CONTRACT_ADDRESSES.treasury : zeroAddress
  const rewardTokenAddress = validRewardTokenAddress ? CONTRACT_ADDRESSES.joybitToken : zeroAddress
  const validSeasonalTokenAddress = isAddress(seasonalTokenAddress)
  const seasonalTokenAddressSafe = validSeasonalTokenAddress ? seasonalTokenAddress as `0x${string}` : zeroAddress
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

  const { data: supportedTokens, refetch: refetchSupportedTokens } = useReadContract({
    address: treasuryAddress,
    abi: TREASURY_ABI,
    functionName: 'getSupportedTokens',
    query: {
      enabled: validTreasuryAddress,
    },
  })

  const { data: seasonalTokenDecimalsData } = useReadContract({
    address: seasonalTokenAddressSafe,
    abi: ERC20_META_ABI,
    functionName: 'decimals',
    query: {
      enabled: validSeasonalTokenAddress,
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

  const handleUpdatePlayFee = async () => {
    try {
      setStatus('Submitting play fee update...')
      const fee = parseEther(newPlayFeeEth || '0')
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
      setStatus('Submitting ETH withdraw...')
      const amount = parseEther(withdrawEthAmount || '0')
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.treasury,
        abi: TREASURY_ABI,
        functionName: 'withdrawETH',
        args: [amount],
      })
      await refetchTreasuryEth()
      setStatus('Treasury ETH withdrawn successfully.')
    } catch (error) {
      setStatus(`Withdraw failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleWithdrawRewardToken = async () => {
    try {
      if (!isAddress(CONTRACT_ADDRESSES.joybitToken)) {
        setStatus('Reward token address is invalid or missing in env.')
        return
      }

      setStatus('Submitting reward token withdraw...')
      const amount = parseEther(withdrawTokenAmount || '0')
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.treasury,
        abi: TREASURY_ABI,
        functionName: 'withdrawToken',
        args: [CONTRACT_ADDRESSES.joybitToken, amount],
      })
      await refetchTreasuryRewardToken()
      setStatus('Treasury reward token withdrawn successfully.')
    } catch (error) {
      setStatus(`Reward token withdraw failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleAddSupportedToken = async () => {
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
        functionName: 'addSupportedToken',
        args: [tokenManageAddress as `0x${string}`, minimumRaw],
      })
      await refetchSupportedTokens()
      setStatus('Supported token added successfully.')
    } catch (error) {
      setStatus(`Add supported token failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setTokenManageBusy(false)
    }
  }

  const handleRemoveSupportedToken = async () => {
    if (!isAddress(tokenManageAddress)) {
      setStatus('Token address format is invalid.')
      return
    }

    setTokenManageBusy(true)
    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.treasury,
        abi: TREASURY_ABI,
        functionName: 'removeSupportedToken',
        args: [tokenManageAddress as `0x${string}`],
      })
      await refetchSupportedTokens()
      setStatus('Supported token removed successfully.')
    } catch (error) {
      setStatus(`Remove supported token failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setTokenManageBusy(false)
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
    if (normalized === (CONTRACT_ADDRESSES.joybitToken || '').toLowerCase()) return 'JOYB'

    const configuredRewardTokens = (process.env.NEXT_PUBLIC_REWARD_TOKENS || '')
      .split(',')
      .map((entry) => {
        const [addressPart, symbolPart] = entry.split(':').map((part) => part.trim())
        return {
          address: (addressPart || '').toLowerCase(),
          symbol: symbolPart || 'TOKEN',
        }
      })

    const configured = configuredRewardTokens.find((entry) => entry.address === normalized)
    return configured?.symbol || 'TOKEN'
  }

  const handleFinalizeEpoch = () => {
    try {
      const decimals = Number(seasonalTokenDecimalsData ?? 18)
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
        tokenAddress: seasonalTokenAddress,
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
      const decimals = Number(seasonalTokenDecimalsData ?? 18)
      const amountRaw = parseUnits(seasonalFundAmount || '0', decimals).toString()
      if (BigInt(amountRaw) <= 0n) {
        setStatus('Fund amount must be greater than 0.')
        return
      }

      callSeasonalAction({
        action: 'fund',
        epochId: Number(seasonalEpochId),
        tokenAddress: seasonalTokenAddress,
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

  useEffect(() => {
    fetchSeasonalEpochs()
  }, [])

  const playFeeValue = (playFee as bigint) || 0n
  const ethTreasuryValue = (treasuryEthBalance as bigint) || 0n
  const rewardTreasuryValue = (treasuryRewardTokenBalance as bigint) || 0n

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
      <div className="fixed right-3 top-3 z-50 flex items-center gap-2">
        <AudioButtons />
        <WalletButton />
      </div>

      <div className="mx-auto max-w-3xl pt-14">
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
                <div className="mt-1 text-sm font-bold text-white">{formatDisplayToken(playFeeValue, 'ETH')}</div>
                <div className="mt-1 font-mono text-[11px] text-gray-500">Exact: {formatExactToken(playFeeValue, 'ETH')}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <div className="text-xs uppercase tracking-wide text-gray-400">Treasury ETH</div>
                <div className="mt-1 text-sm font-bold text-white">{formatDisplayToken(ethTreasuryValue, 'ETH')}</div>
                <div className="mt-1 font-mono text-[11px] text-gray-500">Exact: {formatExactToken(ethTreasuryValue, 'ETH')}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <div className="text-xs uppercase tracking-wide text-gray-400">Treasury JOYB</div>
                <div className="mt-1 text-sm font-bold text-white">{formatDisplayToken(rewardTreasuryValue, 'JOYB')}</div>
                <div className="mt-1 font-mono text-[11px] text-gray-500">Exact: {formatExactToken(rewardTreasuryValue, 'JOYB')}</div>
              </div>
            </div>

            <div className="mt-4 grid gap-2 text-xs text-gray-400">
              <div className="rounded border border-white/10 bg-black/30 px-3 py-2 break-all">Match3: {CONTRACT_ADDRESSES.match3Game || 'Not configured'}</div>
              <div className="rounded border border-white/10 bg-black/30 px-3 py-2 break-all">Treasury: {CONTRACT_ADDRESSES.treasury || 'Not configured'}</div>
              <div className="rounded border border-white/10 bg-black/30 px-3 py-2 break-all">Reward Token: {CONTRACT_ADDRESSES.joybitToken || 'Not configured'}</div>
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="mb-3 text-lg font-bold">Match-3 Fee</h2>
            <p className="mb-1 text-sm text-gray-300">Current fee: {formatDisplayToken(playFeeValue, 'ETH')}</p>
            <p className="mb-3 font-mono text-xs text-gray-500">Exact: {formatExactToken(playFeeValue, 'ETH')}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={newPlayFeeEth}
                onChange={(e) => setNewPlayFeeEth(e.target.value)}
                placeholder="0.001"
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
            <h2 className="mb-3 text-lg font-bold">Match-3 Treasury Contract</h2>
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
            <p className="mb-1 text-sm text-gray-300">Treasury ETH balance: {formatDisplayToken(ethTreasuryValue, 'ETH')}</p>
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
                Withdraw ETH
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="mb-3 text-lg font-bold">Reward Token (JOYB)</h2>
            <p className="mb-1 text-xs text-gray-400 break-all">Token: {CONTRACT_ADDRESSES.joybitToken || 'Not configured'}</p>
            <p className="mb-1 text-sm text-gray-300">Treasury token balance: {formatDisplayToken(rewardTreasuryValue, 'JOYB')}</p>
            <p className="mb-3 font-mono text-xs text-gray-500">Exact: {formatExactToken(rewardTreasuryValue, 'JOYB')}</p>
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
                Withdraw Token
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="mb-3 text-lg font-bold">Supported Reward Tokens</h2>
            <p className="mb-3 text-xs text-gray-400">Add or remove tokens in Treasury. Minimum balance is entered in token units.</p>
            <div className="mb-3 grid gap-3 sm:grid-cols-3">
              <input
                value={tokenManageAddress}
                onChange={(e) => setTokenManageAddress(e.target.value)}
                placeholder="Token address (0x...)"
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
              <input
                value={tokenMinimumBalance}
                onChange={(e) => setTokenMinimumBalance(e.target.value)}
                placeholder="Minimum balance (e.g. 1000)"
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={tokenManageBusy}
                  onClick={handleAddSupportedToken}
                  className="theme-button-brand rounded-lg px-4 py-2 text-sm font-bold"
                >
                  Add Token
                </button>
                <button
                  type="button"
                  disabled={tokenManageBusy}
                  onClick={handleRemoveSupportedToken}
                  className="theme-button-brand-soft rounded-lg px-4 py-2 text-sm font-bold"
                >
                  Remove Token
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {Array.isArray(supportedTokens) && supportedTokens.length > 0 ? (
                supportedTokens.map((token) => (
                  <div key={token} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-gray-300 break-all">
                    {token}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400">No supported tokens found.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-rose-600/50 bg-rose-950/40 p-5 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-rose-200">⚠️ Danger Zone</h2>
              <p className="mt-1 text-xs text-rose-100/60">These actions delete data permanently and cannot be undone.</p>
            </div>

            {/* Leaderboard-only reset */}
            <div className="rounded-lg border border-rose-500/30 bg-black/30 p-4">
              <div className="mb-2 text-sm font-semibold text-rose-100">Reset Leaderboard</div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-rose-100/70">Clears scores and user metadata only. Seasonal epochs are untouched.</p>
                <button
                  type="button"
                  disabled={leaderboardBusy || fullResetBusy}
                  onClick={handleResetLeaderboard}
                  className="shrink-0 rounded-lg border border-rose-400/40 bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {leaderboardBusy ? 'Resetting…' : 'Reset Leaderboard'}
                </button>
              </div>
            </div>

            {/* Full database reset */}
            <div className="rounded-lg border border-rose-500/50 bg-rose-900/30 p-4">
              <div className="mb-2 text-sm font-semibold text-white">Drop &amp; Recreate All Tables</div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-rose-100/80">Drops every table then recreates them empty and clean. Wipes leaderboard, player stats, and all seasonal reward epochs/allocations/fundings. Use this for a completely fresh start.</p>
                <button
                  type="button"
                  disabled={fullResetBusy || leaderboardBusy}
                  onClick={handleFullDatabaseReset}
                  className="shrink-0 rounded-lg border border-rose-300/50 bg-rose-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
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
                <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-400">Reward Token Address</div>
                <input
                  value={seasonalTokenAddress}
                  onChange={(e) => setSeasonalTokenAddress(e.target.value)}
                  placeholder="Token to distribute in this epoch"
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
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
                    <div className="flex items-center justify-between">
                      <span className="font-bold">#{epoch.id} {formatEpochPeriod(epoch.period)} - {String(epoch.status || '').toUpperCase() || 'UNKNOWN'}</span>
                      <span>Token decimals: {epoch.tokenDecimals || 18}</span>
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
