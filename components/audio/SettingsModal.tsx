'use client'

import { useState } from 'react'
import { useAudio } from './AudioContext'
import { useTheme } from '../theme/ThemeContext'
import { useAccessibility } from '../accessibility/AccessibilityContext'
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
  const { settings: accessibilitySettings, updateSetting: updateAccessibilitySetting } = useAccessibility()

  const [tempMusicVolume, setTempMusicVolume] = useState(musicVolume)
  const [tempSoundVolume, setTempSoundVolume] = useState(soundVolume)
  const [activeTab, setActiveTab] = useState<'audio' | 'appearance' | 'accessibility'>('audio')

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
                  onClick={() => setActiveTab('appearance')}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'appearance'
                      ? 'bg-purple-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  🎨 Appearance
                </button>
                <button
                  onClick={() => setActiveTab('accessibility')}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'accessibility'
                      ? 'bg-purple-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  ♿ Accessibility
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

              {activeTab === 'appearance' && (
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

              {activeTab === 'accessibility' && (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {/* High Contrast */}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">High Contrast</span>
                      <button
                        onClick={() => updateAccessibilitySetting('highContrast', !accessibilitySettings.highContrast)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          accessibilitySettings.highContrast ? 'bg-purple-500' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          accessibilitySettings.highContrast ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>

                  {/* Font Size */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Font Size</span>
                      <span className="text-xs text-gray-400 capitalize">{accessibilitySettings.fontSize}</span>
                    </div>
                    <div className="flex gap-2">
                      {(['small', 'medium', 'large', 'extra-large'] as const).map((size) => (
                        <button
                          key={size}
                          onClick={() => updateAccessibilitySetting('fontSize', size)}
                          className={`px-3 py-1 text-xs rounded transition-colors ${
                            accessibilitySettings.fontSize === size
                              ? 'bg-purple-500 text-white'
                              : 'bg-gray-600/30 text-gray-400 hover:bg-gray-600/50'
                          }`}
                        >
                          {size === 'extra-large' ? 'XL' : size.charAt(0).toUpperCase() + size.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reduced Motion */}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Reduced Motion</span>
                      <button
                        onClick={() => updateAccessibilitySetting('reducedMotion', !accessibilitySettings.reducedMotion)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          accessibilitySettings.reducedMotion ? 'bg-blue-500' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          accessibilitySettings.reducedMotion ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>

                  {/* Color Blindness Support */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Color Blindness</span>
                      <span className="text-xs text-gray-400 capitalize">
                        {accessibilitySettings.colorBlindness === 'none' ? 'None' : accessibilitySettings.colorBlindness}
                      </span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {(['none', 'protanopia', 'deuteranopia', 'tritanopia'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => updateAccessibilitySetting('colorBlindness', type)}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            accessibilitySettings.colorBlindness === type
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-600/30 text-gray-400 hover:bg-gray-600/50'
                          }`}
                        >
                          {type === 'none' ? 'None' : type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Screen Reader Support */}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Screen Reader</span>
                      <button
                        onClick={() => updateAccessibilitySetting('screenReader', !accessibilitySettings.screenReader)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          accessibilitySettings.screenReader ? 'bg-orange-500' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          accessibilitySettings.screenReader ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>

                  {/* Keyboard Navigation */}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Keyboard Navigation</span>
                      <button
                        onClick={() => updateAccessibilitySetting('keyboardNavigation', !accessibilitySettings.keyboardNavigation)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          accessibilitySettings.keyboardNavigation ? 'bg-cyan-500' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          accessibilitySettings.keyboardNavigation ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>

                  {/* Focus Indicators */}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Focus Indicators</span>
                      <button
                        onClick={() => updateAccessibilitySetting('focusIndicators', !accessibilitySettings.focusIndicators)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          accessibilitySettings.focusIndicators ? 'bg-pink-500' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          accessibilitySettings.focusIndicators ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>

                  {/* Text to Speech */}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Text to Speech</span>
                      <button
                        onClick={() => updateAccessibilitySetting('textToSpeech', !accessibilitySettings.textToSpeech)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          accessibilitySettings.textToSpeech ? 'bg-indigo-500' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          accessibilitySettings.textToSpeech ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>

                  {/* Speech Rate */}
                  {accessibilitySettings.textToSpeech && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Speech Rate</span>
                        <span className="text-xs text-gray-400">{accessibilitySettings.speechRate.toFixed(1)}x</span>
                      </div>
                      <div className="relative">
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.1"
                          value={accessibilitySettings.speechRate}
                          onChange={(e) => updateAccessibilitySetting('speechRate', parseFloat(e.target.value))}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                        />
                      </div>
                    </div>
                  )}

                  {/* Auto Play */}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Auto Play Media</span>
                      <button
                        onClick={() => updateAccessibilitySetting('autoPlay', !accessibilitySettings.autoPlay)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          accessibilitySettings.autoPlay ? 'bg-teal-500' : 'bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          accessibilitySettings.autoPlay ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex justify-end mt-6 pt-4 border-t border-gray-700">
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