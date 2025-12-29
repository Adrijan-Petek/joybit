'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { WalletButton } from '@/components/WalletButton'
import { AudioButtons } from '@/components/AudioButtons'
import { SettingsButton } from '@/components/SettingsButton'
import { useAudio } from '@/components/audio/AudioContext'
import { useTreasury, useTreasuryData } from '@/lib/hooks/useTreasury'
import { useMatch3GameData } from '@/lib/hooks/useMatch3Game'
import { useCardGameData } from '@/lib/hooks/useCardGame'
import { useClaimData } from '@/lib/hooks/useDailyClaim'
import { useMatch3Stats } from '@/lib/hooks/useMatch3Stats'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { notifyRewardAvailable } from '@/lib/utils/farcasterNotifications'
import { formatTokenBalance } from '@/lib/utils/tokenFormatting'
import AchievementNFTMinter from '@/components/AchievementNFTMinter'

export default function ProfilePage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { playMusic } = useAudio()
  const [mounted, setMounted] = useState(false)
  const [tokenImages, setTokenImages] = useState<Record<string, { image: string; symbol: string }>>({})
  const [showSharePrompt, setShowSharePrompt] = useState(false)
  const [claimCooldown, setClaimCooldown] = useState(false)
  const [selectedAchievement, setSelectedAchievement] = useState<any>(null)
  const [showAchievementModal, setShowAchievementModal] = useState(false)
  const [achievements, setAchievements] = useState<any[]>([])
  const [userAchievements, setUserAchievements] = useState<any[]>([])
  const [userStats, setUserStats] = useState<any>(null)

  const { claimRewards, isClaiming } = useTreasury()
  const { allPendingRewards, refetch: refetchTreasury } = useTreasuryData(address)
  const { playerData: match3Data, refetch: refetchMatch3 } = useMatch3GameData(address)
  const { playerData: cardData, refetch: refetchCard } = useCardGameData(address)
  const { playerData: claimData, refetch: refetchClaim } = useClaimData(address)
  const { stats: match3Stats, fetchStats: refetchMatch3Stats } = useMatch3Stats(address)

  // Fetch achievements and user data from database
  const fetchAchievementsData = async () => {
    try {
      console.log('Fetching achievements data for address:', address)

      // Fetch all achievements
      const achievementsResponse = await fetch(`/api/achievements?action=all`)
      const allAchievements = await achievementsResponse.json()
      console.log('All achievements:', allAchievements)

      if (!address) {
        // Show all achievements as locked if no wallet connected
        const achievementsWithStatus = allAchievements.map((achievement: any) => {
          // Add visual styling based on rarity
          let gradient = 'from-gray-500/20 to-gray-600/20'
          let border = 'border-gray-500/30'
          let textColor = 'text-gray-400'

          switch (achievement.rarity) {
            case 'Common':
              gradient = 'from-yellow-500/20 to-orange-500/20'
              border = 'border-yellow-500/30'
              textColor = 'text-yellow-400'
              break
            case 'Rare':
              gradient = 'from-blue-500/20 to-cyan-500/20'
              border = 'border-blue-500/30'
              textColor = 'text-blue-400'
              break
            case 'Epic':
              gradient = 'from-purple-500/20 to-pink-500/20'
              border = 'border-purple-500/30'
              textColor = 'text-purple-400'
              break
            case 'Legendary':
              gradient = 'from-teal-500/20 to-cyan-500/20'
              border = 'border-teal-500/30'
              textColor = 'text-teal-400'
              break
            case 'Mythic':
              gradient = 'from-rose-500/20 to-red-500/20'
              border = 'border-rose-500/30'
              textColor = 'text-rose-400'
              break
          }

          return {
            ...achievement,
            unlocked: false,
            gradient,
            border,
            textColor,
            unlocked_at: null,
            minted: false
          }
        })
        setAchievements(achievementsWithStatus)
        setUserAchievements([])
        setUserStats(null)
        return
      }

      // Fetch user achievements
      const userAchievementsResponse = await fetch(`/api/achievements?action=achievements&address=${address}`)
      const userAchievementData = await userAchievementsResponse.json()
      console.log('User achievements:', userAchievementData)

      // Fetch user stats
      const userStatsResponse = await fetch(`/api/achievements?action=stats&address=${address}`)
      const userStatsData = await userStatsResponse.json()
      console.log('User stats:', userStatsData)

      // Combine achievements with unlock status
      const achievementsWithStatus = allAchievements.map((achievement: any) => {
        const userAchievement = userAchievementData.find((ua: any) => ua.achievement_id === achievement.id)
        const unlocked = !!userAchievement

        // Add visual styling based on rarity
        let gradient = 'from-gray-500/20 to-gray-600/20'
        let border = 'border-gray-500/30'
        let textColor = 'text-gray-400'

        switch (achievement.rarity) {
          case 'Common':
            gradient = 'from-yellow-500/20 to-orange-500/20'
            border = 'border-yellow-500/30'
            textColor = 'text-yellow-400'
            break
          case 'Rare':
            gradient = 'from-blue-500/20 to-cyan-500/20'
            border = 'border-blue-500/30'
            textColor = 'text-blue-400'
            break
          case 'Epic':
            gradient = 'from-purple-500/20 to-pink-500/20'
            border = 'border-purple-500/30'
            textColor = 'text-purple-400'
            break
          case 'Legendary':
            gradient = 'from-teal-500/20 to-cyan-500/20'
            border = 'border-teal-500/30'
            textColor = 'text-teal-400'
            break
          case 'Mythic':
            gradient = 'from-rose-500/20 to-red-500/20'
            border = 'border-rose-500/30'
            textColor = 'text-rose-400'
            break
        }

        return {
          ...achievement,
          unlocked,
          gradient,
          border,
          textColor,
          unlocked_at: userAchievement?.unlocked_at,
          minted: userAchievement?.minted || false
        }
      })

      setAchievements(achievementsWithStatus)
      setUserAchievements(userAchievementData)
      setUserStats(userStatsData)

      console.log('Final achievements with status:', achievementsWithStatus)
      console.log('Achievements array length:', achievementsWithStatus.length)
    } catch (error) {
      console.error('Error fetching achievements data:', error)
    }
  }

  // Sort achievements: unlocked first, then by rarity
  const sortedAchievements = achievements.sort((a, b) => {
    // Unlocked achievements come first
    if (a.unlocked && !b.unlocked) return -1
    if (!a.unlocked && b.unlocked) return 1
    
    // Then sort by rarity (Mythic > Legendary > Epic > Rare > Common)
    const rarityOrder = { 'Mythic': 5, 'Legendary': 4, 'Epic': 3, 'Rare': 2, 'Common': 1 }
    return (rarityOrder[b.rarity as keyof typeof rarityOrder] || 0) - (rarityOrder[a.rarity as keyof typeof rarityOrder] || 0)
  })

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

    // Fetch achievements data
    fetchAchievementsData()
  }, [playMusic, address])

  // Load token metadata
  useEffect(() => {
    if (!mounted) return

    const loadTokenMetadata = async () => {
      try {
        console.log('🔄 Loading token metadata...')
        let tokenImagesData: Record<string, { image: string; symbol: string }> = {}

        // Load from localStorage first (same as admin panel)
        const saved = localStorage.getItem('joybit_token_images')
        if (saved) {
          tokenImagesData = JSON.parse(saved)
          console.log('📦 Token metadata from localStorage:', tokenImagesData)
        }

        // Also load from API and merge (API data takes precedence)
        try {
          const response = await fetch('/api/token-metadata')
          if (response.ok) {
            const data = await response.json()
            console.log('📡 Token metadata from API:', data)
            tokenImagesData = { ...tokenImagesData, ...data } // Merge: API overrides localStorage
            console.log('🔀 Merged token metadata:', tokenImagesData)
          }
        } catch (error) {
          console.error('⚠️ Failed to load token metadata from API:', error)
        }

        setTokenImages(tokenImagesData)
      } catch (error) {
        console.error('❌ Error loading token metadata:', error)
      }
    }

    loadTokenMetadata()

    // Reload when window gains focus (for when returning from admin panel)
    const handleFocus = () => loadTokenMetadata()
    window.addEventListener('focus', handleFocus)

    return () => window.removeEventListener('focus', handleFocus)
  }, [mounted])

  // Auto-refresh data when page loads
  useEffect(() => {
    if (address) {
      refetchMatch3?.()
      refetchCard?.()
      refetchClaim?.()
      refetchTreasury()
    }
  }, [address, refetchMatch3, refetchCard, refetchClaim, refetchTreasury])

  // Monitor for new pending rewards and send notifications
  useEffect(() => {
    if (!mounted || !allPendingRewards || !address) return

    // Check if user has pending rewards that weren't there before
    const hasPendingRewards = allPendingRewards.tokens.length > 0

    if (hasPendingRewards) {
      // Check if we've already notified about these rewards
      const notificationKey = `joybit_rewards_notified_${address}`
      const lastNotified = localStorage.getItem(notificationKey)

      // Only notify if we haven't notified recently (within last hour)
      const now = Date.now()
      const oneHour = 60 * 60 * 1000

      if (!lastNotified || (now - parseInt(lastNotified)) > oneHour) {
        // Calculate total pending amount
        const totalPending = allPendingRewards.amounts.reduce((sum, amount) => sum + amount, 0n)
        const firstTokenAddress = allPendingRewards.tokens[0]
        const tokenData = tokenImages[firstTokenAddress.toLowerCase()]
        const tokenSymbol = tokenData?.symbol || (firstTokenAddress.toLowerCase() === CONTRACT_ADDRESSES.joybitToken.toLowerCase() ? 'JOYB' : 'tokens')

        notifyRewardAvailable(formatTokenBalance(totalPending), tokenSymbol)

        // Mark as notified
        localStorage.setItem(notificationKey, now.toString())
      }
    }
  }, [allPendingRewards, mounted, address, tokenImages])

  // Sync blockchain stats with database
  useEffect(() => {
    const syncStatsWithDatabase = async () => {
      if (!address || !match3Stats || !cardData || !claimData) return

      try {
        const currentStats = {
          match3_games_played: match3Stats.gamesPlayed || 0,
          match3_high_score: match3Stats.highScore || 0,
          match3_high_score_level: match3Stats.highScoreLevel || 0,
          match3_last_played: match3Stats.lastPlayed || 0,
          card_games_played: cardData && Array.isArray(cardData) ? Number(cardData[1]) || 0 : 0,
          card_games_won: cardData && Array.isArray(cardData) ? Number(cardData[2]) || 0 : 0,
          card_last_played: Date.now(),
          daily_total_claims: claimData && Array.isArray(claimData) ? Number(claimData[3]) || 0 : 0,
          daily_current_streak: claimData && Array.isArray(claimData) ? Number(claimData[1]) || 0 : 0,
          daily_last_claim: Date.now(),
          last_login: Date.now()
        }

        const response = await fetch('/api/achievements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_stats',
            userAddress: address,
            stats: currentStats
          })
        })

        const result = await response.json()
        if (result.unlockedAchievements && result.unlockedAchievements.length > 0) {
          console.log('New achievements unlocked:', result.unlockedAchievements)
          // Refresh achievements data
          fetchAchievementsData()
        }
      } catch (error) {
        console.error('Error syncing stats with database:', error)
      }
    }

    syncStatsWithDatabase()
  }, [address, match3Stats, cardData, claimData])

  const handleRefresh = () => {
    refetchMatch3?.()
    refetchCard?.()
    refetchClaim?.()
    refetchTreasury()
    refetchMatch3Stats()
  }

  const handleClaimRewards = async () => {
    if (!isConnected || !allPendingRewards || allPendingRewards.tokens.length === 0) return

    // Show share prompt first
    setShowSharePrompt(true)
  }

  const handleShareAndClaim = async () => {
    if (!isConnected || !allPendingRewards || allPendingRewards.tokens.length === 0) return

    try {
      // Share on Farcaster first
      await handleShareResults()

      // Store the rewards before claiming for notification
      const rewardsBeforeClaim = allPendingRewards

      await claimRewards()
      refetchTreasury()

      // Set cooldown to prevent immediate re-claiming
      setClaimCooldown(true)
      setTimeout(() => setClaimCooldown(false), 5000) // 5 second cooldown

      // Send notification for claimed rewards
      if (rewardsBeforeClaim && rewardsBeforeClaim.tokens.length > 0) {
        // Calculate total claimed amount (simplified - just show first token for now)
        const totalClaimed = rewardsBeforeClaim.amounts.reduce((sum, amount) => sum + amount, 0n)
        const firstTokenAddress = rewardsBeforeClaim.tokens[0]
        const tokenData = tokenImages[firstTokenAddress.toLowerCase()]
        const tokenSymbol = tokenData?.symbol || (firstTokenAddress.toLowerCase() === CONTRACT_ADDRESSES.joybitToken.toLowerCase() ? 'JOYB' : 'tokens')

        notifyRewardAvailable(formatTokenBalance(totalClaimed), tokenSymbol)
      }

      // Hide share prompt
      setShowSharePrompt(false)
    } catch (error) {
      console.error('Failed to claim rewards:', error)
    }
  }

  const handleShareResults = async () => {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk')

      if (!await sdk.isInMiniApp()) {
        console.log('Not in Farcaster Mini App context - sharing skipped')
        return
      }

      // Get game stats for the message
      const match3Played = match3Stats.gamesPlayed || (match3Data && Array.isArray(match3Data) ? Number(match3Data[1]) || 0 : 0)
      const match3HighScore = match3Stats.highScore || 0
      const cardPlayed = cardData && Array.isArray(cardData) ? Number(cardData[1]) || 0 : 0
      const cardWon = cardData && Array.isArray(cardData) ? Number(cardData[2]) || 0 : 0

      // Create catchy share message
      const rewardsText = allPendingRewards.tokens.map((tokenAddress, index) => {
        const amount = allPendingRewards.amounts[index]
        const tokenData = tokenImages[tokenAddress.toLowerCase()]
        const symbol = tokenData?.symbol || (tokenAddress.toLowerCase() === CONTRACT_ADDRESSES.joybitToken.toLowerCase() ? 'JOYB' : tokenAddress.slice(0, 6) + '...')
        return `  ${formatTokenBalance(amount)} ${symbol}`
      }).join('\n')

      const shareText = `🎮 Just crushed it in Joybit!\n\n` +
        `🏆 Match-3: ${match3Played} games played, High Score: ${match3HighScore}\n` +
        `🃏 Card Game: ${cardPlayed} games, ${cardWon} wins\n` +
        `💰 Claiming rewards:\n${rewardsText}\n\n` +
        `Who's next? Come play and win big! 🚀\n\n` +
        `#Joybit #GameFi #MiniApp`

      // Share using Farcaster's composer
      const shareUrl = `${window.location.origin}/profile`
      await sdk.actions.openUrl({
        url: `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(shareUrl)}`
      })

      console.log('✅ Shared results on Farcaster!')
    } catch (error) {
      console.error('Failed to share on Farcaster:', error)
      // Continue with claiming even if sharing fails
    }
  }

  if (!mounted) return null

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-2 md:p-3">
        <div className="fixed top-2 right-2 md:top-3 md:right-3 z-50">
          <WalletButton />
        </div>
        
        <div className="container mx-auto max-w-xl md:max-w-2xl">
          <div className="flex justify-between items-center mb-3 md:mb-4">
            <button
              onClick={() => router.push('/')}
              className="bg-cyan-500 hover:bg-cyan-600 px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition-all text-xs md:text-sm"
            >
              ← Back
            </button>
            <h1 className="text-lg md:text-2xl font-bold">👤 Profile</h1>
            <div className="w-12 md:w-16"></div>
          </div>
          <div className="flex flex-col items-center justify-center min-h-[300px]">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Connect Your Wallet</h2>
            <ConnectButton />
          </div>
        </div>
      </div>
    )
  }

  // Parse Match3 data
  // PlayerData: [0]=lastFreePlayTime, [1]=gamesPlayed, [2]=gamesWon, [3]=hammers, [4]=shuffles, [5]=colorBombs
  console.log('Match3 Data:', match3Data)
  const match3Played = match3Data ? Number((match3Data as any)[1]) || 0 : 0
  console.log('Match3 Played:', match3Played)
  
  // Use database stats for high score and level
  const match3HighScore = match3Stats.highScore
  const match3HighScoreLevel = match3Stats.highScoreLevel
  
  // Parse Card game data
  // PlayerData: [0]=lastFreePlayTime, [1]=gamesPlayed, [2]=gamesWon, [3]=totalRewardsEarned
  const cardPlayed = cardData ? Number((cardData as any)[1]) || 0 : 0
  const cardWon = cardData ? Number((cardData as any)[2]) || 0 : 0
  const cardWinRate = cardPlayed > 0 ? ((cardWon / cardPlayed) * 100).toFixed(1) : '0.0'

  // Parse Daily claim data
  // PlayerData: [0]=lastClaimTime, [1]=currentStreak, [2]=totalClaims, [3]=totalRewardsEarned
  const currentStreak = claimData ? Number((claimData as any)[1]) || 0 : 0
  const totalClaimed = claimData ? ((claimData as any)[3] ? BigInt((claimData as any)[3]) : 0n) : 0n

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
            className="bg-white/10 hover:bg-white/20 px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition-all text-xs md:text-sm"
          >
            ← Back
          </button>
          <h1 className="text-lg md:text-2xl font-bold">👤 Profile</h1>
          <button
            onClick={handleRefresh}
            className="bg-cyan-500 hover:bg-cyan-600 px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition-all text-xs md:text-sm"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Player Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/70 backdrop-blur-lg rounded-lg p-3 md:p-4 mb-3 border border-gray-800"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-cyan-500 rounded-full flex items-center justify-center text-2xl md:text-3xl mr-3">
              🎮
            </div>
            <div className="overflow-hidden">
              <h2 className="text-base md:text-lg font-bold mb-0.5">Player</h2>
              <p className="text-gray-400 font-mono text-xs md:text-sm truncate">{address}</p>
            </div>
          </div>
        </motion.div>

        {/* Claim Rewards Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded-lg p-3 md:p-4 mb-3"
        >
          <h3 className="text-sm md:text-base font-bold mb-2 text-yellow-400">💰 Pending Multi-Token Rewards</h3>
          
          {allPendingRewards && allPendingRewards.tokens.length > 0 ? (
            <div className="space-y-2 mb-4">
              {allPendingRewards.tokens.map((tokenAddress, index) => {
                const amount = allPendingRewards.amounts[index]
                const tokenData = tokenImages[tokenAddress.toLowerCase()]
                const isJoyb = tokenAddress.toLowerCase() === CONTRACT_ADDRESSES.joybitToken.toLowerCase()
                
                return (
                  <div key={tokenAddress} className="flex items-center justify-between bg-black/20 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      {tokenData?.image ? (
                        <img 
                          src={tokenData.image} 
                          alt={tokenData.symbol}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : isJoyb ? (
                        <img 
                          src="/branding/logo.png" 
                          alt="JOYB"
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs">
                          🪙
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-bold text-green-400">
                          {formatTokenBalance(amount)} {tokenData?.symbol || (isJoyb ? 'JOYB' : tokenAddress.slice(0, 6) + '...')}
                        </div>
                        <div className="text-xs text-gray-400">
                          {isJoyb ? 'From games & rewards' : 'From admin rewards'}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-gray-400 text-sm">No pending rewards</div>
            </div>
          )}

          {/* Share Prompt or Claim Button */}
          {showSharePrompt ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/50 rounded-lg p-4 mb-4"
            >
              <div className="text-center mb-4">
                <div className="text-2xl mb-2">🎉</div>
                <h4 className="text-lg font-bold text-purple-300 mb-2">Share Your Victory!</h4>
                <p className="text-sm text-gray-300 mb-4">
                  Show off your gaming skills and inspire others to join the fun!
                </p>

                {/* Share Preview */}
                <div className="bg-black/40 border border-purple-500/30 rounded-lg p-3 mb-4 text-left">
                  <div className="text-xs text-gray-400 mb-2">📤 Share Preview:</div>
                  <div className="text-sm text-white font-mono bg-black/20 p-2 rounded">
                    🎮 Just crushed it in Joybit!<br/>
                    🏆 Match-3: {match3Stats.gamesPlayed || (match3Data && Array.isArray(match3Data) ? Number(match3Data[1]) || 0 : 0)} games played, High Score: {match3Stats.highScore || 0}<br/>
                    🃏 Card Game: {cardData && Array.isArray(cardData) ? Number(cardData[1]) || 0 : 0} games, {cardData && Array.isArray(cardData) ? Number(cardData[2]) || 0 : 0} wins<br/>
                    💰 Claiming {allPendingRewards ? formatTokenBalance(allPendingRewards.amounts.reduce((sum, amount) => sum + amount, 0n)) : '0'} JOYB in rewards!<br/>
                    <br/>
                    Who&apos;s next? Come play and win big! 🚀<br/>
                    #Joybit #GameFi #MiniApp
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setShowSharePrompt(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm"
                >
                  Skip & Claim
                </button>
                <button
                  onClick={handleShareAndClaim}
                  disabled={isClaiming}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold py-2 px-6 rounded-lg transition-all disabled:opacity-50 text-sm"
                >
                  {isClaiming ? 'Sharing & Claiming...' : '🚀 Share & Claim!'}
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="flex justify-end">
              <button
                onClick={handleClaimRewards}
                disabled={isClaiming || claimCooldown || !allPendingRewards || allPendingRewards.tokens.length === 0}
                className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 text-black font-bold py-2 px-4 md:py-3 md:px-6 rounded-lg transition-all disabled:cursor-not-allowed text-xs md:text-sm"
              >
                {isClaiming ? 'Claiming...' : claimCooldown ? 'Cooldown...' : 'Claim All Tokens'}
              </button>
            </div>
          )}
        </motion.div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 gap-3 mb-3">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-900/70 backdrop-blur-lg rounded-lg p-3 border border-gray-800"
          >
            <h3 className="text-sm md:text-base font-bold mb-2 text-gray-300">Match-3 Game Stats</h3>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs md:text-sm">
                <span className="text-gray-400">Games Played:</span>
                <span className="font-bold">{match3Stats.gamesPlayed || match3Played}</span>
              </div>
              <div className="flex flex-col text-xs md:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">High Score:</span>
                  <span className="font-bold text-purple-400">
                    {match3HighScore > 0 ? match3HighScore : '0'}
                  </span>
                </div>
                {match3HighScoreLevel > 0 && (
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-400">Level:</span>
                    <span className="font-bold text-purple-300">lvl {match3HighScoreLevel}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-900/70 backdrop-blur-lg rounded-lg p-3 border border-gray-800"
          >
            <h3 className="text-sm md:text-base font-bold mb-2 text-gray-300">Card Game Stats</h3>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs md:text-sm">
                <span className="text-gray-400">Total Plays:</span>
                <span className="font-bold">{cardPlayed}</span>
              </div>
              <div className="flex justify-between text-xs md:text-sm">
                <span className="text-gray-400">Wins:</span>
                <span className="font-bold text-green-400">{cardWon}</span>
              </div>
              <div className="flex justify-between text-xs md:text-sm">
                <span className="text-gray-400">Win Rate:</span>
                <span className="font-bold text-blue-400">{cardWinRate}%</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Daily Claim Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-900/70 backdrop-blur-lg rounded-lg p-3 border border-gray-800 mb-3"
        >
          <h3 className="text-sm md:text-base font-bold mb-2">🔥 Daily Claim Streak</h3>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl md:text-3xl font-bold text-orange-400">{currentStreak} Days</div>
              <div className="text-gray-400 text-xs md:text-sm mt-0.5">Current Streak</div>
            </div>
            <div className="text-right">
              <div className="text-xl md:text-2xl font-bold text-green-400">{formatTokenBalance(totalClaimed)} JOYB</div>
              <div className="text-gray-400 text-xs md:text-sm mt-0.5">Total Claimed</div>
            </div>
          </div>
        </motion.div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-gray-900/70 backdrop-blur-lg rounded-lg p-3 border border-gray-800 mb-3"
        >
          <h3 className="text-sm md:text-base font-bold mb-3">🏆 Achievements</h3>
          {sortedAchievements.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <div className="text-4xl mb-2">🏆</div>
              <div>Loading achievements...</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {sortedAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`relative group cursor-pointer transition-all duration-300 hover:scale-105 ${
                  achievement.unlocked
                    ? 'hover:shadow-2xl hover:shadow-current/20'
                    : 'hover:shadow-lg hover:shadow-gray-500/20'
                }`}
                onClick={() => {
                  setSelectedAchievement(achievement)
                  setShowAchievementModal(true)
                }}
              >
                {/* Glow effect for unlocked achievements */}
                {achievement.unlocked && (
                  <div className={`absolute inset-0 rounded-lg ${achievement.gradient} opacity-20 blur-sm group-hover:opacity-40 transition-opacity`} />
                )}

                {/* Main badge container */}
                <div className={`relative p-3 rounded-lg border backdrop-blur-sm transition-all duration-300 ${
                  achievement.unlocked
                    ? `${achievement.gradient} ${achievement.border} bg-black/30 shadow-lg`
                    : 'bg-gray-900/60 border-gray-700/40 grayscale group-hover:grayscale-25'
                }`}>

                  {/* Rarity indicator - smaller and more subtle */}
                  <div className={`absolute -top-1.5 left-1/2 transform -translate-x-1/2 px-1.5 py-0.5 rounded-full text-xs font-bold text-xs ${
                    achievement.rarity === 'Mythic' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' :
                    achievement.rarity === 'Legendary' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black' :
                    achievement.rarity === 'Epic' ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white' :
                    achievement.rarity === 'Rare' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' :
                    'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                  }`}>
                    {achievement.rarity[0]}
                  </div>

                  {/* Lock overlay for locked achievements */}
                  {!achievement.unlocked && (
                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                      <div className="text-2xl">🔒</div>
                    </div>
                  )}

                  {/* Achievement icon */}
                  <div className={`text-3xl mb-2 text-center relative ${achievement.unlocked ? '' : 'opacity-50'}`}>
                    {achievement.emoji}
                    {achievement.unlocked && (
                      <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                        ✓
                      </div>
                    )}
                  </div>

                  {/* Achievement name */}
                  <div className={`text-xs font-bold text-center mb-1 leading-tight ${achievement.unlocked ? achievement.textColor : 'text-gray-400'}`}>
                    {achievement.name}
                  </div>

                  {/* NFT mint indicator for unlocked achievements */}
                  {achievement.unlocked && (
                    <div className="absolute bottom-1 right-1 w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-black text-xs font-bold shadow-sm">
                      🏆
                    </div>
                  )}
                </div>
              </div>
            ))}
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 gap-3"
        >
          <button
            onClick={() => router.push('/game')}
            className="bg-blue-500 hover:bg-blue-600 py-3 rounded-lg font-bold text-sm transition-all"
          >
            🎮 Play Match-3
          </button>
          <button
            onClick={() => router.push('/card-game')}
            className="bg-purple-500 hover:bg-purple-600 py-3 rounded-lg font-bold text-sm transition-all"
          >
            🎴 Play Cards
          </button>
          <button
            onClick={() => router.push('/daily-claim')}
            className="bg-orange-500 hover:bg-orange-600 py-3 rounded-lg font-bold text-sm transition-all"
          >
            🎁 Daily Claim
          </button>
          <button
            onClick={() => router.push('/leaderboard')}
            className="bg-green-500 hover:bg-green-600 py-3 rounded-lg font-bold text-sm transition-all"
          >
            🏆 Leaderboard
          </button>
        </motion.div>
      </div>

      {/* Achievement Modal */}
      <AnimatePresence>
        {showAchievementModal && selectedAchievement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAchievementModal(false)}
          >
            {/* Subtle animated background */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full opacity-10"
                  initial={{
                    x: Math.random() * window.innerWidth,
                    y: Math.random() * window.innerHeight,
                    scale: 0
                  }}
                  animate={{
                    y: [null, -50],
                    scale: [0, 1, 0],
                    opacity: [0, 0.2, 0]
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    delay: Math.random() * 3
                  }}
                />
              ))}
            </div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl rounded-xl p-6 max-w-sm w-full border border-gray-700/50 shadow-2xl relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Subtle glow effect */}
              <div className={`absolute inset-0 ${selectedAchievement.gradient} opacity-5 blur-xl`} />

              <div className="relative z-10">
                {/* Close button */}
                <button
                  onClick={() => setShowAchievementModal(false)}
                  className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Achievement header */}
                <div className="text-center mb-4">
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-3 ${
                    selectedAchievement.rarity === 'Mythic' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' :
                    selectedAchievement.rarity === 'Legendary' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black' :
                    selectedAchievement.rarity === 'Epic' ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white' :
                    selectedAchievement.rarity === 'Rare' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' :
                    'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                  }`}>
                    {selectedAchievement.rarity} Achievement
                  </div>

                  {/* Achievement icon */}
                  <motion.div
                    className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-3 ${selectedAchievement.gradient} border-2 ${selectedAchievement.border} shadow-lg`}
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <span className="text-3xl">{selectedAchievement.emoji}</span>
                  </motion.div>

                  <h3 className="text-xl font-bold text-white mb-1">{selectedAchievement.name}</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">{selectedAchievement.description}</p>
                </div>

                {/* Achievement details */}
                <div className="bg-gray-800/30 rounded-lg p-3 mb-4">
                  <div className="text-xs text-gray-400 mb-1">
                    <strong className="text-white">Requirement:</strong>
                  </div>
                  <div className="text-sm text-gray-300">{selectedAchievement.requirement}</div>
                </div>

                {/* Status indicator */}
                <div className={`text-center mb-4 px-3 py-2 rounded-lg text-sm font-medium ${
                  selectedAchievement.unlocked
                    ? 'bg-gradient-to-r from-green-600/20 to-emerald-600/20 text-green-400 border border-green-600/30'
                    : 'bg-gradient-to-r from-red-600/20 to-rose-600/20 text-red-400 border border-red-600/30'
                }`}>
                  {selectedAchievement.unlocked ? '✅ Achievement Unlocked' : '🔒 Achievement Locked'}
                </div>

                {/* NFT Minter for unlocked achievements */}
                {selectedAchievement.unlocked && (
                  <AchievementNFTMinter
                    achievement={selectedAchievement}
                    hasAchievement={selectedAchievement.unlocked}
                    onMintSuccess={() => {
                      setShowAchievementModal(false)
                      fetchAchievementsData()
                    }}
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
