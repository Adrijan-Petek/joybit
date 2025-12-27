'use client'

import { useState } from 'react'
import { useAudio } from './AudioContext'
import { motion, AnimatePresence } from 'framer-motion'

interface AudioSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AudioSettingsModal({ isOpen, onClose }: AudioSettingsModalProps) {
  const {
    isMuted,
    isMusicMuted,
    isSoundMuted,
    toggleMute,
    toggleMusicMute,
    toggleSoundMute,
    musicVolume,
    soundVolume,
    setMusicVolume,
    setSoundVolume
  } = useAudio()

  const [tempMusicVolume, setTempMusicVolume] = useState(musicVolume)
  const [tempSoundVolume, setTempSoundVolume] = useState(soundVolume)

  const handleMusicVolumeChange = (value: number) => {
    setTempMusicVolume(value)
    setMusicVolume(value)
  }

  const handleSoundVolumeChange = (value: number) => {
    setTempSoundVolume(value)
    setSoundVolume(value)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div
              className="w-full max-w-md backdrop-blur-lg rounded-xl p-6 border"
              style={{
                backgroundColor: 'var(--theme-surface)',
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-text)'
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🔊</div>
                  <h2 className="text-xl font-bold">Audio Settings</h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                >
                  ×
                </button>
              </div>

              {/* Master Mute */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Master Mute</span>
                  <button
                    onClick={toggleMute}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isMuted ? 'bg-red-500' : 'bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      isMuted ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Music Volume */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Music Volume</span>
                    <button
                      onClick={toggleMusicMute}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        isMusicMuted ? 'bg-red-500/20 text-red-400' : 'bg-gray-600/30 text-gray-400 hover:bg-gray-600/50'
                      }`}
                    >
                      {isMusicMuted ? 'Muted' : 'Mute'}
                    </button>
                  </div>
                  <span className="text-sm text-gray-400">{Math.round(tempMusicVolume * 100)}%</span>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={tempMusicVolume}
                    onChange={(e) => handleMusicVolumeChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    disabled={isMuted || isMusicMuted}
                  />
                  <style jsx>{`
                    .slider::-webkit-slider-thumb {
                      appearance: none;
                      height: 16px;
                      width: 16px;
                      border-radius: 50%;
                      background: var(--theme-primary);
                      cursor: pointer;
                      border: 2px solid var(--theme-surface);
                    }
                    .slider::-moz-range-thumb {
                      height: 16px;
                      width: 16px;
                      border-radius: 50%;
                      background: var(--theme-primary);
                      cursor: pointer;
                      border: 2px solid var(--theme-surface);
                    }
                  `}</style>
                </div>
              </div>

              {/* Sound Effects Volume */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Sound Effects</span>
                    <button
                      onClick={toggleSoundMute}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        isSoundMuted ? 'bg-red-500/20 text-red-400' : 'bg-gray-600/30 text-gray-400 hover:bg-gray-600/50'
                      }`}
                    >
                      {isSoundMuted ? 'Muted' : 'Mute'}
                    </button>
                  </div>
                  <span className="text-sm text-gray-400">{Math.round(tempSoundVolume * 100)}%</span>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={tempSoundVolume}
                    onChange={(e) => handleSoundVolumeChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    disabled={isMuted || isSoundMuted}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: 'var(--theme-primary)',
                    color: 'white'
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}