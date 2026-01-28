'use client'

import { useAudio } from './audio/AudioContext'

export function AudioButtons() {
  const { toggleMusicMute, toggleSoundMute, isMusicMuted, isSoundMuted } = useAudio()

  return (
    <div className="flex gap-2">
      {/* Music Toggle Button */}
      <button
        onClick={toggleMusicMute}
        aria-label={isMusicMuted ? 'Unmute Music' : 'Mute Music'}
        aria-pressed={!isMusicMuted}
        className="backdrop-blur-sm text-white p-1.5 md:p-2 rounded-lg transition-all duration-200 shadow-lg border hover:border-gray-600"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)'
        }}
        title={isMusicMuted ? 'Unmute Music' : 'Mute Music'}
      >
        <span className="text-sm md:text-base">
          {isMusicMuted ? '🔇' : '🎵'}
        </span>
      </button>

      {/* Sound Effects Toggle Button */}
      <button
        onClick={toggleSoundMute}
        aria-label={isSoundMuted ? 'Unmute Sounds' : 'Mute Sounds'}
        aria-pressed={!isSoundMuted}
        className="backdrop-blur-sm text-white p-1.5 md:p-2 rounded-lg transition-all duration-200 shadow-lg border hover:border-gray-600"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)'
        }}
        title={isSoundMuted ? 'Unmute Sounds' : 'Mute Sounds'}
      >
        <span className="text-sm md:text-base">
          {isSoundMuted ? '🔈' : '🔊'}
        </span>
      </button>
    </div>
  )
}

