'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface InfoModalProps {
  isOpen: boolean
  onClose: () => void
}

const SECTIONS = [
  { id: 'game', label: 'Gameplay' },
  { id: 'scoring', label: 'Scoring' },
  { id: 'rewards', label: 'Rewards' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'claim', label: 'Claims' },
]

export function InfoModal({ isOpen, onClose }: InfoModalProps) {
  const [active, setActive] = useState('game')

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-black/80 p-0 sm:p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 40, opacity: 0 }}
            className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl border border-white/10 bg-gray-950 text-white shadow-2xl flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 shrink-0">
              <h2 className="max-w-[80%] text-base font-bold leading-tight sm:text-lg">How Joybit Works</h2>
              <button
                type="button"
                onClick={onClose}
                className="h-8 w-8 rounded-lg bg-white/10 text-sm font-bold hover:bg-white/20 transition"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Tab bar */}
            <div className="px-5 pb-3 shrink-0">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="tablist" aria-label="Info sections">
                {SECTIONS.map((s) => {
                  const isActive = active === s.id
                  return (
                    <button
                      key={s.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActive(s.id)}
                      className="rounded-md border px-2 py-1.5 text-[11px] font-semibold transition sm:text-xs"
                      style={{
                        borderColor: isActive ? 'var(--theme-accent, #a78bfa)' : 'rgba(255,255,255,0.12)',
                        backgroundColor: isActive ? 'color-mix(in srgb, var(--theme-accent, #a78bfa) 18%, transparent)' : 'rgba(255,255,255,0.04)',
                        color: isActive ? '#ffffff' : 'var(--theme-text-secondary)',
                      }}
                    >
                      {s.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto px-5 pb-6 space-y-3 text-sm leading-6 text-gray-300">

              {active === 'game' && (
                <>
                  <p>Joybit is a Match-3 game on Base with a USDC gameplay economy. Connect your wallet, start a session, and push your score before moves or time run out.</p>

                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 space-y-2">
                    <h3 className="mb-1 text-xs font-semibold text-white sm:text-sm">How Joybit Works</h3>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Start a Match-3 session from the <strong>Game</strong> page.</li>
                      <li>Gameplay actions are paid in <strong>USDC</strong> (start, continue, boosters).</li>
                      <li>Session results update leaderboard/stats, and signed rewards are credited.</li>
                      <li>Claim pending rewards from your <strong>Profile</strong>.</li>
                    </ol>
                    <p className="text-xs text-gray-400">Fees are charged in USDC. Gas is paid in Base ETH by the wallet sending each transaction.</p>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 space-y-2">
                    <h3 className="mb-1 text-xs font-semibold text-white sm:text-sm">How To Play</h3>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Connect your wallet on the home screen.</li>
                      <li>Go to <strong>Game</strong> and tap <strong>Start from Level 1</strong> or <strong>Continue</strong>.</li>
                      <li>Tap a tile, then tap an adjacent tile to swap them.</li>
                      <li>Match 3 or more tiles of the same colour to clear them and score points.</li>
                      <li>Reach the target score before moves or time run out to win the level.</li>
                      <li>Each level gets harder — higher target score, fewer moves.</li>
                    </ol>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 space-y-2">
                    <h3 className="mb-1 text-xs font-semibold text-white sm:text-sm">Boosters</h3>
                    <ul className="space-y-1">
                      <li>🔨 <strong>Hammer</strong> — tap any single tile to remove it instantly.</li>
                      <li>🔀 <strong>Shuffle</strong> — reshuffles all tiles on the board.</li>
                      <li>💣 <strong>Color Bomb</strong> — tap a tile to remove every tile of that colour.</li>
                    </ul>
                    <p className="text-xs text-gray-400">Buy boosters from the shop during or before a game.</p>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                    <h3 className="mb-1 text-xs font-semibold text-white sm:text-sm">Free Play</h3>
                    <p>Play, continue, and booster costs are configured in USDC by the game contract. Fees route through Treasury and are split into protocol fees and reward pool.</p>
                  </div>
                </>
              )}

              {active === 'scoring' && (
                <>
                  <p>Your leaderboard score is the cumulative score you accumulate across all games. Higher scores move you up the leaderboard and into the weekly reward pool.</p>

                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 space-y-2">
                    <h3 className="mb-1 text-xs font-semibold text-white sm:text-sm">How Score Is Calculated</h3>
                    <ul className="space-y-1">
                      <li>Every tile match adds to your in-game score.</li>
                      <li>Longer chains and combos score more.</li>
                      <li>Winning a level adds bonus points on top.</li>
                      <li>Your best game score per address is stored on the leaderboard.</li>
                    </ul>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 space-y-1">
                    <h3 className="mb-1 text-xs font-semibold text-white sm:text-sm">Leaderboard Ranking</h3>
                    <p>Rankings are decided purely by leaderboard score. The higher your score, the higher your rank. At the end of each weekly or monthly period, top players receive configured reward-token payouts based on rank.</p>
                  </div>
                </>
              )}

              {active === 'rewards' && (
                <>
                  <p>Joybit runs <strong>Weekly</strong> and <strong>Monthly</strong> reward cycles. At the end of each period, top-ranked players share the funded reward pool.</p>

                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 space-y-2">
                    <h3 className="mb-1 text-xs font-semibold text-white sm:text-sm">How The Reward Cycle Works</h3>
                    <ol className="list-decimal list-inside space-y-1">
                      <li><strong>Admin finalizes the epoch</strong> — a snapshot of the leaderboard is taken at the end of the week/month. Top N players are ranked by score and their reward amounts are calculated.</li>
                      <li><strong>Admin funds the epoch</strong> — reward tokens are allocated to cover the configured payouts.</li>
                      <li><strong>Admin distributes</strong> — rewards are marked as claimable in the database and the leaderboard resets automatically for the next cycle.</li>
                      <li><strong>Players claim</strong> — eligible players go to Profile to claim rewards on-chain.</li>
                    </ol>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 space-y-2">
                    <h3 className="mb-1 text-xs font-semibold text-white sm:text-sm">Payout Split</h3>
                    <p>The admin sets the number of winners (Top N) and a percentage split per rank. For example with 10 winners:</p>
                    <div className="grid grid-cols-5 gap-1 text-center text-xs mt-2">
                      {['#1','#2','#3','#4','#5','#6','#7','#8','#9','#10'].map((r, i) => (
                        <div key={r} className="rounded bg-white/10 px-1 py-1.5">
                          <div className="font-bold text-white">{r}</div>
                          <div className="text-gray-400">{['25%','20%','15%','10%','8%','7%','5%','4%','3%','3%'][i]}</div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Exact amounts depend on the total pool size configured by the admin.</p>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                    <h3 className="mb-1 text-xs font-semibold text-white sm:text-sm">Leaderboard Reset</h3>
                    <p>When a weekly or monthly epoch is distributed, the leaderboard resets automatically. Every new cycle is a fresh competition. Your stats (games played, high score) are kept separately.</p>
                  </div>
                </>
              )}

              {active === 'leaderboard' && (
                <>
                  <p>The leaderboard shows the top 50 players ranked by their best score this cycle. It resets at the end of each weekly or monthly reward period.</p>

                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 space-y-2">
                    <h3 className="mb-1 text-xs font-semibold text-white sm:text-sm">Tips To Rank Higher</h3>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Focus on large combos — cascades multiply your score.</li>
                      <li>Use boosters strategically to clear difficult boards.</li>
                      <li>Win levels consistently — each win adds bonus score.</li>
                      <li>Play regularly during the week to push your score up before the snapshot.</li>
                    </ul>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                    <h3 className="mb-1 text-xs font-semibold text-white sm:text-sm">When Is The Snapshot Taken?</h3>
                    <p>The admin manually finalizes the epoch at the end of the period (weekly = end of week, monthly = end of month). Scores at that exact moment determine the winner rankings.</p>
                  </div>
                </>
              )}

              {active === 'claim' && (
                <>
                  <p>If you are in the top N for a completed weekly or monthly epoch, your reward will appear in your <strong>Profile</strong> page as a pending claim.</p>

                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 space-y-2">
                    <h3 className="mb-1 text-xs font-semibold text-white sm:text-sm">How To Claim</h3>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Go to <strong>Profile</strong>.</li>
                      <li>Scroll to the <strong>Pending Rewards</strong> section.</li>
                      <li>Tap <strong>Claim All</strong> or claim a specific token.</li>
                      <li>Approve the transaction in your wallet.</li>
                      <li>Reward tokens are sent directly to your wallet from the Treasury contract.</li>
                    </ol>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 space-y-1">
                    <h3 className="mb-1 text-xs font-semibold text-white sm:text-sm">Seasonal History</h3>
                    <p>Past distributed rewards are shown under <strong>Seasonal Rewards</strong> in your Profile, including the epoch period, your rank, score, and amount received.</p>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                    <h3 className="mb-1 text-xs font-semibold text-white sm:text-sm">Multi-Token Support</h3>
                    <p>Each epoch specifies a reward token. You can claim pending rewards directly from your Profile once distribution is completed.</p>
                  </div>
                </>
              )}

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
