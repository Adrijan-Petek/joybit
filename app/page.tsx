'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { WalletButton } from '@/components/WalletButton'
import { AudioButtons } from '@/components/AudioButtons'
import { Logo } from '@/components/Logo'
import Image from 'next/image'
import { useAudio } from '@/components/audio/AudioContext'
import { useReadContract } from 'wagmi'
import { formatEther } from 'viem'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { TREASURY_ABI } from '@/lib/contracts/abis'
import { notifyAnnouncement, notifyPlayGame } from '@/lib/utils/farcasterNotifications'
import { sdk } from '@farcaster/miniapp-sdk'

// Utility function to format token balances with reasonable precision
function formatTokenBalance(balance: bigint | undefined): string {
  if (!balance) return '0'
  
  const formatted = formatEther(balance)
  const num = parseFloat(formatted)
  
  // For large numbers (> 1000), show 2 decimal places
  if (num >= 1000) {
    return num.toFixed(2)
  }
  
  // For medium numbers (100-999), show 4 decimal places  
  if (num >= 100) {
    return num.toFixed(4)
  }
  
  // For smaller numbers, show 6 decimal places
  return num.toFixed(6)
}

export default function Home() {
  const router = useRouter()
  const { playMusic } = useAudio()
  const [mounted, setMounted] = useState(false)
  const [logoClickCount, setLogoClickCount] = useState(0)
  const [announcements, setAnnouncements] = useState<string[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState('')
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
    
    // Load announcements from localStorage
    const saved = localStorage.getItem('joybit_announcements')
    if (saved) {
      const parsed = JSON.parse(saved)
      setAnnouncements(parsed.filter((a: string) => a.trim()))
    } else {
      // Set default announcements
      setAnnouncements([
        'Welcome to Joybit! Play Match-3 and earn JOYB tokens!',
        'Connect your wallet to start playing and earning rewards!',
        'Join our community and compete on the leaderboard!',
        'Daily rewards available! Claim your free JOYB every 24 hours!',
        'New players get one free game to try - no wallet needed!'
      ])
    }

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
          console.log('❌ No supported tokens from blockchain')
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
    <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
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

      {/* Audio Controls & Wallet Button */}
      <div className="fixed top-3 right-3 md:top-4 md:right-4 z-50 flex items-center gap-2">
        <AudioButtons />
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
            <p className="text-sm md:text-base text-gray-400 mt-2 ml-1">Match-3 Fun on Base</p>
          </motion.div>
        </motion.header>

        {/* Announcement Banner */}
        {announcements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 md:mb-8"
          >
            <motion.div 
              className="bg-black border-2 border-yellow-500 rounded-lg px-4 py-3 md:px-6 md:py-4 shadow-lg shadow-yellow-500/20 overflow-hidden"
              animate={{
                boxShadow: [
                  '0 0 10px rgba(234, 179, 8, 0.2)',
                  '0 0 20px rgba(234, 179, 8, 0.4)',
                  '0 0 10px rgba(234, 179, 8, 0.2)',
                ]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <style jsx>{`
                @keyframes carouselScroll {
                  0% {
                    transform: translateX(0);
                  }
                  100% {
                    transform: translateX(-50%);
                  }
                }
                .carousel-track {
                  animation: carouselScroll 35s linear infinite;
                  display: inline-flex;
                  will-change: transform;
                }
              `}</style>
              <div className="carousel-track">
                {[...Array(2)].map((_, setIndex) => (
                  <div key={setIndex} className="flex items-center whitespace-nowrap">
                    {announcements.map((msg, i) => (
                      <span 
                        key={`${setIndex}-${i}`} 
                        className="text-yellow-400 font-mono text-sm md:text-base tracking-wide px-4"
                        style={{ textShadow: '0 0 10px rgba(234, 179, 8, 0.5)' }}
                      >
                        📢 {msg}
                        <span className="mx-4">•</span>
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-8 md:mb-12">
            {/* Play Match-3 Game */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-900/50 backdrop-blur-lg rounded-xl p-5 md:p-6 shadow-2xl border border-gray-800 hover:border-gray-700 transition-all"
            >
              <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">🎮 Play. Win. Earn JOYB.</h2>
              <p className="text-gray-400 mb-4 md:mb-5 text-sm md:text-base">
                Beat Match-3 milestone levels 15, 20, and 30 for massive JOYB rewards and climb the leaderboard for seasonal prize drops.
              </p>
              <button
                onClick={() => router.push('/game')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 md:py-4 px-6 md:px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-sm md:text-base"
              >
                Start Playing
              </button>
            </motion.div>

            {/* Card Game */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-900/50 backdrop-blur-lg rounded-xl p-5 md:p-6 shadow-2xl border border-gray-800 hover:border-gray-700 transition-all"
            >
              <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">🃏 3-Card Game</h2>
              <p className="text-gray-400 mb-4 md:mb-5 text-sm md:text-base">
                Flip the cards, test your luck, and win 2,000 JOYB per victory! One free play daily - play again anytime..
              </p>
              <button
                onClick={() => router.push('/card-game')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 md:py-4 px-6 md:px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-sm md:text-base"
              >
                Try Your Luck
              </button>
            </motion.div>
          </div>

          {/* Additional Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              onClick={() => router.push('/daily-claim')}
              className="bg-gray-900/50 backdrop-blur-lg rounded-xl p-4 md:p-5 hover:bg-gray-800/50 transition-all border border-gray-800"
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
              className="bg-gray-900/50 backdrop-blur-lg rounded-xl p-4 md:p-5 hover:bg-gray-800/50 transition-all border border-gray-800"
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
              className="bg-gray-900/50 backdrop-blur-lg rounded-xl p-4 md:p-5 hover:bg-gray-800/50 transition-all border border-gray-800"
            >
              <div className="text-2xl md:text-3xl mb-1 md:mb-2">👤</div>
              <h3 className="font-bold text-sm md:text-base">Profile</h3>
              <p className="text-xs md:text-sm text-gray-400">Claim your rewards</p>
            </motion.button>
          </div>

          {/* Joybit Token Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-8 md:mt-12"
          >
            <div className="bg-cyan-500/20 backdrop-blur-lg border border-cyan-400/50 rounded-xl p-5 md:p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
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
                      className="text-xs font-mono text-cyan-300 hover:text-cyan-200 transition-colors"
                    >
                      0xc732932ca7db558cf1bacc17b4f4f7e149e0eb07
                    </a>
                  </div>
                </div>
                <div className="flex flex-col gap-2 w-full md:w-auto">
                  <a
                    href="https://app.uniswap.org/#/swap?outputCurrency=0xc732932ca7db558cf1bacc17b4f4f7e149e0eb07&chain=base"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-center text-sm md:text-base whitespace-nowrap"
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
          </motion.div>

          {/* Additional Reward Tokens */}
          {rewardTokens.length > 0 && rewardTokens.map((token, index) => (
            <motion.div
              key={token.address}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.75 + (index * 0.1) }}
              className="mt-4"
            >
              <div className="bg-purple-500/20 backdrop-blur-lg border border-purple-400/50 rounded-xl p-5 md:p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
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
                  <div className="flex flex-col gap-2 w-full md:w-auto">
                    <a
                      href={`https://app.uniswap.org/#/swap?outputCurrency=${token.address}&chain=base`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-center text-sm md:text-base whitespace-nowrap"
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
            </motion.div>
          ))}

          {/* Treasury Balances */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75 }}
            className="mt-8 md:mt-12"
          >
            <div className="bg-blue-500/20 backdrop-blur-lg border border-blue-400/50 rounded-xl p-5 md:p-6">
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
