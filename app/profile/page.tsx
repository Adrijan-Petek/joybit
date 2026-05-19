'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { AudioButtons } from '@/components/AudioButtons'
import { Logo } from '@/components/Logo'
import { WalletButton } from '@/components/WalletButton'
import { useAudio } from '@/components/audio/AudioContext'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { useLeaderboard } from '@/lib/hooks/useLeaderboard'
import { useMatch3Stats } from '@/lib/hooks/useMatch3Stats'
import { useTreasury, useTreasuryData } from '@/lib/hooks/useTreasury'
import { useSeasonalRewards } from '@/lib/hooks/useSeasonalRewards'
import { formatUnits, isAddress } from 'viem'

export default function ProfilePage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { playMusic } = useAudio()
  const { stats } = useMatch3Stats(address)
  const { leaderboard } = useLeaderboard()
  const { allPendingRewards, refetch } = useTreasuryData(address)
  const { claimRewards, claimTokenRewards, isClaiming } = useTreasury()
  const { data: seasonalRewards, isLoading: seasonalLoading } = useSeasonalRewards(address)
  const [mounted, setMounted] = useState(false)
  const [claimingToken, setClaimingToken] = useState<`0x${string}` | null>(null)
  const [seasonTab, setSeasonTab] = useState<'weekly' | 'monthly'>('weekly')

  useEffect(() => {
    setMounted(true)
    playMusic('main-menu')

    import('@farcaster/miniapp-sdk')
      .then(({ sdk }) => sdk.actions.ready())
      .catch(() => {
        // Browser users are not always inside a Farcaster Mini App.
      })
  }, [playMusic])

  if (!mounted) return null

  const currentPlayer = address
    ? leaderboard.find((entry) => entry.address.toLowerCase() === address.toLowerCase())
    : undefined
  const rank = currentPlayer
    ? leaderboard.findIndex((entry) => entry.address.toLowerCase() === currentPlayer.address.toLowerCase()) + 1
    : 0

  const pendingRewards = allPendingRewards.tokens
    .map((token, index) => ({
      token,
      amount: allPendingRewards.amounts[index] || 0n,
    }))
    .filter((reward) => reward.amount > 0n)

  const hasPendingRewards = pendingRewards.length > 0

  const seasonalRows = seasonalRewards.allocations.filter((allocation) => (
    allocation.period === seasonTab &&
    allocation.status === 'distributed' &&
    BigInt(allocation.amountRaw || '0') > 0n
  ))

  const formatSeasonalAmount = (amountRaw: string, tokenDecimals?: number) => {
    try {
      const [intPart, decimalPart = ''] = formatUnits(BigInt(amountRaw || '0'), tokenDecimals ?? 18).split('.')
      const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      const trimmed = decimalPart.slice(0, 6).replace(/0+$/, '')
      return trimmed ? `${grouped}.${trimmed}` : grouped
    } catch {
      return '0'
    }
  }

  const getTokenLabel = (tokenAddress: string) => {
    if (isAddress(CONTRACT_ADDRESSES.rewardToken || '') &&
      tokenAddress.toLowerCase() === (CONTRACT_ADDRESSES.rewardToken || '').toLowerCase()) {
      return 'USDC'
    }

    return 'USDC'
  }

  const formatRewardAmount = (amount: bigint, tokenAddress: string) => {
    if (isAddress(CONTRACT_ADDRESSES.rewardToken || '') && tokenAddress.toLowerCase() === (CONTRACT_ADDRESSES.rewardToken || '').toLowerCase()) {
      return `${formatUnits(amount, 6)} USDC`
    }

    return `${formatUnits(amount, 6)} USDC`
  }

  return (
    <main
      className="min-h-screen"
      style={{
        backgroundColor: 'var(--theme-background)',
        backgroundImage:
          'radial-gradient(70rem 32rem at 80% -8%, color-mix(in srgb, var(--theme-primary) 24%, transparent), transparent 62%), radial-gradient(52rem 28rem at -10% 100%, color-mix(in srgb, var(--theme-accent) 16%, transparent), transparent 60%)',
        color: 'var(--theme-text)'
      }}
    >
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/45 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Logo size="small" />
          <h1 className="flex-1 text-center text-lg font-black">Player Profile</h1>
          <div className="flex items-center gap-2">
            <AudioButtons splitButtons />
            <WalletButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-10 pt-24 md:pb-10">
        <div className="mb-6 flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="theme-button-brand-soft rounded-lg px-3 py-2 text-sm font-bold"
          >
            ← Home
          </button>
        </div>

        {!isConnected ? (
          <section className="rounded-xl border border-white/10 bg-white/[0.04] p-8 text-center">
            <h2 className="mb-3 text-2xl font-bold">Connect Wallet</h2>
            <p className="text-gray-400">Connect your wallet to view your profile and manage rewards.</p>
          </section>
        ) : (
          <div className="space-y-6">
            {/* Stats Grid */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Games Played" value={stats?.gamesPlayed ?? 0} />
              <Stat label="High Score" value={stats?.highScore ?? 0} />
              <Stat label="Best Level" value={stats?.highScoreLevel ?? 0} />
              <Stat label="Rank" value={rank ? `#${rank}` : '-'} />
            </section>

            {/* Leaderboard Score Section */}
            <section className="rounded-xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="mb-2 text-lg font-bold">Leaderboard Score</h2>
              <div className="text-4xl font-black text-blue-300">{currentPlayer?.score ?? 0}</div>
              <p className="mt-2 text-sm text-gray-400">Your total competitive score on the leaderboard</p>
            </section>

            {/* Pending Rewards Section */}
            <section className="rounded-xl border border-white/10 bg-white/[0.04] p-6">
              <div className="mb-5 flex items-start justify-between gap-4 sm:items-center">
                <div>
                  <h2 className="text-lg font-bold">Pending Rewards</h2>
                  <p className="mt-1 text-sm text-gray-400">Claim USDC earned from gameplay</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await claimRewards()
                    await refetch()
                  }}
                  disabled={isClaiming || !hasPendingRewards}
                  className="theme-button-brand rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50 whitespace-nowrap"
                >
                  {isClaiming ? 'Claiming...' : 'Claim All'}
                </button>
              </div>

              {!hasPendingRewards ? (
                <div className="rounded-lg bg-black/30 p-4 text-center">
                  <p className="text-sm text-gray-400">No pending rewards. Keep playing to earn more!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingRewards.map((reward) => (
                    <div
                      key={reward.token}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 px-4 py-3"
                    >
                      <div>
                        <span className="block font-semibold text-white">{getTokenLabel(reward.token)}</span>
                        <span className="text-xs text-gray-500">{reward.token.slice(0, 6)}...{reward.token.slice(-4)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold">{formatRewardAmount(reward.amount, reward.token)}</span>
                        <button
                          type="button"
                          disabled={isClaiming || claimingToken === reward.token}
                          onClick={async () => {
                            setClaimingToken(reward.token)
                            try {
                              await claimTokenRewards(reward.token)
                              await refetch()
                            } finally {
                              setClaimingToken(null)
                            }
                          }}
                          className="theme-button-brand-soft rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                        >
                          {claimingToken === reward.token ? 'Claiming...' : 'Claim'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6">
      <div className="text-3xl font-black text-blue-300">{value}</div>
      <div className="mt-2 text-sm font-medium text-gray-400">{label}</div>
    </div>
  )
}
