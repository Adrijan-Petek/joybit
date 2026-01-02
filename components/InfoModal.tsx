'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

interface InfoModalProps {
  isOpen: boolean
  onClose: () => void
}

export function InfoModal({ isOpen, onClose }: InfoModalProps) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 flex items-center justify-center p-4 z-[101]"
          >
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              exit={{ y: 20 }}
              className="w-full max-w-md h-[80vh] max-h-[500px] overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 rounded-2xl shadow-2xl border border-purple-500/30"
            >
              <div className="h-full overflow-y-auto p-6 md:p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 md:w-16 md:h-16">
                    <Image
                      src="/branding/logo-small.png"
                      alt="Joybit Logo"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white">Welcome to Joybit!</h2>
                    <p className="text-purple-300 text-sm">Match-3 Gaming on Base Blockchain</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white text-3xl leading-none transition-colors"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="space-y-6 text-gray-300">
                {/* What is Joybit */}
                <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl p-5 border border-blue-500/30">
                  <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                    🎮 What is Joybit?
                  </h3>
                  <p className="text-sm md:text-base leading-relaxed">
                    Joybit is a blockchain-powered gaming platform on Base where you can play Match-3 puzzle games, 
                    compete in card battles, and earn real <span className="text-yellow-400 font-bold">JOYB tokens</span>. 
                    Connect your wallet, play games, and claim rewards daily!
                  </p>
                </div>

                {/* How It Works */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    🎯 How It Works
                  </h3>
                  <div className="space-y-4">
                    {/* Step 1 */}
                    <div className="flex gap-4 bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        1
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-white mb-1">Connect Your Wallet</h4>
                        <p className="text-sm">Click the wallet button in the top right to connect your Base wallet.</p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex gap-4 bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        2
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-white mb-1">Play Games & Earn</h4>
                        <p className="text-sm">
                          • <span className="text-green-400">Match-3:</span> Complete milestone levels (15, 20, 30) for big rewards<br/>
                          • <span className="text-blue-400">Card Game:</span> Win 2,000 JOYB per victory<br/>
                          • <span className="text-yellow-400">Daily Claim:</span> Claim free tokens every 24 hours
                        </p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex gap-4 bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <div className="flex-shrink-0 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                        3
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-white mb-1">Climb the Leaderboard</h4>
                        <p className="text-sm">Earn points for every action and compete for seasonal prizes and rewards!</p>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="flex gap-4 bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <div className="flex-shrink-0 w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                        4
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-white mb-1">Unlock Achievements</h4>
                        <p className="text-sm">Collect NFT achievements by reaching milestones and completing challenges.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scoring System */}
                <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-xl p-5 border border-purple-500/30">
                  <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                    📊 Scoring System
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>• Match-3 Win: <span className="text-green-400 font-bold">100 pts</span></div>
                    <div>• Match-3 Game: <span className="text-green-400 font-bold">50 pts</span></div>
                    <div>• Level Complete: <span className="text-green-400 font-bold">150 pts</span></div>
                    <div>• Card Win: <span className="text-blue-400 font-bold">150 pts</span></div>
                    <div>• Card Game: <span className="text-blue-400 font-bold">30 pts</span></div>
                    <div>• Daily Claim: <span className="text-yellow-400 font-bold">80 pts</span></div>
                    <div>• Streak Day: <span className="text-yellow-400 font-bold">20 pts</span></div>
                    <div>• Achievement: <span className="text-purple-400 font-bold">10-20 pts</span></div>
                  </div>
                  <div className="mt-3 p-3 bg-orange-500/20 border border-orange-400/50 rounded-lg text-center">
                    <p className="text-sm">
                      <span className="text-orange-400 font-bold">🏆 Bonus:</span> Hold 5M+ JOYB or adrijan tokens: 
                      <span className="text-yellow-300 font-bold"> +500 pts each!</span>
                    </p>
                  </div>
                </div>

                {/* Quick Tips */}
                <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 rounded-xl p-5 border border-green-500/30">
                  <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                    💡 Quick Tips
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-green-400">✓</span>
                      <span>Claim daily rewards to build your streak and maximize bonuses</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400">✓</span>
                      <span>Focus on milestone levels (15, 20, 30) for big JOYB payouts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400">✓</span>
                      <span>Check your profile to track stats and achievements</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400">✓</span>
                      <span>Hold 5M+ tokens to get bonus leaderboard points</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* CTA Button */}
              <div className="mt-8 flex justify-center">
                <button
                  onClick={onClose}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-8 rounded-xl transition-all transform hover:scale-105 shadow-lg"
                >
                  Let's Play! 🎮
                </button>
              </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
