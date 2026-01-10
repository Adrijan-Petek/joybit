'use client'

import { GameState } from '@/lib/game/types'
import { motion } from 'framer-motion'

interface GameOverModalProps {
  gameState: GameState
  onRetry: () => void
  onExit: () => void
}

export function GameOverModal({ gameState, onRetry, onExit }: GameOverModalProps) {
  const crashMessage = gameState.crashReason === 'neck'
    ? '💀 Neck Broken!'
    : '⛽ Out of Fuel!'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-gradient-to-br from-gray-900 to-black border border-gray-700 rounded-2xl p-8 max-w-md w-full"
      >
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-2 text-red-400">
            Game Over!
          </h2>
          <p className="text-xl text-gray-400 mb-6">{crashMessage}</p>
          
          <div className="space-y-3 mb-8">
            <div className="bg-black/30 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Distance Traveled</div>
              <div className="text-3xl font-bold text-cyan-300">{gameState.distance}m</div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/30 rounded-lg p-3">
                <div className="text-gray-400 text-xs">Coins</div>
                <div className="text-xl font-bold text-yellow-400">
                  {gameState.coins}
                </div>
              </div>
              <div className="bg-black/30 rounded-lg p-3">
                <div className="text-gray-400 text-xs">Fuel Left</div>
                <div className="text-xl font-bold text-orange-400">
                  {Math.max(0, Math.floor(gameState.fuel))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onRetry}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-105"
            >
              🔄 Retry
            </button>
            <button
              onClick={onExit}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 rounded-xl transition-all"
            >
              Exit
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
