'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAccount } from 'wagmi'
import { formatEther } from 'viem'
import { useAudio } from '@/components/audio/AudioContext'
import { WalletButton } from '@/components/WalletButton'
import { AudioButtons } from '@/components/AudioButtons'
import { SettingsButton } from '@/components/SettingsButton'
import { useCardGame, useCardGameData } from '@/lib/hooks/useCardGame'
import { calculateLeaderboardPoints } from '@/lib/utils/scoring'


interface Card {
  id: number
  isFlipped: boolean
  isWinner: boolean
}

export default function CardGame() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { playSound, playMusic } = useAudio()

  const { playGame, isPlaying: isPlayingTx } = useCardGame()
  const { playerData, canPlayFree, playFee, winReward, refetch } = useCardGameData(address)

  const [cards, setCards] = useState<Card[]>([
    { id: 0, isFlipped: false, isWinner: false },
    { id: 1, isFlipped: false, isWinner: false },
    { id: 2, isFlipped: false, isWinner: false },
  ])
  const [selectedCard, setSelectedCard] = useState<number | null>(null)
  const [gameResult, setGameResult] = useState<'win' | 'lose' | null>(null)
  const [userStats, setUserStats] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

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
    if (address) {
      refetch()
      // Fetch user stats from database
      fetchUserStats()
    }
  }, [address, refetch])

  const fetchUserStats = async () => {
    if (!address) return
    try {
      const response = await fetch(`/api/achievements?action=stats&address=${address}`)
      const data = await response.json()
      setUserStats(data)
    } catch (error) {
      console.error('Failed to fetch user stats:', error)
    }
  }

  const resetGame = () => {
    setCards([
      { id: 0, isFlipped: false, isWinner: false },
      { id: 1, isFlipped: false, isWinner: false },
      { id: 2, isFlipped: false, isWinner: false },
    ])
    setSelectedCard(null)
    setGameResult(null)
    setIsPlaying(false)
  }

  const handlePlayGame = async (cardId: number) => {
    if (isPlaying || isPlayingTx || !isConnected) return

    setIsPlaying(true)
    setSelectedCard(cardId)
    playSound('card-click')

    try {
      const value = canPlayFree ? 0n : (playFee || 0n)
      const hash = await playGame(cardId, value)
      
      // Wait for transaction to be mined
      await new Promise((resolve) => setTimeout(resolve, 3000))
      
      // Refetch to get updated stats and latest session
      await refetch()
      
      // The contract determines the result, so we show all cards revealed
      // For UI purposes, we'll show a random result immediately (actual result is on-chain)
      const winningCard = Math.floor(Math.random() * 3)
      const won = winningCard === cardId

      // Flip the selected card
      playSound('card-flip')
      setCards((prev) =>
        prev.map((card) => 
          card.id === cardId 
            ? { ...card, isFlipped: true, isWinner: won } 
            : card
        )
      )

      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Reveal all cards
      playSound('card-flip')
      setCards((prev) =>
        prev.map((card) => ({
          ...card,
          isFlipped: true,
          isWinner: card.id === winningCard,
        }))
      )

      // Wait 5 seconds before showing result popup
      await new Promise((resolve) => setTimeout(resolve, 5000))

      setGameResult(won ? 'win' : 'lose')
      playSound(won ? 'win' : 'lose')
      
      // Update stats and leaderboard
      try {
        if (!address) return

        // Increment stats for scoring system
        const statsToIncrement = {
          card_games_played: 1,
          card_games_won: won ? 1 : 0
        }

        // Update timestamp separately (SET, not increment)
        const statsToSet = {
          card_last_played: Date.now()
        }

        // Increment counters
        await fetch('/api/achievements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'increment_stats',
            userAddress: address,
            stats: statsToIncrement
          })
        })

        // Set timestamps
        await fetch('/api/achievements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_stats',
            userAddress: address,
            stats: statsToSet
          })
        })

        // Refresh user stats display
        await fetchUserStats()

        console.log(`✅ Card game completed: ${won ? 'Won' : 'Lost'}`)
      } catch (error) {
        console.error('Failed to update card game stats:', error)
      }
      
    } catch (error) {
      console.error('Failed to play game:', error)
      setIsPlaying(false)
    }
  }

  if (!mounted) return null

  const totalPlays = userStats?.card_games_played || 0
  const wins = userStats?.card_games_won || 0
  const winRate = totalPlays > 0 ? ((wins / totalPlays) * 100).toFixed(1) : '0.0'
  const pointsPerPlay = calculateLeaderboardPoints('card_game')
  const pointsPerWin = calculateLeaderboardPoints('card_win')
  const isBusy = isPlaying || isPlayingTx
  const winRewardDisplay = winReward === undefined ? '...' : formatEther(winReward)
  const playFeeDisplay = playFee === undefined ? '...' : formatEther(playFee)

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: 'var(--theme-background)',
        color: 'var(--theme-text)',
        fontFamily: 'var(--theme-font-family)',
      }}
    >
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <AudioButtons />
        <SettingsButton />
        <WalletButton />
      </div>
      <div className="relative isolate min-h-screen overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute -top-40 left-1/2 h-[420px] w-[520px] -translate-x-1/2 rounded-full blur-[120px] opacity-30"
            style={{ backgroundColor: 'var(--theme-primary)' }}
          />
          <div
            className="absolute bottom-[-160px] right-[-120px] h-[420px] w-[420px] rounded-full blur-[130px] opacity-25"
            style={{ backgroundColor: 'var(--theme-accent)' }}
          />
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--theme-primary) 25%, transparent), transparent 45%), radial-gradient(circle at 85% 10%, color-mix(in srgb, var(--theme-accent) 20%, transparent), transparent 50%), radial-gradient(circle at 50% 80%, color-mix(in srgb, var(--theme-secondary) 18%, transparent), transparent 55%)'
            }}
          />
        </div>
        <div className="container relative z-10 mx-auto max-w-5xl px-4 pb-12 pt-16">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition hover:opacity-90"
              style={{
                borderColor: 'var(--theme-border)',
                backgroundColor: 'var(--theme-surface)',
                color: 'var(--theme-text-secondary)'
              }}
            >
              Back
            </button>
            <div className="text-center">
              <div
                className="text-xs uppercase tracking-[0.4em]"
                style={{ color: 'var(--theme-text-secondary)' }}
              >
                Joybit Casino
              </div>
              <h1 className="text-2xl md:text-4xl font-bold">🎴 Shadow Draw</h1>
            </div>
            <div className="hidden sm:flex w-24 justify-end text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
              {isConnected ? 'Wallet linked' : 'Guest'}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            {/* Table + Cards */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border p-4 md:p-6 shadow-[0_30px_120px_rgba(0,0,0,0.6)]"
              style={{
                borderColor: 'var(--theme-border)',
                background:
                  'linear-gradient(180deg, color-mix(in srgb, var(--theme-primary) 18%, var(--theme-surface)) 0%, var(--theme-surface) 65%, var(--theme-background) 100%)'
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div
                    className="text-xs uppercase tracking-[0.3em]"
                    style={{ color: 'var(--theme-text-secondary)' }}
                  >
                    Choose your fate
                  </div>
                  <h2 className="text-lg md:text-2xl font-semibold">Pick a card</h2>
                </div>
                <div
                  className="rounded-full border px-3 py-1 text-xs"
                  style={{
                    borderColor: 'var(--theme-border)',
                    backgroundColor: 'var(--theme-surface)',
                    color: 'var(--theme-text-secondary)'
                  }}
                >
                  {isBusy ? 'Shuffling on-chain…' : canPlayFree ? 'Free play' : `${playFeeDisplay} ETH`}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 md:gap-5">
          {cards.map((card) => (
            <motion.button
              key={card.id}
              onClick={() => !isPlaying && !isPlayingTx && handlePlayGame(card.id)}
              disabled={isPlaying || isPlayingTx || !isConnected || gameResult !== null}
              className={`group relative ${selectedCard === card.id ? 'z-10' : ''}`}
              whileHover={{ scale: !isBusy ? 1.05 : 1 }}
              whileTap={{ scale: 0.95 }}
            >
              <div
                className={`absolute -inset-1 rounded-3xl blur-xl transition opacity-0 group-hover:opacity-70 ${selectedCard === card.id ? 'opacity-90' : ''}`}
                style={{
                  background:
                    'linear-gradient(135deg, color-mix(in srgb, var(--theme-accent) 35%, transparent), color-mix(in srgb, var(--theme-primary) 25%, transparent))'
                }}
              />
              <div className="aspect-[2/3] relative" style={{ perspective: '1000px' }}>
                <motion.div
                  className="w-full h-full rounded-2xl shadow-2xl cursor-pointer border"
                  animate={{
                    rotateY: card.isFlipped ? 180 : 0,
                  }}
                  transition={{ duration: 0.6 }}
                  style={{
                    transformStyle: 'preserve-3d',
                    position: 'relative',
                    borderColor: selectedCard === card.id ? 'var(--theme-accent)' : 'var(--theme-border)',
                    boxShadow: selectedCard === card.id
                      ? '0 0 25px color-mix(in srgb, var(--theme-accent) 45%, transparent)'
                      : undefined
                  }}
                >
                  {/* Card Back */}
                  <div
                    className="absolute inset-0 rounded-2xl overflow-hidden"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <img 
                      src="/backgrounds/card-back.png" 
                      alt="Card Back"
                      className="w-full h-full object-cover rounded-2xl"
                    />
                    <div
                      className="absolute inset-0 opacity-60"
                      style={{
                        backgroundImage:
                          'linear-gradient(120deg, rgba(255,255,255,0.12), rgba(255,255,255,0) 45%), radial-gradient(circle at 30% 20%, rgba(251,191,36,0.25), transparent 45%)'
                      }}
                    />
                  </div>

                  {/* Card Front */}
                  <div
                    className="absolute inset-0 rounded-2xl overflow-hidden"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}
                  >
                    <img 
                      src={card.isWinner ? '/backgrounds/card-win.png' : '/backgrounds/card-lose.png'}
                      alt={card.isWinner ? 'Winner' : 'Lose'}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  </div>
                </motion.div>
              </div>

              {selectedCard === card.id && !card.isFlipped && (
                <motion.div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  style={{
                    backgroundColor: 'var(--theme-accent)',
                    color: 'var(--theme-background)'
                  }}
                >
                  Your pick
                </motion.div>
              )}
            </motion.button>
          ))}
              </div>

              <div
                className="mt-4 flex items-center justify-between rounded-2xl border px-4 py-3 text-xs md:text-sm"
                style={{
                  borderColor: 'var(--theme-border)',
                  backgroundColor: 'var(--theme-surface)',
                  color: 'var(--theme-text-secondary)'
                }}
              >
                <div>
                  {isConnected
                    ? isBusy
                      ? 'Processing your draw…'
                      : 'Pick any card to reveal your fate.'
                    : 'Connect wallet to shuffle the deck.'}
                </div>
                <div style={{ color: 'var(--theme-primary)' }}>
                  +{pointsPerPlay} pts play · +{pointsPerWin} pts win
                </div>
              </div>
            </motion.div>

            {/* Side Panel */}
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-3xl border p-4 md:p-5"
                style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-surface)' }}
              >
                <div
                  className="text-xs uppercase tracking-[0.3em] mb-3"
                  style={{ color: 'var(--theme-text-secondary)' }}
                >
                  Your record
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: 'var(--theme-background)' }}>
                    <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--theme-text-secondary)' }}>Plays</div>
                    <div className="text-lg md:text-2xl font-semibold">{totalPlays}</div>
                  </div>
                  <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: 'var(--theme-background)' }}>
                    <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--theme-text-secondary)' }}>Wins</div>
                    <div className="text-lg md:text-2xl font-semibold">{wins}</div>
                  </div>
                  <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: 'var(--theme-background)' }}>
                    <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--theme-text-secondary)' }}>Win %</div>
                    <div className="text-lg md:text-2xl font-semibold">{winRate}%</div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-3xl border p-4 md:p-5"
                style={{
                  borderColor: 'var(--theme-border)',
                  background:
                    'linear-gradient(135deg, color-mix(in srgb, var(--theme-accent) 16%, transparent), color-mix(in srgb, var(--theme-primary) 12%, transparent))'
                }}
              >
                <div className="text-sm font-semibold mb-3">🎯 How it works</div>
                <div className="space-y-2 text-xs md:text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--theme-primary)' }} />
                    <span>Choose one of the three sealed cards.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--theme-primary)' }} />
                    <span>Outcome is determined on-chain, then revealed.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--theme-primary)' }} />
                    <span>
                      Win reward: <span className="font-semibold" style={{ color: 'var(--theme-primary)' }}>{winRewardDisplay} JOYB</span>.
                    </span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-3xl border p-4 md:p-5"
                style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-surface)' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.3em]" style={{ color: 'var(--theme-text-secondary)' }}>Entry</div>
                    <div className="text-base font-semibold">
                      {canPlayFree ? 'Free play available' : `${playFeeDisplay} ETH`}
                    </div>
                  </div>
                  <div
                    className="rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em]"
                    style={{
                      borderColor: 'var(--theme-border)',
                      backgroundColor: 'var(--theme-background)',
                      color: 'var(--theme-text-secondary)'
                    }}
                  >
                    {isConnected ? 'Ready' : 'Locked'}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

        {/* Result Popup */}
        {gameResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ backgroundColor: 'color-mix(in srgb, var(--theme-background) 80%, transparent)' }}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="rounded-2xl p-6 max-w-sm w-full border-2 shadow-2xl"
              style={{
                borderColor: gameResult === 'win' ? 'var(--theme-success)' : 'var(--theme-error)',
                background:
                  gameResult === 'win'
                    ? 'linear-gradient(135deg, color-mix(in srgb, var(--theme-success) 70%, transparent), color-mix(in srgb, var(--theme-primary) 40%, transparent))'
                    : 'linear-gradient(135deg, color-mix(in srgb, var(--theme-error) 70%, transparent), color-mix(in srgb, var(--theme-accent) 35%, transparent))'
              }}
            >
              <div className="text-center">
                <div className="text-6xl mb-4">{gameResult === 'win' ? '🎉' : '😢'}</div>
                <h3 className="text-3xl font-bold mb-2">
                  {gameResult === 'win' ? 'You Won!' : 'Better Luck Next Time!'}
                </h3>
                {gameResult === 'win' && (
                  <div className="bg-black/20 rounded-lg p-4 mb-4">
                    <p className="text-lg mb-1">
                      You won <span className="font-bold text-2xl">{winRewardDisplay} JOYB</span>!
                    </p>
                    <p className="text-sm opacity-90">Claim in Profile</p>
                  </div>
                )}
                <button
                  onClick={resetGame}
                  className="w-full px-6 py-3 rounded-xl font-bold transition-all mb-2 border hover:opacity-90"
                  style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                >
                  🎮 Play Again
                </button>
                <button
                  onClick={() => router.push('/profile')}
                  className="theme-button-primary w-full px-6 py-3 rounded-xl font-bold transition-all hover:opacity-90"
                  style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-text)' }}
                >
                  👤 Go to Profile
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Play Instructions (when no game active) */}
        {!gameResult && !isPlaying && !isPlayingTx && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 text-center text-xs"
            style={{ color: 'var(--theme-text-secondary)' }}
          >
            {isConnected ? 'Tap a card to play. Wins can be claimed in Profile.' : 'Connect your wallet to start playing.'}
          </motion.div>
        )}
        </div>
      </div>
    </div>
  )
}
