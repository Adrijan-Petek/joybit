'use client'

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { Avatar } from '@coinbase/onchainkit/identity'
import { AudioButtons } from '@/components/AudioButtons'
import { SettingsButton } from '@/components/SettingsButton'
import { WalletButton } from '@/components/WalletButton'
import { useAudio } from '@/components/audio/AudioContext'
import { useLeaderboard } from '@/lib/hooks/useLeaderboard'

export default function Leaderboard() {
  const router = useRouter()
  const { address } = useAccount()
  const { playMusic } = useAudio()
  const { leaderboard, loading, error, refetch } = useLeaderboard()
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

  const myRank = address
    ? leaderboard.findIndex((player) => player.address.toLowerCase() === address.toLowerCase()) + 1
    : 0

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
          <h1 className="text-2xl font-black">Leaderboard</h1>
          <button
            type="button"
            onClick={refetch}
            className="rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Refresh
          </button>
        </div>

        <section className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <div className="text-xl font-black">100</div>
              <div className="text-gray-400">Match-3 win</div>
            </div>
            <div>
              <div className="text-xl font-black">50</div>
              <div className="text-gray-400">Match-3 game</div>
            </div>
            <div>
              <div className="text-xl font-black">{myRank ? `#${myRank}` : '-'}</div>
              <div className="text-gray-400">Your rank</div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
          {loading ? (
            <div className="p-6 text-center text-gray-400">Loading leaderboard...</div>
          ) : error ? (
            <div className="p-6 text-center text-red-300">{error}</div>
          ) : leaderboard.length === 0 ? (
            <div className="p-6 text-center text-gray-400">No scores yet.</div>
          ) : (
            <div className="divide-y divide-white/10">
              {leaderboard.map((player, index) => {
                const isCurrentUser = address?.toLowerCase() === player.address.toLowerCase()
                const displayName = player.username || `${player.address.slice(0, 6)}...${player.address.slice(-4)}`

                return (
                  <div
                    key={player.address}
                    className={`flex items-center gap-3 p-4 ${isCurrentUser ? 'bg-blue-500/10' : ''}`}
                  >
                    <div className="w-8 text-center font-black">{index + 1}</div>
                    <div className="h-9 w-9 overflow-hidden rounded-full bg-white/10">
                      {player.pfp ? (
                        <img src={player.pfp} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Avatar address={player.address as `0x${string}`} className="h-full w-full" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{displayName}</div>
                      <div className="truncate font-mono text-xs text-gray-500">{player.address}</div>
                    </div>
                    <div className="text-lg font-black">{player.score}</div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
