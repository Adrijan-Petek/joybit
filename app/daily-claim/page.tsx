'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAccount } from 'wagmi'
import { formatEther } from 'viem'
import { WalletButton } from '@/components/WalletButton'
import { AudioButtons } from '@/components/AudioButtons'
import { SettingsButton } from '@/components/SettingsButton'
import { useAudio } from '@/components/audio/AudioContext'
import { useDailyClaim, useClaimData } from '@/lib/hooks/useDailyClaim'
import { notifyDailyReward } from '@/lib/utils/farcasterNotifications'
import { calculateLeaderboardPoints } from '@/lib/utils/scoring'
import { getStorageItem, setStorageItem } from '@/lib/utils/storage'

export default function DailyClaim() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { playMusic } = useAudio()
  const [mounted, setMounted] = useState(false)

  const { claimDaily, isClaiming, isSuccess } = useDailyClaim()
  const { playerData, canClaim, claimableReward, timeUntilNext, baseReward, streakBonus, refetch } = useClaimData(address)

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
    if (isSuccess) {
      refetch()
    }
  }, [isSuccess, refetch])

  // Monitor for available daily rewards and send notifications
  useEffect(() => {
    const checkAndNotify = async () => {
      if (!mounted || !address || !canClaim || !claimableReward) return

      // Check if we've already notified about today's reward
      const today = new Date().toDateString()
      const notificationKey = `joybit_daily_notified_${address}_${today}`
      const lastNotified = await getStorageItem(notificationKey)

      if (!lastNotified) {
        const rewardAmount = formatEther(claimableReward)
        notifyDailyReward(rewardAmount)

        // Mark as notified for today
        setStorageItem(notificationKey, 'true').catch(error => {
          console.warn('Failed to save daily notification:', error)
        })
      }
    }

    checkAndNotify()
  }, [canClaim, claimableReward, mounted, address])

  const handleClaim = async () => {
    if (!canClaim || !isConnected || !address) return

    try {
      const rewardAmount = formatEther(claimableReward || 0n)
      await claimDaily()

      // Send notification for successful daily claim
      notifyDailyReward(rewardAmount)
      
      // Update database stats after successful claim
      try {
        const newTotalClaims = totalClaims + 1
        const newCurrentStreak = currentStreak + 1

        // Update user_stats with increment for claims
        await fetch('/api/achievements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'increment_stats',
            userAddress: address,
            stats: {
              daily_total_claims: 1
            }
          })
        })

        // Set streak and timestamp separately
        await fetch('/api/achievements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_stats',
            userAddress: address,
            stats: {
              daily_current_streak: newCurrentStreak,
              daily_last_claim: Date.now()
            }
          })
        })

        console.log(`✅ Daily claim stats updated in database`)
      } catch (dbError) {
        console.error('Failed to update daily claim stats in database:', dbError)
      }
      
      // Update leaderboard (scores calculated automatically from stats)
      console.log(`✅ Daily claim leaderboard updated`)
    } catch (error) {
      console.error('Failed to claim:', error)
    }
  }

  if (!mounted) return null

  const currentStreak = playerData ? Number(playerData[1]) : 0
  const totalClaims = playerData ? Number(playerData[2]) : 0
  const totalClaimed = playerData ? BigInt(playerData[3]) : 0n
  
  const reward = claimableReward || 0n
  const base = baseReward || 0n
  const streakBonusAmount = reward - base

  const timeRemaining = timeUntilNext ? Number(timeUntilNext) : 0
  const hours = Math.floor(timeRemaining / 3600)
  const minutes = Math.floor((timeRemaining % 3600) / 60)

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-2 md:p-3">
      <div className="fixed top-2 right-2 md:top-3 md:right-3 z-50 flex items-center gap-2">
        <AudioButtons />
        <SettingsButton />
        <WalletButton />
      </div>
      <div className="container mx-auto max-w-xl md:max-w-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-3 md:mb-4">
          <button
            onClick={() => router.push('/')}
            className="bg-cyan-500 hover:bg-cyan-600 px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition-all text-xs md:text-sm"
          >
            ← Back
          </button>
          <h1 className="text-lg md:text-2xl font-bold">🎁 Daily Rewards</h1>
          <div className="w-12 md:w-16"></div>
        </div>

        {/* Streak Display */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-900/70 backdrop-blur-lg rounded-lg p-3 md:p-4 mb-3 text-center border border-gray-800"
        >
          <div className="text-3xl md:text-4xl mb-1.5">🔥</div>
          <h2 className="text-xl md:text-2xl font-bold mb-1">{currentStreak} Day Streak!</h2>
          <p className="text-xs md:text-sm text-gray-400">Keep claiming daily to increase your rewards!</p>
          {timeRemaining > 0 && !canClaim && (
            <p className="text-xs md:text-sm text-yellow-400 mt-2">
              Next claim available in {hours}h {minutes}m
            </p>
          )}
        </motion.div>

        {/* Reward Info */}
        <div className="grid md:grid-cols-2 gap-3 mb-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-900/70 backdrop-blur-lg rounded-lg p-3 md:p-4 border border-gray-800"
          >
            <h3 className="text-sm md:text-base font-bold mb-2">Today&apos;s Reward</h3>
            <div className="text-2xl md:text-3xl font-bold text-green-400 mb-1">
              {formatEther(reward)} JOYB
            </div>
            <p className="text-xs md:text-sm text-gray-400">
              Base: {formatEther(base)} JOYB
              {streakBonusAmount > 0n && ` + Streak: ${formatEther(streakBonusAmount)} JOYB`}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-900/70 backdrop-blur-lg rounded-lg p-3 md:p-4 border border-gray-800"
          >
            <h3 className="text-sm md:text-base font-bold mb-2">Total Claimed</h3>
            <div className="text-2xl md:text-3xl font-bold text-blue-400 mb-1">
              {formatEther(totalClaimed)} JOYB
            </div>
            <p className="text-xs md:text-sm text-gray-400">
              {totalClaims} {totalClaims === 1 ? 'claim' : 'claims'} • Lifetime earnings
            </p>
          </motion.div>
        </div>

        {/* Streak Bonus Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/50 rounded-lg p-3 md:p-4 mb-4"
        >
          <h3 className="text-sm md:text-base font-bold mb-2 text-orange-400">🔥 Streak Bonus</h3>
          <p className="text-xs md:text-sm text-gray-300">
            Earn an extra <span className="text-yellow-400 font-bold">{formatEther(streakBonus || 0n)} JOYB</span> per day of your streak!
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Your current bonus: {formatEther(BigInt(currentStreak) * (streakBonus || 0n))} JOYB
          </p>
          <p className="text-xs text-red-300 mt-2">
            ⚠️ Claim within 48 hours to maintain your streak!
          </p>
        </motion.div>

        {/* Claim Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          {isSuccess ? (
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 md:p-5">
              <div className="text-3xl md:text-4xl mb-2">✅</div>
              <h2 className="text-lg md:text-xl font-bold mb-1">Claimed Successfully!</h2>
              <p className="text-sm md:text-base text-green-300 mb-1">
                You received {formatEther(reward)} JOYB
              </p>
              <p className="text-xs md:text-sm text-gray-400">Come back tomorrow for your next reward!</p>
            </div>
          ) : (
            <button
              onClick={handleClaim}
              disabled={!canClaim || !isConnected || isClaiming}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 md:py-4 md:px-8 rounded-lg text-sm md:text-base transition-all duration-300 transform hover:scale-105 shadow-2xl disabled:cursor-not-allowed"
            >
              {isClaiming 
                ? 'Claiming...' 
                : !isConnected 
                ? 'Connect Wallet to Claim' 
                : !canClaim 
                ? `Available in ${hours}h ${minutes}m`
                : 'Claim Daily Reward'}
            </button>
          )}
        </motion.div>

        {/* Streak Milestones */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-4 bg-gray-900/70 backdrop-blur-lg rounded-lg p-3 md:p-4 border border-gray-800"
        >
          <h3 className="text-sm md:text-base font-bold mb-3 text-center">🏆 Streak Milestones</h3>
          <div className="space-y-2">
            <div className={`flex justify-between items-center p-2 rounded ${currentStreak >= 7 ? 'bg-green-500/20' : 'bg-gray-800/50'}`}>
              <span className="text-xs md:text-sm">7 Days</span>
              <span className="text-xs md:text-sm font-bold">{currentStreak >= 7 ? '✅' : '🔒'}</span>
            </div>
            <div className={`flex justify-between items-center p-2 rounded ${currentStreak >= 30 ? 'bg-green-500/20' : 'bg-gray-800/50'}`}>
              <span className="text-xs md:text-sm">30 Days</span>
              <span className="text-xs md:text-sm font-bold">{currentStreak >= 30 ? '✅' : '🔒'}</span>
            </div>
            <div className={`flex justify-between items-center p-2 rounded ${currentStreak >= 100 ? 'bg-green-500/20' : 'bg-gray-800/50'}`}>
              <span className="text-xs md:text-sm">100 Days</span>
              <span className="text-xs md:text-sm font-bold">{currentStreak >= 100 ? '✅' : '🔒'}</span>
            </div>
            <div className={`flex justify-between items-center p-2 rounded ${currentStreak >= 365 ? 'bg-green-500/20' : 'bg-gray-800/50'}`}>
              <span className="text-xs md:text-sm">365 Days</span>
              <span className="text-xs md:text-sm font-bold">{currentStreak >= 365 ? '✅ LEGEND' : '🔒'}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
