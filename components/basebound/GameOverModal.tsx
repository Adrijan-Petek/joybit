'use client'

import { GameState } from '@/lib/game/types'
import { motion } from 'framer-motion'

interface GameOverModalProps {
  gameState: GameState
  shareImageUrl?: string | null
  onRetry: () => void
  onExit: () => void
  forceLandscape?: boolean
}

export function GameOverModal({ gameState, shareImageUrl, onRetry, onExit, forceLandscape }: GameOverModalProps) {
  const crashMessage = gameState.crashReason === 'neck'
    ? '💀 Neck Broken!'
    : '⛽ Out of Fuel!'

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://joybit.vercel.app'
  const shareText = `🏎️ Just drove ${gameState.distance}m in Joybit Basebound!\n` +
    `💰 Coins: ${gameState.coins}\n` +
    `${shareImageUrl && shareImageUrl.startsWith('http') ? `🖼️ ${shareImageUrl}\n` : ''}\n` +
    `Think you can beat it? #Joybit #Base`
  const buildShareUrl = (channel?: 'base') => {
    const url = new URL('https://warpcast.com/~/compose')
    url.searchParams.set('text', shareText)
    url.searchParams.append('embeds[]', `${baseUrl}/basebound`)
    if (shareImageUrl && shareImageUrl.startsWith('http')) {
      url.searchParams.append('embeds[]', shareImageUrl)
    }
    if (channel) url.searchParams.set('channel', channel)
    return url.toString()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`${forceLandscape ? 'absolute' : 'fixed'} inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4`}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-gradient-to-br from-gray-900 to-black border border-gray-700 rounded-2xl p-4 md:p-5 w-full max-w-[340px] md:max-w-sm max-h-[85vh] overflow-auto"
      >
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-1 text-red-400">
            Game Over!
          </h2>
          <p className="text-base text-gray-400 mb-4">{crashMessage}</p>

          {shareImageUrl && (
            <div className="relative mx-auto mb-3 w-full h-[160px] md:h-[218px] overflow-hidden rounded-lg">
              <img
                src={shareImageUrl}
                alt="Game snapshot"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          )}
          
          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="bg-black/30 rounded-lg p-2.5">
              <div className="text-gray-400 text-[11px]">Distance</div>
              <div className="text-lg font-bold text-cyan-300">{gameState.distance}m</div>
            </div>
            <div className="bg-black/30 rounded-lg p-2.5">
              <div className="text-gray-400 text-[11px]">Coins</div>
              <div className="text-lg font-bold text-yellow-400">
                {gameState.coins}
              </div>
            </div>
            <div className="bg-black/30 rounded-lg p-2.5">
              <div className="text-gray-400 text-[11px]">Fuel</div>
              <div className="text-lg font-bold text-orange-400">
                {Math.max(0, Math.floor(gameState.fuel))}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onRetry}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-2.5 rounded-lg transition-all"
            >
              🔄 Retry
            </button>
            <button
              onClick={onExit}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2.5 rounded-lg transition-all"
            >
              Exit
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <a
              href={buildShareUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-black/40 hover:bg-black/60 text-white font-semibold py-1.5 rounded-lg transition-all text-[11px] text-center"
            >
              🔁 Recast (Farcaster)
            </a>
            <a
              href={buildShareUrl('base')}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-black/40 hover:bg-black/60 text-white font-semibold py-1.5 rounded-lg transition-all text-[11px] text-center"
            >
              🔁 Recast (Base)
            </a>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
