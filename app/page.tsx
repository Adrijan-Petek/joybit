'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { WalletButton } from '@/components/WalletButton'
import { AudioButtons } from '@/components/AudioButtons'
import { SettingsButton } from '@/components/SettingsButton'
import { InfoModal } from '@/components/InfoModal'
import { Logo } from '@/components/Logo'
import Image from 'next/image'
import { useAudio } from '@/components/audio/AudioContext'
import { useReadContract } from 'wagmi'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { TREASURY_ABI } from '@/lib/contracts/abis'
import { notifyPlayGame } from '@/lib/utils/farcasterNotifications'
import { sdk } from '@farcaster/miniapp-sdk'
import { formatTokenBalance } from '@/lib/utils/tokenFormatting'

function SeasonDisplay() {
  const [activeSeason, setActiveSeason] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadActiveSeason = async () => {
      try {
        const response = await fetch('/api/seasons')
        if (response.ok) {
          const data = await response.json()
          // Show active season, or if no active season, show the most recent one
          setActiveSeason(data.activeSeason || (data.seasons && data.seasons.length > 0 ? data.seasons[0] : null))
        }
      } catch (error) {
        console.error('Failed to load active season:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadActiveSeason()
  }, [])

  if (isLoading || !activeSeason) return null

  const now = new Date()
  const endDate = new Date(activeSeason.end_date)
  const timeLeft = endDate.getTime() - now.getTime()
  const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24))

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div className={`bg-gradient-to-r ${activeSeason.is_active ? 'from-purple-500/20 to-blue-500/20 border-purple-500/30' : 'from-gray-500/20 to-gray-600/20 border-gray-500/30'} border rounded-lg p-4 backdrop-blur-sm`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{activeSeason.is_active ? '🌟' : '⏸️'}</div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-white font-bold text-lg">{activeSeason.name}</h4>
                {!activeSeason.is_active && <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">Inactive</span>}
              </div>
              <p className={`text-sm ${activeSeason.is_active ? 'text-purple-200' : 'text-gray-300'}`}>{activeSeason.description}</p>
            </div>
          </div>
          <div className={`flex items-center gap-4 text-sm ${activeSeason.is_active ? 'text-purple-300' : 'text-gray-400'}`}>
            <span className="flex items-center gap-1">⏰ {daysLeft > 0 ? `${daysLeft}d left` : 'Ended'}</span>
            <span className="flex items-center gap-1">🎁 {activeSeason.rewards_multiplier}x rewards</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function Home() {
  const router = useRouter()
  const { playMusic } = useAudio()
  const [mounted, setMounted] = useState(false)
  const [logoClickCount, setLogoClickCount] = useState(0)
  const [announcements, setAnnouncements] = useState<string[]>([])
  const [announcementSettings, setAnnouncementSettings] = useState({
    animationType: 'scroll',
    colorTheme: 'yellow',
    glowIntensity: 'medium',
    speed: 'normal',
    fontStyle: 'mono'
  })
  const [isPaused, setIsPaused] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState('')
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [rewardTokens, setRewardTokens] = useState<Array<{ address: string; image: string; symbol: string }>>([])

  // Read supported tokens from blockchain
  const { data: supportedTokens } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury,
    abi: TREASURY_ABI,
    functionName: 'getSupportedTokens',
  })

  const { data: joybitTokenAddress } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury,
    abi: TREASURY_ABI,
    functionName: 'joybitToken',
  })

  // Read treasury balances
  const { data: treasuryJOYB } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury,
    abi: TREASURY_ABI,
    functionName: 'treasuryBalanceToken',
    args: [joybitTokenAddress as `0x${string}`],
  })

  useEffect(() => {
    setMounted(true)
    playMusic('main-menu')
    sdk.actions.ready()
    
    // Load announcements from database with cache busting
    const loadAnnouncements = async () => {
      try {
        // First get the current version (meta request bypasses cache)
        const versionResponse = await fetch('/api/announcements?meta=1', { cache: 'no-store' })
        if (versionResponse.ok) {
          const versionData = await versionResponse.json()
          const currentVersion = versionData.version

          // Now fetch with version for cache busting (allows edge caching)
          const response = await fetch(`/api/announcements?v=${currentVersion}`)
          if (response.ok) {
            const data = await response.json()
            if (data.announcements && data.announcements.length > 0) {
              const filteredAnnouncements = data.announcements.filter((a: string) => a.trim())
              if (filteredAnnouncements.length > 0) {
                setAnnouncements(filteredAnnouncements)
              } else {
                // All announcements were empty/whitespace, show defaults
                setAnnouncements([
                  '🎉 Welcome to Joybit - Match 3 & Card Games on Base!',
                  '🏆 Compete for leaderboard positions and earn rewards!',
                  '💎 Collect achievements and unlock special NFTs!',
                  '🎮 Play daily for bonus rewards and claim your earnings!'
                ])
              }
            } else {
              // Database is empty or no announcements array, show defaults
              setAnnouncements([
                '🎉 Welcome to Joybit - Match 3 & Card Games on Base!',
                '🏆 Compete for leaderboard positions and earn rewards!',
                '💎 Collect achievements and unlock special NFTs!',
                '🎮 Play daily for bonus rewards and claim your earnings!'
              ])
            }
            // Load settings
            if (data.settings) {
              setAnnouncementSettings(data.settings)
            }
          } else {
            // Fallback to default announcements
            setAnnouncements([
              '🎉 Welcome to Joybit - Match 3 & Card Games on Base!',
              '🏆 Compete for leaderboard positions and earn rewards!',
              '💎 Collect achievements and unlock special NFTs!',
              '🎮 Play daily for bonus rewards and claim your earnings!'
            ])
          }
        }
      } catch (error) {
        console.error('Failed to load announcements:', error)
        // Fallback to default announcements
        setAnnouncements([
          '🎉 Welcome to Joybit - Match 3 & Card Games on Base!',
          '🏆 Compete for leaderboard positions and earn rewards!',
          '💎 Collect achievements and unlock special NFTs!',
          '🎮 Play daily for bonus rewards and claim your earnings!'
        ])
      }
    }

    loadAnnouncements()

    // Visibility-based polling for announcements
    let pollInterval: NodeJS.Timeout
    let currentPollInterval = 300000 // 5 minutes when visible

    const pollForUpdates = async () => {
      try {
        // First get the current version (meta request bypasses cache)
        const versionResponse = await fetch('/api/announcements?meta=1', { cache: 'no-store' })
        if (versionResponse.ok) {
          const versionData = await versionResponse.json()
          const currentVersion = versionData.version

          // Now fetch with version for cache busting (allows edge caching)
          const response = await fetch(`/api/announcements?v=${currentVersion}`)
          if (response.ok) {
            const data = await response.json()
            if (data.settings) {
              setAnnouncementSettings(prevSettings => {
                // Only update if settings have actually changed
                if (JSON.stringify(prevSettings) !== JSON.stringify(data.settings)) {
                  console.log('🔄 Announcement settings updated:', data.settings)
                  return data.settings
                }
                return prevSettings
              })
            }
            // Also update announcements if they changed
            if (data.announcements) {
              setAnnouncements(prevAnnouncements => {
                const newAnnouncements = data.announcements.filter((a: string) => a.trim())
                if (newAnnouncements.length === 0) {
                  // Database is empty, show default announcements
                  const defaultAnnouncements = [
                    '🎉 Welcome to Joybit - Match 3 & Card Games on Base!',
                    '🏆 Compete for leaderboard positions and earn rewards!',
                    '💎 Collect achievements and unlock special NFTs!',
                    '🎮 Play daily for bonus rewards and claim your earnings!'
                  ]
                  console.log('🔄 Database empty, showing default announcements:', defaultAnnouncements)
                  return defaultAnnouncements
                } else if (JSON.stringify(prevAnnouncements) !== JSON.stringify(newAnnouncements)) {
                  console.log('🔄 Announcements updated:', newAnnouncements)
                  return newAnnouncements
                }
                return prevAnnouncements
              })
            }
          }
        }
      } catch (error) {
        console.error('Failed to poll announcement settings:', error)
      }
    }

    // Set up visibility change listener for responsive updates
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab became visible - check for updates immediately
        pollForUpdates()
        // Switch to frequent polling
        currentPollInterval = 300000 // 5 minutes
        clearInterval(pollInterval)
        pollInterval = setInterval(pollForUpdates, currentPollInterval)
      } else {
        // Tab became hidden - reduce polling frequency
        currentPollInterval = 1800000 // 30 minutes
        clearInterval(pollInterval)
        pollInterval = setInterval(pollForUpdates, currentPollInterval)
      }
    }

    // Initial poll setup
    pollInterval = setInterval(pollForUpdates, currentPollInterval)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Send periodic play encouragement notifications
    const sendPlayNotification = async () => {
      const lastPlayNotification = localStorage.getItem('joybit_last_play_notification')
      const now = Date.now()
      const sixHours = 6 * 60 * 60 * 1000 // 6 hours

      if (!lastPlayNotification || (now - parseInt(lastPlayNotification)) > sixHours) {
        await notifyPlayGame('Match-3')
        localStorage.setItem('joybit_last_play_notification', now.toString())
      }
    }

    // Initialize Farcaster SDK and check if user added the app
    const initSDK = async () => {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk')
        
        // Call ready to dismiss splash screen
        await sdk.actions.ready()
        
        // Check if app was just added
        const context = await sdk.context
        if (context?.client?.added) {
          const hasShownWelcome = localStorage.getItem('joybit_welcome_shown')
          if (!hasShownWelcome) {
            setNotificationMessage('🎉 Welcome to Joybit! Thanks for adding the app!')
            setShowNotification(true)
            localStorage.setItem('joybit_welcome_shown', 'true')
            
            // Auto-hide after 5 seconds
            setTimeout(() => setShowNotification(false), 5000)
          }
        }
      } catch (error) {
        console.log('Not in Farcaster Mini App context')
      }
    }

    initSDK()
    sendPlayNotification()

    // Cleanup polling interval on unmount
    return () => clearInterval(pollInterval)
  }, [])

  // Load reward tokens after mount (separate effect to ensure it works in Farcaster)
  useEffect(() => {
    if (!mounted) return
    
    const loadTokens = async () => {
      try {
        console.log('🔄 Loading tokens...')
        let tokenImages: Record<string, { image: string; symbol: string }> = {}
        
        // Load from localStorage first (same as admin panel)
        const saved = localStorage.getItem('joybit_token_images')
        if (saved) {
          tokenImages = JSON.parse(saved)
          console.log('📦 Token metadata from localStorage:', tokenImages)
          
          // Set initial reward tokens from localStorage immediately
          const initialTokens = Object.keys(tokenImages).map(address => ({
            address,
            image: tokenImages[address].image || '',
            symbol: tokenImages[address].symbol || 'TOKEN'
          }))
          setRewardTokens(initialTokens)
          console.log('✅ Initial reward tokens from localStorage:', initialTokens)
        }
        
        // Also load from API and merge (API data takes precedence)
        try {
          const response = await fetch('/api/token-metadata')
          if (response.ok) {
            const data = await response.json()
            console.log('📡 Token metadata from API:', data)
            tokenImages = { ...tokenImages, ...data } // Merge: API overrides localStorage
            console.log('🔀 Merged token metadata:', tokenImages)
          }
        } catch (error) {
          console.error('⚠️ Failed to load token metadata from API:', error)
        }
        
        // Combine blockchain tokens with metadata
        if (supportedTokens && Array.isArray(supportedTokens)) {
          console.log('🔗 Supported tokens from blockchain:', supportedTokens)
          console.log('🔗 JOYB token address:', joybitTokenAddress)
          const tokens = (supportedTokens as `0x${string}`[])
            .filter(address => address.toLowerCase() !== joybitTokenAddress?.toLowerCase()) // Exclude JOYB
            .map(address => {
              const tokenData = tokenImages[address.toLowerCase()]
              console.log(`🪙 Processing token ${address}:`, tokenData)
              return {
                address,
                image: tokenData?.image || '',
                symbol: tokenData?.symbol || 'TOKEN'
              }
            })
          console.log('✅ Final reward tokens:', tokens)
          setRewardTokens(tokens)
        } else {
          // If no blockchain data, update with merged metadata
          const tokens = Object.keys(tokenImages).map(address => ({
            address,
            image: tokenImages[address].image || '',
            symbol: tokenImages[address].symbol || 'TOKEN'
          }))
          setRewardTokens(tokens)
          console.log('✅ Reward tokens from metadata (no blockchain):', tokens)
        }
      } catch (error) {
        console.error('❌ Error loading tokens:', error)
      }
    }

    // Load immediately when supportedTokens changes
    loadTokens()

    // Also reload when window gains focus (for when returning from admin panel)
    const handleFocus = () => loadTokens()
    window.addEventListener('focus', handleFocus)

    return () => window.removeEventListener('focus', handleFocus)
  }, [mounted, supportedTokens, joybitTokenAddress])

  useEffect(() => {
    if (logoClickCount >= 10) {
      router.push('/admin')
      setLogoClickCount(0)
    }
  }, [logoClickCount, router])

  const handleLogoClick = () => {
    setLogoClickCount((prev) => prev + 1)
  }

  if (!mounted) return null

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--theme-background)' }}>
      {/* Notification Toast */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] w-11/12 max-w-md"
          >
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-4 shadow-2xl border-2 border-white/20">
              <div className="flex items-center gap-3">
                <div className="text-3xl">🎮</div>
                <div className="flex-1">
                  <p className="text-white font-bold text-sm md:text-base">{notificationMessage}</p>
                  <p className="text-white/80 text-xs mt-1">Start playing to earn JOYB tokens!</p>
                </div>
                <button
                  onClick={() => setShowNotification(false)}
                  className="text-white/80 hover:text-white text-2xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Modal */}
      <InfoModal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} />

      {/* Audio Controls & Wallet Button */}
      <div className="fixed top-3 right-3 md:top-4 md:right-4 z-50 flex items-center gap-2">
        <button
          onClick={() => setShowInfoModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-8 h-8 flex items-center justify-center transition-all shadow-lg hover:scale-110 text-sm"
          title="How to Play"
        >
          ℹ️
        </button>
        <AudioButtons />
        <SettingsButton />
        <WalletButton />
      </div>
      
      <div className="container mx-auto px-3 py-6 md:px-6 md:py-10 max-w-5xl">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 md:mb-10"
        >
          <motion.div
            onClick={handleLogoClick}
            className="cursor-pointer inline-block"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Logo size="large" clickable={false} showText={true} />
            <p className="text-sm md:text-base mt-2 ml-1">
              <span className="text-yellow-500">Match-3 Fun</span>
              <span className="text-gray-400"> on Base</span>
            </p>
          </motion.div>
        </motion.header>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {/* Announcement Banner */}
          {announcements.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6 md:mb-8"
            >
              <AnnouncementBanner 
                announcements={announcements}
                settings={announcementSettings}
              />
            </motion.div>
          )}

          {/* Season Display - Full Width */}
          <div className="mb-6 md:mb-8">
            <SeasonDisplay />
          </div>

          {/* Season Games */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5 mb-6 md:mb-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="rounded-xl border shadow-xl overflow-hidden"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
            >
              <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'var(--theme-border)' }}>
                <span className="h-2 w-2 rounded-full bg-red-400" />
                <span className="h-2 w-2 rounded-full bg-yellow-400" />
                <span className="h-2 w-2 rounded-full bg-green-400" />
                <span className="ml-2 text-xs text-gray-400">Match-3</span>
              </div>
              <div className="p-4">
                <h3 className="text-base md:text-lg font-bold mb-1">🧩 Match-3</h3>
                <p className="text-xs md:text-sm text-gray-400 mb-3">
                  Beat milestones, climb the season leaderboard.
                </p>
                <button
                  onClick={() => router.push('/game')}
                  className="w-full bg-[#1652F0] hover:bg-[#1652F0]/90 text-white font-bold py-2 px-3 rounded-lg transition-all text-sm"
                >
                  Play Now
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="rounded-xl border shadow-xl overflow-hidden"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
            >
              <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'var(--theme-border)' }}>
                <span className="h-2 w-2 rounded-full bg-red-400" />
                <span className="h-2 w-2 rounded-full bg-yellow-400" />
                <span className="h-2 w-2 rounded-full bg-green-400" />
                <span className="ml-2 text-xs text-gray-400">3-Card</span>
              </div>
              <div className="p-4">
                <h3 className="text-base md:text-lg font-bold mb-1">🃏 3-Card</h3>
                <p className="text-xs md:text-sm text-gray-400 mb-3">
                  Flip a card and test your luck for JOYB.
                </p>
                <button
                  onClick={() => router.push('/card-game')}
                  className="w-full bg-[#1652F0] hover:bg-[#1652F0]/90 text-white font-bold py-2 px-3 rounded-lg transition-all text-sm"
                >
                  Play Now
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26 }}
              className="rounded-xl border shadow-xl overflow-hidden"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
            >
              <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'var(--theme-border)' }}>
                <span className="h-2 w-2 rounded-full bg-red-400" />
                <span className="h-2 w-2 rounded-full bg-yellow-400" />
                <span className="h-2 w-2 rounded-full bg-green-400" />
                <span className="ml-2 text-xs text-gray-400">Basebound</span>
              </div>
              <div className="p-4">
                <h3 className="text-base md:text-lg font-bold mb-1">🏎️ Basebound</h3>
                <p className="text-xs md:text-sm text-gray-400 mb-3">
                  Drive, collect coins, and push your distance.
                </p>
                <button
                  onClick={() => router.push('/basebound')}
                  className="w-full bg-[#1652F0] hover:bg-[#1652F0]/90 text-white font-bold py-2 px-3 rounded-lg transition-all text-sm"
                >
                  Play Now
                </button>
              </div>
            </motion.div>
          </div>

          {/* Additional Features */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-6">
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              onClick={() => router.push('/daily-claim')}
              className="backdrop-blur-lg rounded-xl p-4 md:p-5 hover:bg-gray-800/50 transition-all border"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
            >
              <div className="text-2xl md:text-3xl mb-1 md:mb-2">🎁</div>
              <h3 className="font-bold text-sm md:text-base">Daily Claim</h3>
              <p className="text-xs md:text-sm text-gray-400">Get your daily rewards</p>
            </motion.button>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onClick={() => router.push('/leaderboard')}
              className="backdrop-blur-lg rounded-xl p-4 md:p-5 hover:bg-gray-800/50 transition-all border"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
            >
              <div className="text-2xl md:text-3xl mb-1 md:mb-2">🏆</div>
              <h3 className="font-bold text-sm md:text-base">Leaderboard</h3>
              <p className="text-xs md:text-sm text-gray-400">See top players</p>
            </motion.button>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              onClick={() => router.push('/profile')}
              className="backdrop-blur-lg rounded-xl p-4 md:p-5 hover:bg-gray-800/50 transition-all border"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
            >
              <div className="text-2xl md:text-3xl mb-1 md:mb-2">👤</div>
              <h3 className="font-bold text-sm md:text-base">Profile</h3>
              <p className="text-xs md:text-sm text-gray-400">Claim your rewards</p>
            </motion.button>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="backdrop-blur-lg rounded-xl p-4 md:p-5 border"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
            >
              <div className="text-2xl md:text-3xl mb-1 md:mb-2">🏦</div>
              <h3 className="font-bold text-sm md:text-base">Staking</h3>
              <p className="text-xs md:text-sm text-gray-400">Coming Soon</p>
            </motion.div>
          </div>

          {/* Token Info Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-8 md:mt-12"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Joybit Token Info */}
              <div className="backdrop-blur-lg border rounded-xl p-5 md:p-6"
                   style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                <div className="flex flex-col items-center justify-between gap-4 h-full">
                  <div className="flex-1 text-center w-full">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <div className="w-10 h-10 md:w-12 md:h-12 relative flex-shrink-0">
                        <Image
                          src="/branding/logo-small.png"
                          alt="Joybit Logo"
                          width={48}
                          height={48}
                          className="w-full h-full"
                        />
                      </div>
                      <h3 className="text-xl md:text-2xl font-bold">Joybit Token (JOYB)</h3>
                    </div>
                    <p className="text-sm md:text-base text-gray-300 mb-2">
                      Earn JOYB tokens by playing games and claim daily rewards!
                    </p>
                    <div className="bg-black/30 rounded-lg p-2 inline-block">
                      <p className="text-xs text-gray-400 mb-1">Contract Address:</p>
                      <a 
                        href="https://basescan.org/token/0xc732932ca7db558cf1bacc17b4f4f7e149e0eb07"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono text-cyan-300 hover:text-cyan-200 transition-colors break-all"
                      >
                        0xc732932ca7db558cf1bacc17b4f4f7e149e0eb07
                      </a>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 w-full">
                    <a
                      href="https://app.uniswap.org/#/swap?outputCurrency=0xc732932ca7db558cf1bacc17b4f4f7e149e0eb07&chain=base"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#1652F0] hover:bg-[#1652F0]/90 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-center text-sm md:text-base whitespace-nowrap"
                    >
                      🦄 Buy on Uniswap
                    </a>
                    <button
                      onClick={async () => {
                        try {
                          const { sdk } = await import('@farcaster/miniapp-sdk')
                          await sdk.actions.swapToken({
                            buyToken: 'eip155:8453/erc20:0xc732932ca7db558cf1bacc17b4f4f7e149e0eb07', // JOYB on Base
                            sellToken: 'eip155:8453/native', // ETH on Base
                          })
                        } catch (error) {
                          console.error('Failed to open swap:', error)
                        }
                      }}
                      className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm whitespace-nowrap"
                    >
                      💰 Buy on Farcaster
                    </button>
                  </div>
                </div>
              </div>

              {/* Additional Reward Tokens */}
              {rewardTokens.length > 0 && rewardTokens.map((token, index) => (
                <div
                  key={token.address}
                  className="backdrop-blur-lg border rounded-xl p-5 md:p-6"
                  style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                >
                  <div className="flex flex-col items-center justify-between gap-4 h-full">
                    <div className="flex-1 text-center w-full">
                      <div className="flex items-center justify-center gap-3 mb-2">
                        <div className="w-10 h-10 md:w-12 md:h-12 relative flex-shrink-0">
                          {token.image ? (
                            <img
                              src={token.image}
                              alt={token.symbol}
                              className="w-full h-full rounded-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><circle cx="24" cy="24" r="24" fill="%23a855f7"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-size="24">🪙</text></svg>'
                              }}
                            />
                          ) : (
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl">
                              🪙
                            </div>
                          )}
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold">{token.symbol} Token</h3>
                      </div>
                      <p className="text-sm md:text-base text-gray-300 mb-2">
                        Earn {token.symbol} tokens as rewards!
                      </p>
                      <div className="bg-black/30 rounded-lg p-2 inline-block">
                        <p className="text-xs text-gray-400 mb-1">Contract Address:</p>
                        <a 
                          href={`https://basescan.org/token/${token.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono text-purple-300 hover:text-purple-200 transition-colors break-all"
                        >
                          {token.address}
                        </a>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 w-full">
                      <a
                        href={`https://app.uniswap.org/#/swap?outputCurrency=${token.address}&chain=base`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#1652F0] hover:bg-[#1652F0]/90 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-center text-sm md:text-base whitespace-nowrap"
                      >
                        🦄 Buy on Uniswap
                      </a>
                      <button
                        onClick={async () => {
                          try {
                            const { sdk } = await import('@farcaster/miniapp-sdk')
                            await sdk.actions.swapToken({
                              buyToken: `eip155:8453/erc20:${token.address}`,
                              sellToken: 'eip155:8453/native', // ETH on Base
                            })
                          } catch (error) {
                            console.error('Failed to open swap:', error)
                          }
                        }}
                        className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm whitespace-nowrap"
                      >
                        💰 Buy on Farcaster
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Treasury Balances */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75 }}
            className="mt-8 md:mt-12"
          >
            <div className="backdrop-blur-lg border rounded-xl p-5 md:p-6" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
              <h3 className="text-xl md:text-2xl font-bold mb-4 text-center">🏦 Rewards Tokens Balances</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* JOYB Balance */}
                <div className="bg-black/30 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 md:w-10 md:h-10 relative flex-shrink-0">
                      <Image
                        src="/branding/logo-small.png"
                        alt="Joybit Logo"
                        width={40}
                        height={40}
                        className="w-full h-full"
                      />
                    </div>
                    <h4 className="text-lg md:text-xl font-bold">JOYB Balance</h4>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-blue-400">
                    {formatTokenBalance(treasuryJOYB)} JOYB
                  </div>
                  <p className="text-xs md:text-sm text-gray-400 mt-1">
                    Available in treasury for rewards
                  </p>
                </div>

                {/* Multi-Token Balances */}
                {supportedTokens && Array.isArray(supportedTokens) && (supportedTokens as `0x${string}`[]).filter(addr => addr.toLowerCase() !== joybitTokenAddress?.toLowerCase()).map((tokenAddr, index) => {
                  const tokenData = rewardTokens.find(t => t.address.toLowerCase() === tokenAddr.toLowerCase())
                  return (
                    <motion.div
                      key={tokenAddr}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8 + (index * 0.1) }}
                      className="bg-black/30 rounded-lg p-4"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 md:w-10 md:h-10 relative flex-shrink-0">
                          {tokenData?.image ? (
                            <img
                              src={tokenData.image}
                              alt={tokenData.symbol}
                              className="w-full h-full rounded-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="20" fill="%23a855f7"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-size="20">🪙</text></svg>'
                              }}
                            />
                          ) : (
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl">
                              🪙
                            </div>
                          )}
                        </div>
                        <h4 className="text-lg md:text-xl font-bold">{tokenData?.symbol || 'TOKEN'}</h4>
                      </div>
                      <TreasuryTokenBalance address={tokenAddr} />
                      <p className="text-xs md:text-sm text-gray-400 mt-1">
                        Available for rewards
                      </p>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </motion.div>

          {/* Farcaster Action Buttons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 flex flex-col sm:flex-row gap-3 justify-center"
          >
            <button
              onClick={async () => {
                try {
                  const { sdk } = await import('@farcaster/miniapp-sdk')
                  await sdk.actions.addMiniApp()
                  
                  // Show success notification
                  setNotificationMessage('✅ App added! You will now receive updates and notifications.')
                  setShowNotification(true)
                  setTimeout(() => setShowNotification(false), 5000)
                } catch (error: any) {
                  if (error?.name === 'RejectedByUser') {
                    setNotificationMessage('❌ App addition cancelled.')
                    setShowNotification(true)
                    setTimeout(() => setShowNotification(false), 3000)
                  } else {
                    console.error('Error adding app:', error)
                  }
                }
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-sm md:text-base"
            >
              ⭐ Add App
            </button>
            <button
              onClick={async () => {
                try {
                  const { sdk } = await import('@farcaster/miniapp-sdk')
                  const result = await sdk.actions.composeCast({
                    text: "I'm playing Joybit - a fun Match-3 game on Base! 🎮",
                    embeds: [window.location.origin]
                  })
                  
                  if (result?.cast) {
                    setNotificationMessage('✅ Cast shared successfully!')
                    setShowNotification(true)
                    setTimeout(() => setShowNotification(false), 3000)
                  }
                } catch (error: any) {
                  console.log('Compose cast error:', error)
                }
              }}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-sm md:text-base"
            >
              📢 Recast App
            </button>
            <button
              onClick={async () => {
                try {
                  const { sdk } = await import('@farcaster/miniapp-sdk')
                  await sdk.actions.viewProfile({ fid: 1001206 })
                } catch (error: any) {
                  console.log('View profile error:', error)
                }
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-sm md:text-base"
            >
              👥 Follow
            </button>
          </motion.div>
        </div>
      </div>
    </main>
  )
}

// Treasury Token Balance Component
function TreasuryTokenBalance({ address }: { address: `0x${string}` }) {
  const { data: balance } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury,
    abi: TREASURY_ABI,
    functionName: 'treasuryBalanceToken',
    args: [address],
  })

  return (
    <div className="text-2xl md:text-3xl font-bold text-purple-400">
      {formatTokenBalance(balance as bigint)}
    </div>
  )
}

// Announcement Banner Component with Dynamic Styling
function AnnouncementBanner({ announcements, settings }: { announcements: string[], settings: any }) {
  // Color theme configurations
  const colorThemes = {
    yellow: { bg: 'bg-black', border: 'border-yellow-500', text: 'text-yellow-400', glow: 'rgba(234, 179, 8', shadow: 'shadow-yellow-500/20' },
    cyan: { bg: 'bg-black', border: 'border-cyan-500', text: 'text-cyan-400', glow: 'rgba(34, 211, 238', shadow: 'shadow-cyan-500/20' },
    purple: { bg: 'bg-black', border: 'border-purple-500', text: 'text-purple-400', glow: 'rgba(168, 85, 247', shadow: 'shadow-purple-500/20' },
    green: { bg: 'bg-black', border: 'border-green-500', text: 'text-green-400', glow: 'rgba(34, 197, 94', shadow: 'shadow-green-500/20' },
    red: { bg: 'bg-black', border: 'border-red-500', text: 'text-red-400', glow: 'rgba(239, 68, 68', shadow: 'shadow-red-500/20' },
    rainbow: { bg: 'bg-black', border: 'border-pink-500', text: 'text-pink-400', glow: 'rgba(236, 72, 153', shadow: 'shadow-pink-500/20' }
  }

  const currentTheme = colorThemes[settings.colorTheme as keyof typeof colorThemes] || colorThemes.yellow

  // Glow intensity configurations
  const glowIntensities = {
    low: 0.2,
    medium: 0.4,
    high: 0.6,
    extreme: 0.8
  }

  // Speed configurations
  const speedConfigs = {
    slow: 50,
    normal: 35,
    fast: 20,
    turbo: 10
  }

  // Font style configurations
  const fontStyles = {
    mono: 'font-mono',
    sans: 'font-sans',
    serif: 'font-serif',
    bold: 'font-bold',
    italic: 'italic'
  }

  return (
    <>
      <style jsx global>{`
        @keyframes carouselScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes fadeScroll {
          0%, 100% { opacity: 1; transform: translateX(0); }
          50% { opacity: 0.3; transform: translateX(-25%); }
        }
        @keyframes bounceScroll {
          0%, 100% { transform: translateX(0) scale(1); }
          25% { transform: translateX(-12.5%) scale(1.05); }
          50% { transform: translateX(-25%) scale(1); }
          75% { transform: translateX(-37.5%) scale(1.05); }
        }
        @keyframes waveScroll {
          0% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(-12.5%) rotate(1deg); }
          50% { transform: translateX(-25%) rotate(0deg); }
          75% { transform: translateX(-37.5%) rotate(-1deg); }
          100% { transform: translateX(-50%) rotate(0deg); }
        }
        @keyframes typewriterScroll {
          0% { transform: translateX(0); width: 0; }
          50% { transform: translateX(0); width: 100%; }
          100% { transform: translateX(-50%); width: 100%; }
        }
        @keyframes pulseScroll {
          0%, 100% { transform: translateX(0) scale(1); opacity: 1; }
          50% { transform: translateX(-25%) scale(1.1); opacity: 0.8; }
        }
        @keyframes shimmerScroll {
          0% { transform: translateX(0); filter: brightness(1); }
          50% { transform: translateX(-25%); filter: brightness(1.5); }
          100% { transform: translateX(-50%); filter: brightness(1); }
        }
        @keyframes neonScroll {
          0%, 100% { transform: translateX(0); text-shadow: 0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor; }
          50% { transform: translateX(-25%); text-shadow: 0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor, 0 0 40px currentColor; }
        }
        @keyframes matrixScroll {
          0% { transform: translateX(0) translateY(0); }
          25% { transform: translateX(-12.5%) translateY(-2px); }
          50% { transform: translateX(-25%) translateY(0); }
          75% { transform: translateX(-37.5%) translateY(2px); }
          100% { transform: translateX(-50%) translateY(0); }
        }
        @keyframes particleScroll {
          0% { transform: translateX(0) rotate(0deg) scale(1); }
          25% { transform: translateX(-12.5%) rotate(90deg) scale(1.1); }
          50% { transform: translateX(-25%) rotate(180deg) scale(1); }
          75% { transform: translateX(-37.5%) rotate(270deg) scale(1.1); }
          100% { transform: translateX(-50%) rotate(360deg) scale(1); }
        }
        @keyframes glitchScroll {
          0%, 100% { transform: translateX(0); clip-path: inset(0 0 0 0); }
          10% { transform: translateX(-1%) translateY(1px); clip-path: inset(10% 0 90% 0); }
          20% { transform: translateX(-25%) translateY(-1px); clip-path: inset(20% 0 80% 0); }
          30% { transform: translateX(-26%) translateY(1px); clip-path: inset(30% 0 70% 0); }
          40% { transform: translateX(-25%) translateY(-1px); clip-path: inset(40% 0 60% 0); }
          50% { transform: translateX(-25%) translateY(1px); clip-path: inset(50% 0 50% 0); }
          60% { transform: translateX(-25%) translateY(-1px); clip-path: inset(60% 0 40% 0); }
          70% { transform: translateX(-25%) translateY(1px); clip-path: inset(70% 0 30% 0); }
          80% { transform: translateX(-25%) translateY(-1px); clip-path: inset(80% 0 20% 0); }
          90% { transform: translateX(-25%) translateY(1px); clip-path: inset(90% 0 10% 0); }
        }
        @keyframes rainbowScroll {
          0% { transform: translateX(0); filter: hue-rotate(0deg); }
          25% { transform: translateX(-12.5%); filter: hue-rotate(90deg); }
          50% { transform: translateX(-25%); filter: hue-rotate(180deg); }
          75% { transform: translateX(-37.5%); filter: hue-rotate(270deg); }
          100% { transform: translateX(-50%); filter: hue-rotate(360deg); }
        }
        @keyframes fireScroll {
          0%, 100% { transform: translateX(0); filter: sepia(1) saturate(2) brightness(1.2) hue-rotate(0deg); }
          25% { transform: translateX(-12.5%); filter: sepia(1) saturate(2) brightness(1.4) hue-rotate(10deg); }
          50% { transform: translateX(-25%); filter: sepia(1) saturate(2) brightness(1.6) hue-rotate(20deg); }
          75% { transform: translateX(-37.5%); filter: sepia(1) saturate(2) brightness(1.4) hue-rotate(10deg); }
        }
        @keyframes iceScroll {
          0%, 100% { transform: translateX(0); filter: brightness(1) saturate(0.8) hue-rotate(180deg); }
          25% { transform: translateX(-12.5%); filter: brightness(1.2) saturate(1) hue-rotate(185deg); }
          50% { transform: translateX(-25%); filter: brightness(1.4) saturate(1.2) hue-rotate(190deg); }
          75% { transform: translateX(-37.5%); filter: brightness(1.2) saturate(1) hue-rotate(185deg); }
        }
      `}</style>
      <motion.div
        className={`${currentTheme.bg} border-2 ${currentTheme.border} rounded-lg px-4 py-3 md:px-6 md:py-4 shadow-lg ${currentTheme.shadow} overflow-hidden`}
        animate={{
          boxShadow: [
            `0 0 10px ${currentTheme.glow}, ${glowIntensities[settings.glowIntensity as keyof typeof glowIntensities]})`,
            `0 0 20px ${currentTheme.glow}, ${glowIntensities[settings.glowIntensity as keyof typeof glowIntensities] * 1.5})`,
            `0 0 10px ${currentTheme.glow}, ${glowIntensities[settings.glowIntensity as keyof typeof glowIntensities]})`,
          ]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <div 
          className="announcement-track"
          style={{
            animation: `${settings.animationType === 'fade' ? 'fadeScroll' : 
                        settings.animationType === 'bounce' ? 'bounceScroll' :
                        settings.animationType === 'wave' ? 'waveScroll' :
                        settings.animationType === 'typewriter' ? 'typewriterScroll' :
                        settings.animationType === 'pulse' ? 'pulseScroll' :
                        settings.animationType === 'shimmer' ? 'shimmerScroll' :
                        settings.animationType === 'neon' ? 'neonScroll' :
                        settings.animationType === 'matrix' ? 'matrixScroll' :
                        settings.animationType === 'particle' ? 'particleScroll' :
                        settings.animationType === 'glitch' ? 'glitchScroll' :
                        settings.animationType === 'rainbow' ? 'rainbowScroll' :
                        settings.animationType === 'fire' ? 'fireScroll' :
                        settings.animationType === 'ice' ? 'iceScroll' : 'carouselScroll'} ${speedConfigs[settings.speed as keyof typeof speedConfigs]}s linear infinite`,
            display: settings.animationType === 'typewriter' ? 'block' : 'inline-flex',
            willChange: 'transform',
            overflow: settings.animationType === 'typewriter' ? 'hidden' : 'visible',
            whiteSpace: settings.animationType === 'typewriter' ? 'nowrap' : 'normal'
          }}
        >
          {[...Array(2)].map((_, setIndex) => (
            <div key={setIndex} className="flex items-center whitespace-nowrap">
              {announcements.map((msg, i) => (
                <span
                  key={`${setIndex}-${i}`}
                  className={`${currentTheme.text} ${fontStyles[settings.fontStyle as keyof typeof fontStyles]} text-sm md:text-base tracking-wide px-4`}
                  style={{ textShadow: `0 0 10px ${currentTheme.glow}, ${glowIntensities[settings.glowIntensity as keyof typeof glowIntensities]})` }}
                >
                  📢 {msg}
                  <span className="mx-4">•</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </motion.div>
    </>
  )
}
