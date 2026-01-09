'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { GameState } from '@/lib/game/types'
import { useAudio } from '@/components/audio/AudioContext'
import { loadBaseboundProfile, saveBaseboundProfile } from '@/lib/game/baseboundProfile'

const BaseboundGame = dynamic(
  () => import('@/components/basebound/BaseboundGame').then(mod => ({ default: mod.BaseboundGame })),
  { ssr: false }
)

const GameOverModal = dynamic(
  () => import('@/components/basebound/GameOverModal').then(mod => ({ default: mod.GameOverModal })),
  { ssr: false }
)

export default function BaseboundPage() {
  const router = useRouter()
  const { playMusic } = useAudio()
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [gameKey, setGameKey] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    playMusic('main-menu')
  }, [playMusic])

  const handleGameOver = useCallback((state: GameState) => {
    setGameState(state)

    try {
      const profile = loadBaseboundProfile()
      const next = {
        ...profile,
        coins: profile.coins + (state.coins ?? 0),
        bestDistance: Math.max(profile.bestDistance ?? 0, state.distance ?? 0)
      }
      saveBaseboundProfile(next)
    } catch {
      // ignore persistence errors
    }
  }, [])

  const handleRetry = useCallback(() => {
    setGameState(null)
    setGameKey(prev => prev + 1)
  }, [])

  const handleExit = useCallback(() => {
    router.push('/')
  }, [router])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 bg-black">
      {/* Overlay menu */}
      <div className="fixed top-4 right-4 z-50">
        <button
          className="px-4 py-2 rounded bg-yellow-600 hover:bg-yellow-500 text-black font-bold"
          onClick={() => router.push('/basebound/garage')}
        >
          Garage
        </button>
      </div>

      {/* Game Canvas */}
      <BaseboundGame key={gameKey} onGameOver={handleGameOver} />

      {/* Game Over Modal */}
      {gameState?.isGameOver && (
        <GameOverModal
          gameState={gameState}
          onRetry={handleRetry}
          onExit={handleExit}
        />
      )}
    </div>
  )
}
