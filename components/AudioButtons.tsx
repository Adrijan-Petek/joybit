'use client'

import { useAudio } from './audio/AudioContext'

export function AudioButtons() {
  const { toggleMusicMute, toggleSoundMute, isMusicMuted, isSoundMuted } = useAudio()

  return (
    <div className="flex gap-2">
      {/* Music Toggle Button */}
      <button
        onClick={toggleMusicMute}
        className="bg-gray-800/90 hover:bg-gray-700/90 backdrop-blur-sm text-white p-1.5 md:p-2 rounded-lg transition-all duration-200 shadow-lg border border-gray-700 hover:border-gray-600"
        title={isMusicMuted ? 'Unmute Music' : 'Mute Music'}
      >
        <span className="text-sm md:text-base">
          {isMusicMuted ? '🔇' : '🎵'}
        </span>
      </button>

      {/* Sound Effects Toggle Button */}
      <button
        onClick={toggleSoundMute}
        className="bg-gray-800/90 hover:bg-gray-700/90 backdrop-blur-sm text-white p-1.5 md:p-2 rounded-lg transition-all duration-200 shadow-lg border border-gray-700 hover:border-gray-600"
        title={isSoundMuted ? 'Unmute Sounds' : 'Mute Sounds'}
      >
        <span className="text-sm md:text-base">
          {isSoundMuted ? '🔈' : '🔊'}
        </span>
      </button>
    </div>
  )
}
