'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface InfoModalProps {
  isOpen: boolean
  onClose: () => void
}

const SECTIONS = [
  { id: 'game',      label: '🎮 Game' },
  { id: 'scoring',   label: '⭐ Scoring' },
  { id: 'rewards',   label: '🎁 Rewards' },
  { id: 'leaderboard', label: '🏆 Leaderboard' },
  { id: 'claim',     label: '💰 Claiming' },
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
            <div className="flex items-center justify-between gap-4 px-5 pt-5 pb-3 shrink-0">
              <h2 className="text-xl font-black">How Joybit Works</h2>
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
            <div className="flex gap-1 overflow-x-auto px-5 pb-3 shrink-0 scrollbar-none">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActive(s.id)}
                  className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition"
                  style={{
                    backgroundColor: active === s.id ? 'var(--theme-accent, #a78bfa)' : 'rgba(255,255,255,0.07)',
                    color: active === s.id ? '#000' : '#ccc',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="overflow-y-auto px-5 pb-6 space-y-3 text-sm leading-6 text-gray-300">

              {active === 'game' && (
                <>
                  <p>Joybit is a Match-3 game on Base. Connect your wallet, pay a small ETH fee to play, match tiles, and score as high as possible before time or moves run out.</p>

                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 space-y-2">
                    <h3 className="font-bold text-white">How to play</h3>
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
                    <h3 className="font-bold text-white">Boosters</h3>
                    <ul className="space-y-1">
                      <li>🔨 <strong>Hammer</strong> — tap any single tile to remove it instantly.</li>
                      <li>🔀 <strong>Shuffle</strong> — reshuffles all tiles on the board.</li>
                      <li>💣 <strong>Color Bomb</strong> — tap a tile to remove every tile of that colour.</li>
                    </ul>
                    <p className="text-xs text-gray-400">Buy boosters from the shop during or before a game.</p>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                    <h3 className="mb-1 font-bold text-white">Free play</h3>
                    <p>New players get a free first game. After that, each session costs a small ETH play fee set by the contract. Fees fund the Treasury, which funds weekly rewards.</p>
                  </div>
                </>
              )}

              {active === 'scoring' && (
                <>
                  <p>Your leaderboard score is the cumulative score you accumulate across all games. Higher scores move you up the leaderboard and into the weekly reward pool.</p>

                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 space-y-2">
                    <h3 className="font-bold text-white">How score is calculated</h3>
                    <ul className="space-y-1">
                      <li>Every tile match adds to your in-game score.</li>
                      <li>Longer chains and combos score more.</li>
                      <li>Winning a level adds bonus points on top.</li>
                      <li>Your best game score per address is stored on the leaderboard.</li>
                    </ul>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 space-y-1">
                    <h3 className="mb-1 font-bold text-white">Leaderboard ranking</h3>
                    <p>Rankings are decided purely by leaderboard score. The higher your score, the higher your rank. At the end of each weekly or monthly period, the top players receive JOYB rewards based on their rank.</p>
                  </div>
                </>
              )}

              {active === 'rewards' && (
                <>
                  <p>Joybit runs a <strong>Weekly</strong> and <strong>Monthly</strong> reward system. At the end of each period, the top-ranked players share a reward pool funded in JOYB (or other supported tokens).</p>

                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 space-y-2">
                    <h3 className="font-bold text-white">How the reward cycle works</h3>
                    <ol className="list-decimal list-inside space-y-1">
                      <li><strong>Admin finalizes the epoch</strong> — a snapshot of the leaderboard is taken at the end of the week/month. Top N players are ranked by score and their reward amounts are calculated.</li>
                      <li><strong>Admin funds the epoch</strong> — JOYB tokens are sent to the Treasury contract to cover the reward amounts.</li>
                      <li><strong>Admin distributes</strong> — rewards are marked as claimable in the database and the leaderboard resets automatically for the next cycle.</li>
                      <li><strong>Players claim</strong> — eligible players go to their Profile to claim JOYB rewards on-chain.</li>
                    </ol>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 space-y-2">
                    <h3 className="font-bold text-white">Payout split</h3>
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
                    <h3 className="mb-1 font-bold text-white">Leaderboard reset</h3>
                    <p>When a weekly or monthly epoch is distributed, the leaderboard resets automatically. Every new cycle is a fresh competition. Your stats (games played, high score) are kept separately.</p>
                  </div>
                </>
              )}

              {active === 'leaderboard' && (
                <>
                  <p>The leaderboard shows the top 50 players ranked by their best score this cycle. It resets at the end of each weekly or monthly reward period.</p>

                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 space-y-2">
                    <h3 className="font-bold text-white">Tips to rank higher</h3>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Focus on large combos — cascades multiply your score.</li>
                      <li>Use boosters strategically to clear difficult boards.</li>
                      <li>Win levels consistently — each win adds bonus score.</li>
                      <li>Play regularly during the week to push your score up before the snapshot.</li>
                    </ul>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                    <h3 className="mb-1 font-bold text-white">When is the snapshot taken?</h3>
                    <p>The admin manually finalizes the epoch at the end of the period (weekly = end of week, monthly = end of month). Scores at that exact moment determine the winner rankings.</p>
                  </div>
                </>
              )}

              {active === 'claim' && (
                <>
                  <p>If you are in the top N for a completed weekly or monthly epoch, your reward will appear in your <strong>Profile</strong> page as a pending claim.</p>

                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 space-y-2">
                    <h3 className="font-bold text-white">How to claim</h3>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Go to <strong>Profile</strong>.</li>
                      <li>Scroll to the <strong>Pending Rewards</strong> section.</li>
                      <li>Tap <strong>Claim All</strong> or claim a specific token.</li>
                      <li>Approve the transaction in your wallet.</li>
                      <li>JOYB (or other tokens) are sent directly to your wallet from the Treasury contract.</li>
                    </ol>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 space-y-1">
                    <h3 className="mb-1 font-bold text-white">Seasonal history</h3>
                    <p>Past distributed rewards are shown under <strong>Seasonal Rewards</strong> in your Profile, including the epoch period, your rank, score, and amount received.</p>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                    <h3 className="mb-1 font-bold text-white">Multi-token support</h3>
                    <p>Rewards can be paid in JOYB or other supported tokens (e.g. USDC). Each epoch specifies its own token. You can claim each token independently from your Profile.</p>
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
