'use client'

import { useState } from 'react'
import { useAudio } from './AudioContext'
import { useTheme } from '../theme/ThemeContext'
import { motion, AnimatePresence } from 'framer-motion'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
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

  const { currentTheme, setTheme, availableThemes } = useTheme()

  const [activeTab, setActiveTab] = useState<'audio' | 'theme'>('audio')
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

  const toggleTheme = () => {
    // Toggle between current theme and a light theme if available, or default/dark
    const currentThemeName = Object.keys(availableThemes).find(key => availableThemes[key].name === currentTheme.name)
    if (currentThemeName === 'minimal') {
      setTheme('default') // Switch to dark theme
    } else {
      setTheme('minimal') // Switch to light theme
    }
  }

  const isLightTheme = currentTheme.name === 'Minimal'

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
                  <div className="text-2xl">⚙️</div>
                  <h2 className="text-xl font-bold">Settings</h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                >
                  ×
                </button>
              </div>

              {/* Tab Navigation */}
              {/* Tab Navigation */}
              <div className="flex mb-6 bg-gray-800/50 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('audio')}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'audio'
                      ? 'bg-purple-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  🔊 Audio
                </button>
                <button
                  onClick={() => setActiveTab('theme')}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'theme'
                      ? 'bg-purple-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  🎨 Theme
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'audio' && (
                <div className="space-y-6">
                  {/* Master Mute */}
                  <div>
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
                  <div>
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
                  <div>
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
                </div>
              )}

              {activeTab === 'theme' && (
                <div className="space-y-6">
                  {/* Theme Toggle */}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Theme</span>
                      <button
                        onClick={toggleTheme}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          isLightTheme ? 'bg-yellow-500' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          isLightTheme ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                        <span className={`absolute inset-0 flex items-center justify-center text-xs transition-opacity ${
                          isLightTheme ? 'opacity-0' : 'opacity-100'
                        }`}>
                          🌙
                        </span>
                        <span className={`absolute inset-0 flex items-center justify-center text-xs transition-opacity ${
                          isLightTheme ? 'opacity-100' : 'opacity-0'
                        }`}>
                          ☀️
                        </span>
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {isLightTheme ? 'Light theme active' : 'Dark theme active'}
                    </p>
                  </div>

                  {/* Theme Selector */}
                  <div>
                    <span className="text-sm font-medium mb-3 block">Available Themes</span>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {Object.entries(availableThemes).map(([key, theme]) => (
                        <button
                          key={key}
                          onClick={() => setTheme(key)}
                          className={`p-3 rounded-lg border-2 transition-colors text-left ${
                            currentTheme.name === theme.name
                              ? 'border-purple-500 bg-purple-500/20'
                              : 'border-gray-600 hover:border-gray-500'
                          }`}
                        >
                          <div className="text-sm font-medium">{theme.name}</div>
                          <div className="flex items-center gap-1 mt-1">
                            <div
                              className="w-3 h-3 rounded-full border border-white/20"
                              style={{ backgroundColor: theme.primary }}
                            ></div>
                            <div
                              className="w-3 h-3 rounded-full border border-white/20"
                              style={{ backgroundColor: theme.secondary }}
                            ></div>
                            <div
                              className="w-3 h-3 rounded-full border border-white/20"
                              style={{ backgroundColor: theme.accent }}
                            ></div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}