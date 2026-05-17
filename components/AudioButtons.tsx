'use client'

import { useAudio } from './audio/AudioContext'

export function AudioButtons({ splitButtons = false }: { splitButtons?: boolean }) {
  const { toggleMusicMute, toggleSoundMute, isMusicMuted, isSoundMuted } = useAudio()

  const musicButton = (
    <button
      onClick={toggleMusicMute}
      aria-label={isMusicMuted ? 'Unmute Music' : 'Mute Music'}
      aria-pressed={!isMusicMuted}
      className="flex h-9 w-9 items-center justify-center backdrop-blur-sm rounded-lg border text-white shadow-lg transition-all duration-200 hover:border-gray-600"
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
  )

  const soundButton = (
    <button
      onClick={toggleSoundMute}
      aria-label={isSoundMuted ? 'Unmute Sounds' : 'Mute Sounds'}
      aria-pressed={!isSoundMuted}
      className="flex h-9 w-9 items-center justify-center backdrop-blur-sm rounded-lg border text-white shadow-lg transition-all duration-200 hover:border-gray-600"
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
  )

  if (splitButtons) {
    return (
      <>
        {musicButton}
        {soundButton}
      </>
    )
  }

  return (
    <div className="flex gap-2">
      {musicButton}
      {soundButton}
    </div>
  )
}

