'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface InfoModalProps {
  isOpen: boolean
  onClose: () => void
}

export function InfoModal({ isOpen, onClose }: InfoModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="max-w-lg rounded-xl border border-white/10 bg-gray-950 p-6 text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-black">How Joybit Works</h2>
              <button
                type="button"
                onClick={onClose}
                className="h-9 w-9 rounded-lg text-lg font-bold"
                aria-label="Close"
              >
                x
              </button>
            </div>

            <div className="space-y-4 text-sm leading-6 text-gray-300">
              <p>
                Joybit is now focused on one game: Match-3. Connect your wallet, play rounds,
                climb the leaderboard, and track rewards from your profile.
              </p>

              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <h3 className="mb-2 font-bold text-white">Scoring</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>Match-3 game: 50 pts</div>
                  <div>Match-3 win: 100 pts</div>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <h3 className="mb-2 font-bold text-white">Flow</h3>
                <ol className="list-inside list-decimal space-y-1">
                  <li>Open Joybit.</li>
                  <li>Wallet connects automatically in supported mini-app contexts.</li>
                  <li>Play Match-3.</li>
                  <li>Check leaderboard and profile.</li>
                </ol>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
