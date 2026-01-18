'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { GameState } from '@/lib/game/types'
import { useAudio } from '@/components/audio/AudioContext'
import { loadBaseboundProfile, saveBaseboundProfile } from '@/lib/game/baseboundProfile'
import { useAccount } from 'wagmi'
import { formatEther } from 'viem'
import { AnimatePresence, motion } from 'framer-motion'
import { WalletButton } from '@/components/WalletButton'
import { useBaseboundGame, useBaseboundGameData } from '@/lib/hooks/useBaseboundGame'

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
  const { address, isConnected } = useAccount()
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null)
  const [gameKey, setGameKey] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [showStartPopup, setShowStartPopup] = useState(true)
  const [startMode, setStartMode] = useState<'play' | 'retry'>('play')
  const [pendingAction, setPendingAction] = useState<'play' | 'retry' | null>(null)
  const [pendingHash, setPendingHash] = useState<`0x${string}` | null>(null)
  const [isGameActive, setIsGameActive] = useState(false)
  const shareSnapshotKey = 'basebound_last_snapshot'
  const { startGame, retryGame, isStarting, isConfirmed, txHash } = useBaseboundGame()
  const { canPlayFree, playFee, retryFee } = useBaseboundGameData(address)

  useEffect(() => {
    setMounted(true)
    playMusic('main-menu')
    try {
      const cachedSnapshot = window.localStorage.getItem(shareSnapshotKey)
      if (cachedSnapshot) setShareImageUrl(cachedSnapshot)
    } catch {
      // ignore storage errors
    }
  }, [playMusic, shareSnapshotKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const skipTx = params.get('skipTx') === '1'
    if (skipTx) {
      setShowStartPopup(false)
      setIsGameActive(true)
      setGameKey(prev => prev + 1)
      setStartMode('play')
    }
  }, [])

  useEffect(() => {
    const handleOrientationReset = () => {
      if (!isGameActive) return
      setGameState(null)
      setShowStartPopup(true)
      setIsGameActive(false)
      setStartMode('play')
      setGameKey(prev => prev + 1)
    }

    window.addEventListener('orientationchange', handleOrientationReset)
    window.screen?.orientation?.addEventListener('change', handleOrientationReset)

    return () => {
      window.removeEventListener('orientationchange', handleOrientationReset)
      window.screen?.orientation?.removeEventListener('change', handleOrientationReset)
    }
  }, [isGameActive])

  useEffect(() => {
    if (!pendingHash || !pendingAction) return
    if (isConfirmed && txHash === pendingHash) {
      setShowStartPopup(false)
      setIsGameActive(true)
      setGameKey(prev => prev + 1)
      setPendingHash(null)
      setPendingAction(null)
      setStartMode('play')
    }
  }, [isConfirmed, pendingHash, pendingAction, txHash])

  const handleStartGame = useCallback(async () => {
    if (!isConnected) return
    const isFree = canPlayFree ?? false
    const value = isFree ? 0n : (playFee ?? 0n)
    try {
      const hash = await startGame(value)
      setPendingHash(hash)
      setPendingAction('play')
    } catch (error) {
      console.error('Failed to start basebound game:', error)
      setPendingHash(null)
      setPendingAction(null)
    }
  }, [isConnected, canPlayFree, playFee, startGame])

  const handleRetryGame = useCallback(async () => {
    if (!isConnected) return
    const value = retryFee ?? 0n
    try {
      const hash = await retryGame(value)
      setPendingHash(hash)
      setPendingAction('retry')
    } catch (error) {
      console.error('Failed to retry basebound game:', error)
      setPendingHash(null)
      setPendingAction(null)
    }
  }, [isConnected, retryFee, retryGame])

  const uploadSnapshot = useCallback(async (snapshotUrl: string) => {
    try {
      const response = await fetch('/api/imgbb-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: snapshotUrl,
          name: `basebound-${Date.now()}`
        })
      })
      if (!response.ok) {
        throw new Error(await response.text())
      }
      const data = await response.json()
      if (data?.url) {
        setShareImageUrl(data.url)
        try {
          window.localStorage.setItem(shareSnapshotKey, data.url)
        } catch {
          // ignore storage errors
        }
      }
    } catch (error) {
      console.warn('ImgBB upload failed:', error)
    }
  }, [shareSnapshotKey])

  const handleGameOver = useCallback((state: GameState, snapshotUrl?: string | null) => {
    setGameState(state)
    setShareImageUrl(snapshotUrl ?? null)
    if (snapshotUrl) {
      try {
        window.localStorage.setItem(shareSnapshotKey, snapshotUrl)
      } catch {
        // ignore storage errors
      }
      uploadSnapshot(snapshotUrl)
    }

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
  }, [shareSnapshotKey, uploadSnapshot])

  const handleRetry = useCallback(() => {
    setGameState(null)
    setShareImageUrl(null)
    setIsGameActive(false)
    setShowStartPopup(true)
    setStartMode('retry')
  }, [])

  const handleExit = useCallback(() => {
    router.push('/')
  }, [router])

  if (!mounted) return null

  const isDataReady = typeof canPlayFree === 'boolean' && typeof playFee === 'bigint' && typeof retryFee === 'bigint'
  const showFreePlay = canPlayFree ? 'FREE ✅' : `${formatEther(playFee || 0n)} ETH`
  const retryCost = `${formatEther(retryFee || 0n)} ETH`

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
      {isGameActive && (
        <BaseboundGame key={gameKey} onGameOver={handleGameOver} />
      )}

      {/* Game Over Modal */}
      {gameState?.isGameOver && (
        <GameOverModal
          gameState={gameState}
          shareImageUrl={shareImageUrl}
          onRetry={handleRetry}
          onExit={handleExit}
        />
      )}

      <AnimatePresence>
        {showStartPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm rounded-2xl border border-cyan-500/40 bg-gradient-to-br from-gray-900 to-black p-5 shadow-2xl"
            >
              <h2 className="mb-4 text-center text-2xl font-bold text-cyan-300">🏁 Basebound</h2>

              {!isConnected ? (
                <div className="space-y-3">
                  <p className="text-center text-sm text-yellow-400">⚠️ Connect wallet to play</p>
                  <WalletButton />
                  <button
                    onClick={() => router.push('/')}
                    className="w-full rounded-lg bg-gray-700 py-2.5 font-semibold text-white transition-all hover:bg-gray-600"
                  >
                    ← Back to Home
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Daily Free Play:</span>
                      <span className={canPlayFree ? 'text-green-400' : 'text-red-400'}>
                        {canPlayFree ? 'Available' : 'Used'}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-gray-400">Play Fee:</span>
                      <span className="text-cyan-300">{showFreePlay}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-gray-400">Retry Fee:</span>
                      <span className="text-cyan-300">{retryCost}</span>
                    </div>
                  </div>

                  <button
                    onClick={startMode === 'retry' ? handleRetryGame : handleStartGame}
                    disabled={!isDataReady || isStarting}
                    className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 font-bold text-white transition-all hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50"
                  >
                    {isStarting ? '⏳ Waiting for confirmation...' : startMode === 'retry' ? '🔁 Retry Run' : '🚗 Start Run'}
                  </button>

                  <button
                    onClick={() => router.push('/')}
                    className="w-full rounded-lg bg-gray-700 py-2.5 font-semibold text-white transition-all hover:bg-gray-600"
                  >
                    ← Back to Home
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
