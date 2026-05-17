'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { AudioButtons } from '@/components/AudioButtons'
import { SettingsButton } from '@/components/SettingsButton'
import { WalletButton } from '@/components/WalletButton'
import { useAudio } from '@/components/audio/AudioContext'
import { useLeaderboard } from '@/lib/hooks/useLeaderboard'
import { useMatch3Stats } from '@/lib/hooks/useMatch3Stats'
import { useTreasury, useTreasuryData } from '@/lib/hooks/useTreasury'
import { formatTokenBalance } from '@/lib/utils/tokenFormatting'

export default function ProfilePage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { playMusic } = useAudio()
  const { stats } = useMatch3Stats(address)
  const { leaderboard } = useLeaderboard()
  const { allPendingRewards, refetch } = useTreasuryData(address)
  const { claimRewards, isClaiming } = useTreasury()
  const [mounted, setMounted] = useState(false)

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

  const pendingRewards = allPendingRewards.tokens.map((token, index) => ({
    token,
    amount: allPendingRewards.amounts[index] || 0n,
  }))

  return (
    <main
      className="min-h-screen px-4 py-5"
      style={{ backgroundColor: 'var(--theme-background)', color: 'var(--theme-text)' }}
    >
      <div className="fixed right-3 top-3 z-50 flex items-center gap-2">
        <AudioButtons />
        <SettingsButton />
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
            <p className="text-sm text-gray-400">
              Wallet connection is automatic in supported mini-app contexts.
            </p>
          </section>
        ) : (
          <div className="space-y-4">
            <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-blue-300">Wallet</p>
              <p className="mt-2 break-all font-mono text-sm text-gray-200">{address}</p>
            </section>

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
                  <p className="text-sm text-gray-400">Claim rewards earned from Match-3.</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await claimRewards()
                    await refetch()
                  }}
                  disabled={isClaiming || pendingRewards.length === 0}
                  className="theme-button-primary rounded-lg px-4 py-2 text-sm font-bold"
                >
                  {isClaiming ? 'Claiming...' : 'Claim'}
                </button>
              </div>

              {pendingRewards.length === 0 ? (
                <p className="text-sm text-gray-400">No pending rewards yet.</p>
              ) : (
                <div className="space-y-2">
                  {pendingRewards.map((reward) => (
                    <div
                      key={reward.token}
                      className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2 text-sm"
                    >
                      <span className="font-mono text-xs text-gray-400">{reward.token}</span>
                      <span className="font-bold">{formatTokenBalance(reward.amount)}</span>
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
