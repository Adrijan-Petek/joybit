'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAccount } from 'wagmi'
import { WalletButton } from '@/components/WalletButton'
import { AudioButtons } from '@/components/AudioButtons'
import { SettingsButton } from '@/components/SettingsButton'
import { useAudio } from '@/components/audio/AudioContext'
import { useLeaderboard } from '@/lib/hooks/useLeaderboard'

export default function Leaderboard() {
  const router = useRouter()
  const { address } = useAccount()
  const { playMusic } = useAudio()
  const [mounted, setMounted] = useState(false)
  const { leaderboard: globalLeaderboard, loading: leaderboardLoading, error: leaderboardError, refetch } = useLeaderboard()
  const [myRank, setMyRank] = useState<number>(0)

  useEffect(() => {
    setMounted(true)
    playMusic('main-menu')
    
    // Initialize Farcaster SDK
    const initSDK = async () => {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk')
        await sdk.actions.ready()
      } catch (error) {
        console.log('Not in Farcaster Mini App context')
      }
    }
    
    initSDK()
  }, [playMusic])

  useEffect(() => {
    if (!address) return

    // Find user's rank in global leaderboard
    const rank = globalLeaderboard.findIndex(p => p.address.toLowerCase() === address.toLowerCase()) + 1
    setMyRank(rank || 0)
  }, [address, globalLeaderboard])

  if (!mounted) return null

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇'
      case 2:
        return '🥈'
      case 3:
        return '🥉'
      default:
        return `${rank}`
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-2 md:p-3">
      <div className="fixed top-2 right-2 md:top-3 md:right-3 z-50 flex items-center gap-2">
        <AudioButtons />
        <SettingsButton />
        <WalletButton />
      </div>
      <div className="container mx-auto max-w-xl md:max-w-2xl pt-12">
        {/* Header */}
        <div className="flex justify-between items-center mb-3 md:mb-4">
          <button
            onClick={() => router.push('/')}
            className="bg-cyan-500 hover:bg-cyan-600 px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition-all text-xs md:text-sm"
          >
            ← Back
          </button>
          <h1 className="text-lg md:text-2xl font-bold">🏆 Leaderboard</h1>
          <div className="w-12 md:w-16"></div>
        </div>

        {/* Score Calculation Info */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/50 rounded-lg p-2 md:p-3 mb-3 text-xs"
        >
          <h3 className="text-lg font-semibold mb-1 text-purple-300">📊 Scoring System</h3>
          <div className="grid grid-cols-2 gap-1 text-gray-300">
            <div>• Match-3 Win: <span className="text-green-400">100 pts</span></div>
            <div>• Match-3 Game: <span className="text-green-400">50 pts</span></div>
            <div>• Card Win: <span className="text-blue-400">150 pts</span></div>
            <div>• Card Game: <span className="text-blue-400">30 pts</span></div>
            <div>• Daily Claim: <span className="text-yellow-400">80 pts</span></div>
            <div>• Streak Day: <span className="text-yellow-400">20 pts</span></div>
          </div>
        </motion.div>

        {/* To-Do List */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-green-600/20 to-blue-600/20 border border-green-500/50 rounded-lg p-2 md:p-3 mb-3"
        >
          <h3 className="text-lg font-semibold mb-2 text-green-300">✅ Daily Tasks</h3>
          <div className="space-y-1 text-xs md:text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-400">🎮</span>
              <span>Play Match-3 Game (+50 pts)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-400">🃏</span>
              <span>Play Card Game (+30 pts)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">💰</span>
              <span>Claim Daily Reward (+80 pts)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-purple-400">🔥</span>
              <span>Maintain Streak (+20 pts/day)</span>
            </div>
          </div>
        </motion.div>

        {/* Leaderboard Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/70 backdrop-blur-lg rounded-lg overflow-hidden border border-gray-800 mb-3"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-2 md:px-3 py-2 text-left">Rank</th>
                  <th className="px-2 md:px-3 py-2 text-left">Player</th>
                  <th className="px-2 md:px-3 py-2 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardLoading ? (
                  <tr>
                    <td colSpan={3} className="px-2 md:px-3 py-8 text-center text-gray-400">
                      Loading global leaderboard...
                    </td>
                  </tr>
                ) : leaderboardError ? (
                  <tr>
                    <td colSpan={3} className="px-2 md:px-3 py-8 text-center">
                      <div className="text-red-400 mb-2">⚠️ {leaderboardError}</div>
                      <button 
                        onClick={() => refetch()}
                        className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded text-sm"
                      >
                        Retry
                      </button>
                    </td>
                  </tr>
                ) : globalLeaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-2 md:px-3 py-8 text-center text-gray-400">
                      No scores yet. Be the first to play!
                    </td>
                  </tr>
                ) : (
                  globalLeaderboard.map((entry, index) => (
                  <motion.tr
                    key={entry.address}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`border-t border-white/10 hover:bg-white/5 transition-colors ${
                      entry.address.toLowerCase() === address?.toLowerCase() ? 'bg-blue-600/20' : ''
                    }`}
                  >
                    <td className="px-2 md:px-3 py-2">
                      <div className="text-sm md:text-base font-bold">{getRankEmoji(index + 1)}</div>
                    </td>
                    <td className="px-2 md:px-3 py-2 font-mono text-[10px] md:text-xs flex items-center gap-2">
                      {entry.pfp && (
                        <img 
                          src={entry.pfp} 
                          alt="PFP"
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      )}
                      <span>
                        {entry.username || `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`}
                        {entry.address.toLowerCase() === address?.toLowerCase() && (
                          <span className="ml-1 text-blue-400">(You)</span>
                        )}
                      </span>
                    </td>
                    <td className="px-2 md:px-3 py-2 text-right font-bold text-cyan-300">
                      {entry.score.toLocaleString()}
                    </td>
                  </motion.tr>
                ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Your Rank - Simple Display */}
        {address && myRank > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-3 md:p-4"
          >
            <h2 className="text-sm md:text-base font-bold mb-2">Your Rank</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xl md:text-2xl font-bold">#{myRank}</div>
                <div className="text-xs md:text-sm text-cyan-200">Global Rank</div>
              </div>
              <div>
                <div className="text-xl md:text-2xl font-bold">
                  {globalLeaderboard.find(p => p.address.toLowerCase() === address.toLowerCase())?.score.toLocaleString() || 0}
                </div>
                <div className="text-xs md:text-sm text-cyan-200">Total Score</div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
