'use client'

import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react'

interface AudioContextType {
  playMusic: (track: string) => void
  stopMusic: () => void
  playSound: (sound: string) => void
  toggleMute: () => void
  toggleMusicMute: () => void
  toggleSoundMute: () => void
  isMuted: boolean
  isMusicMuted: boolean
  isSoundMuted: boolean
  currentTrack: string | null
  setVolume: (volume: number) => void
  setMusicVolume: (volume: number) => void
  setSoundVolume: (volume: number) => void
  volume: number
  musicVolume: number
  soundVolume: number
}

const AudioContext = createContext<AudioContextType | undefined>(undefined)

export const useAudio = () => {
  const context = useContext(AudioContext)
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider')
  }
  return context
}

interface AudioProviderProps {
  children: ReactNode
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  const [isMuted, setIsMuted] = useState(false)
  const [isMusicMuted, setIsMusicMuted] = useState(false)
  const [isSoundMuted, setIsSoundMuted] = useState(false)
  const [currentTrack, setCurrentTrack] = useState<string | null>(null)
  const [volume, setVolumeState] = useState(0.5)
  const [musicVolume, setMusicVolumeState] = useState(0.5)
  const [soundVolume, setSoundVolumeState] = useState(0.7)
  
  const musicRef = useRef<HTMLAudioElement | null>(null)
  const soundRefs = useRef<Map<string, HTMLAudioElement>>(new Map())

  useEffect(() => {
    // Preload common sounds
    const sounds = [
      'pop',
      'match',
      'swap',
      'win',
      'lose',
      'game-over',
      'card-flip',
      'card-click',
      'reward',
      'click'
    ]

    const currentSoundRefs = soundRefs.current

    sounds.forEach(sound => {
      const audio = new Audio(`/audio/sfx/${sound}.mp3`)
      audio.volume = volume
      currentSoundRefs.set(sound, audio)
    })

    return () => {
      currentSoundRefs.forEach(audio => {
        audio.pause()
        audio.src = ''
      })
      currentSoundRefs.clear()
    }
  }, [volume])

  useEffect(() => {
    if (musicRef.current) {
      musicRef.current.volume = (isMuted || isMusicMuted) ? 0 : musicVolume
    }
    soundRefs.current.forEach(audio => {
      audio.volume = (isMuted || isSoundMuted) ? 0 : soundVolume
    })
  }, [isMuted, isMusicMuted, isSoundMuted, musicVolume, soundVolume])

  const playMusic = (track: string) => {
    if (currentTrack === track && musicRef.current && !musicRef.current.paused) {
      return
    }

    if (musicRef.current) {
      musicRef.current.pause()
    }

    musicRef.current = new Audio(`/audio/music/${track}.mp3`)
    musicRef.current.loop = true
    musicRef.current.volume = (isMuted || isMusicMuted) ? 0 : musicVolume
    
    // Try to play with user interaction workaround
    const playPromise = musicRef.current.play()
    
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        // Auto-play was prevented, try to enable on first user interaction
        const startPlayback = () => {
          musicRef.current?.play().catch(e => console.warn('Music playback failed:', e))
          document.removeEventListener('click', startPlayback)
          document.removeEventListener('touchstart', startPlayback)
          document.removeEventListener('keydown', startPlayback)
        }
        
        document.addEventListener('click', startPlayback, { once: true })
        document.addEventListener('touchstart', startPlayback, { once: true })
        document.addEventListener('keydown', startPlayback, { once: true })
      })
    }

    setCurrentTrack(track)
  }

  const stopMusic = () => {
    if (musicRef.current) {
      musicRef.current.pause()
      musicRef.current.currentTime = 0
      setCurrentTrack(null)
    }
  }

  const playSound = (sound: string) => {
    const audio = soundRefs.current.get(sound)
    if (audio && !isMuted && !isSoundMuted) {
      audio.currentTime = 0
      audio.play().catch(err => {
        console.warn('Sound playback failed:', err)
      })
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const toggleMusicMute = () => {
    setIsMusicMuted(!isMusicMuted)
  }

  const toggleSoundMute = () => {
    setIsSoundMuted(!isSoundMuted)
  }

  const setVolume = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume))
    setVolumeState(clampedVolume)
  }

  const setMusicVolume = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume))
    setMusicVolumeState(clampedVolume)
  }

  const setSoundVolume = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume))
    setSoundVolumeState(clampedVolume)
  }

  return (
    <AudioContext.Provider
      value={{
        playMusic,
        stopMusic,
        playSound,
        toggleMute,
        toggleMusicMute,
        toggleSoundMute,
        isMuted,
        isMusicMuted,
        isSoundMuted,
        currentTrack,
        setVolume,
        setMusicVolume,
        setSoundVolume,
        volume,
        musicVolume,
        soundVolume,
      }}
    >
      {children}
    </AudioContext.Provider>
  )
}
