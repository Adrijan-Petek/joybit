'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { AudioButtons } from '@/components/AudioButtons'
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
      className="min-h-screen px-4 py-5"
      style={{ backgroundColor: 'var(--theme-background)', color: 'var(--theme-text)' }}
    >
      <div className="fixed right-3 top-3 z-50 flex items-center gap-2">
        <AudioButtons />
        <WalletButton />
      </div>

      <div className="mx-auto max-w-3xl pt-14">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Back
          </button>
          <h1 className="text-2xl font-black">Profile</h1>
          <div className="w-16" />
        </div>

        {!isConnected ? (
          <section className="rounded-xl border border-white/10 bg-white/[0.04] p-6 text-center">
            <h2 className="mb-2 text-xl font-bold">Connect to view your profile</h2>
          </section>
        ) : (
          <div className="space-y-4">
            <section className="grid gap-3 sm:grid-cols-3">
              <Stat label="Games Played" value={stats?.gamesPlayed ?? 0} />
              <Stat label="High Score" value={stats?.highScore ?? 0} />
              <Stat label="Best Level" value={stats?.highScoreLevel ?? 0} />
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <Stat label="Leaderboard Score" value={currentPlayer?.score ?? 0} />
              <Stat label="Rank" value={rank ? `#${rank}` : '-'} />
            </section>

            <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Pending Rewards</h2>
                  <p className="text-sm text-gray-400">Claim rewards earned from Joybit Blast.</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await claimRewards()
                    await refetch()
                  }}
                  disabled={isClaiming || !hasPendingRewards}
                  className="theme-button-primary rounded-lg px-4 py-2 text-sm font-bold"
                >
                  {isClaiming ? 'Claiming...' : 'Claim All'}
                </button>
              </div>

              {!hasPendingRewards ? (
                <p className="text-sm text-gray-400">No pending rewards yet.</p>
              ) : (
                <div className="space-y-2">
                  {pendingRewards.map((reward) => (
                    <div
                      key={reward.token}
                      className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2 text-sm"
                    >
                      <div className="flex flex-col">
                        <span className="text-gray-300">{getTokenLabel(reward.token)}</span>
                        <span className="font-mono text-[11px] text-gray-500">{reward.token}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{formatRewardAmount(reward.amount, reward.token)}</span>
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
                          className="rounded-md border border-white/15 px-2 py-1 text-xs font-semibold hover:bg-white/10 disabled:opacity-50"
                        >
                          {claimingToken === reward.token ? 'Claiming...' : 'Claim'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Seasonal Rewards</h2>
                  <p className="text-sm text-gray-400">Shows distributed rewards you won for each period.</p>
                </div>
                <div className="rounded-lg border border-white/10 p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setSeasonTab('weekly')}
                    className={`rounded-md px-2 py-1 ${seasonTab === 'weekly' ? 'bg-white/20 text-white' : 'text-gray-400'}`}
                  >
                    Weekly
                  </button>
                  <button
                    type="button"
                    onClick={() => setSeasonTab('monthly')}
                    className={`rounded-md px-2 py-1 ${seasonTab === 'monthly' ? 'bg-white/20 text-white' : 'text-gray-400'}`}
                  >
                    Monthly
                  </button>
                </div>
              </div>

              <div className="mb-3 rounded-lg bg-black/30 px-3 py-2 text-sm">
                <span className="text-gray-400">Distributed rewards found: </span>
                <span className="font-bold">{seasonalRows.length}</span>
              </div>

              {seasonalLoading ? (
                <p className="text-sm text-gray-400">Loading seasonal rewards...</p>
              ) : seasonalRows.length === 0 ? (
                <p className="text-sm text-gray-400">No distributed {seasonTab} rewards won yet.</p>
              ) : (
                <div className="space-y-2">
                  {seasonalRows.slice(0, 20).map((entry) => (
                    <div key={`${entry.epochId}-${entry.tokenAddress}`} className="rounded-lg bg-black/30 px-3 py-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Epoch #{entry.epochId} - Rank #{entry.rank}</span>
                        <span className="font-bold">{formatSeasonalAmount(entry.amountRaw || '0', entry.tokenDecimals)} {getTokenLabel(entry.tokenAddress)}</span>
                      </div>
                      <div className="mt-1 text-xs text-gray-400">Token: {getTokenLabel(entry.tokenAddress)}</div>
                      <div className="font-mono text-[11px] text-gray-500">{entry.tokenAddress}</div>
                      <div className="text-xs text-gray-500">Status: {entry.claimed ? 'Claimed' : 'Pending'} | {entry.status}</div>
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
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="mt-1 text-sm text-gray-400">{label}</div>
    </div>
  )
}
