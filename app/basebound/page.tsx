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
