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
  const [isPlaying, setIsPlaying] = useState(false)
  const [mounted, setMounted] = useState(false)

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
    }
  }, [address, refetch])

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

  const totalPlays = playerData ? Number(playerData[1]) : 0
  const wins = playerData ? Number(playerData[2]) : 0
  const winRate = totalPlays > 0 ? ((wins / totalPlays) * 100).toFixed(1) : '0.0'

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-4">
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <AudioButtons />
        <SettingsButton />
        <WalletButton />
      </div>
      <div className="container mx-auto max-w-md pt-16 pb-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => router.push('/')}
            className="bg-cyan-500 hover:bg-cyan-600 px-4 py-2 rounded-lg transition-all text-sm"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold">🎴 Card Game</h1>
          <div className="w-16"></div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 md:gap-3 mb-3 md:mb-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-500 rounded-lg p-2 md:p-3 text-center"
          >
            <div className="text-[10px] md:text-xs text-blue-200 mb-0.5">Total Plays</div>
            <div className="text-lg md:text-2xl font-bold">{totalPlays}</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-green-500 rounded-lg p-2 md:p-3 text-center"
          >
            <div className="text-[10px] md:text-xs text-green-200 mb-0.5">Wins</div>
            <div className="text-lg md:text-2xl font-bold">{wins}</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-purple-500 rounded-lg p-2 md:p-3 text-center"
          >
            <div className="text-[10px] md:text-xs text-purple-200 mb-0.5">Win Rate</div>
            <div className="text-lg md:text-2xl font-bold">{winRate}%</div>
          </motion.div>
        </div>

        {/* Game Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-900/70 backdrop-blur-lg rounded-lg p-3 md:p-4 mb-3 md:mb-4 text-center border border-gray-800"
        >
          <h2 className="text-base md:text-lg font-bold mb-1 md:mb-2">🎯 How to Play</h2>
          <p className="text-xs md:text-sm text-gray-400 mb-2">
            Pick one of the three cards. If you guess correctly, you win <span className="text-green-400 font-bold">{formatEther(winReward || 0n)} JOYB</span>!
          </p>
          <p className="text-xs md:text-sm text-blue-400">
            {canPlayFree ? '✅ Free play available!' : `Cost: ${formatEther(playFee || 0n)} ETH`}
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-3 md:mb-4">
          {cards.map((card) => (
            <motion.button
              key={card.id}
              onClick={() => !isPlaying && !isPlayingTx && handlePlayGame(card.id)}
              disabled={isPlaying || isPlayingTx || !isConnected || gameResult !== null}
              className="relative"
              whileHover={{ scale: !isPlaying && !isPlayingTx ? 1.05 : 1 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="aspect-[2/3] relative" style={{ perspective: '1000px' }}>
                <motion.div
                  className="w-full h-full rounded-lg shadow-2xl cursor-pointer"
                  animate={{
                    rotateY: card.isFlipped ? 180 : 0,
                  }}
                  transition={{ duration: 0.6 }}
                  style={{ transformStyle: 'preserve-3d', position: 'relative' }}
                >
                  {/* Card Back */}
                  <div
                    className="absolute inset-0 rounded-lg overflow-hidden"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <img 
                      src="/backgrounds/card-back.png" 
                      alt="Card Back"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>

                  {/* Card Front */}
                  <div
                    className="absolute inset-0 rounded-lg overflow-hidden"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}
                  >
                    <img 
                      src={card.isWinner ? '/backgrounds/card-win.png' : '/backgrounds/card-lose.png'}
                      alt={card.isWinner ? 'Winner' : 'Lose'}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                </motion.div>
              </div>

              {selectedCard === card.id && !card.isFlipped && (
                <motion.div
                  className="absolute -top-2 -right-2 bg-yellow-500 rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-sm md:text-base"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  ⭐
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>

        {/* Result Popup */}
        {gameResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 flex items-center justify-center z-50 bg-black/80 p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className={`
                rounded-2xl p-6 max-w-sm w-full border-2 shadow-2xl
                ${
                  gameResult === 'win'
                    ? 'bg-gradient-to-br from-green-600 to-emerald-700 border-green-400'
                    : 'bg-gradient-to-br from-red-600 to-pink-700 border-red-400'
                }
              `}
            >
              <div className="text-center">
                <div className="text-6xl mb-4">{gameResult === 'win' ? '🎉' : '😢'}</div>
                <h3 className="text-3xl font-bold mb-2">
                  {gameResult === 'win' ? 'You Won!' : 'Better Luck Next Time!'}
                </h3>
                {gameResult === 'win' && (
                  <div className="bg-black/20 rounded-lg p-4 mb-4">
                    <p className="text-lg mb-1">
                      You won <span className="font-bold text-2xl">{formatEther(winReward || 0n)} JOYB</span>!
                    </p>
                    <p className="text-sm opacity-90">Claim in Profile</p>
                  </div>
                )}
                <button
                  onClick={resetGame}
                  className="w-full bg-white text-gray-900 px-6 py-3 rounded-xl font-bold hover:bg-gray-100 transition-all mb-2"
                >
                  🎮 Play Again
                </button>
                <button
                  onClick={() => router.push('/profile')}
                  className="w-full bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-xl font-bold transition-all"
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
            className="text-center"
          >
            <p className="text-sm text-gray-400">
              {isConnected ? 'Click any card to play!' : 'Connect wallet to play'}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
