'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { GameState } from '@/lib/game/types'
import { useAudio } from '@/components/audio/AudioContext'

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
      {/* Back Button */}
      <button
        onClick={handleExit}
        className="absolute top-4 left-4 z-40 bg-gray-900/80 hover:bg-gray-800 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition-all"
      >
        ← Back
      </button>

      {/* Instructions */}
      <div className="absolute top-4 right-4 z-40 bg-gray-900/80 backdrop-blur-sm rounded-lg p-3 text-white text-sm">
        <div className="font-bold mb-1">Controls:</div>
        <div>→ Arrow: Accelerate</div>
        <div>← Arrow: Brake</div>
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
