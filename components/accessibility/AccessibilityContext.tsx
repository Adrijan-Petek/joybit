'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { getStorageItem, setStorageItem } from '@/lib/utils/storage'

export interface AccessibilitySettings {
  highContrast: boolean
  fontSize: 'small' | 'medium' | 'large' | 'extra-large'
  reducedMotion: boolean
  colorBlindness: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'
  screenReader: boolean
  keyboardNavigation: boolean
  focusIndicators: boolean
  textToSpeech: boolean
  speechRate: number
  autoPlay: boolean
}

interface AccessibilityContextType {
  settings: AccessibilitySettings
  updateSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => void
  resetSettings: () => void
}

const defaultSettings: AccessibilitySettings = {
  highContrast: false,
  fontSize: 'medium',
  reducedMotion: false,
  colorBlindness: 'none',
  screenReader: false,
  keyboardNavigation: true,
  focusIndicators: true,
  textToSpeech: false,
  speechRate: 1.0,
  autoPlay: true
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load settings from storage on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await getStorageItem('accessibility-settings')
        if (saved) {
          const parsedSettings = JSON.parse(saved)
          setSettings({ ...defaultSettings, ...parsedSettings })
        }
      } catch (error) {
        console.warn('Failed to load accessibility settings:', error)
      } finally {
        setIsLoaded(true)
      }
    }

    loadSettings()
  }, [])

  // Save settings to storage when they change
  useEffect(() => {
    if (isLoaded) {
      setStorageItem('accessibility-settings', JSON.stringify(settings)).catch(error => {
        console.warn('Failed to save accessibility settings:', error)
      })
    }
  }, [settings, isLoaded])

  // Apply accessibility settings to document
  useEffect(() => {
    const root = document.documentElement

    // High contrast
    if (settings.highContrast) {
      root.setAttribute('data-high-contrast', 'true')
    } else {
      root.removeAttribute('data-high-contrast')
    }

    // Font size
    root.setAttribute('data-font-size', settings.fontSize)

    // Reduced motion
    if (settings.reducedMotion) {
      root.setAttribute('data-reduced-motion', 'true')
    } else {
      root.removeAttribute('data-reduced-motion')
    }

    // Color blindness
    if (settings.colorBlindness !== 'none') {
      root.setAttribute('data-color-blindness', settings.colorBlindness)
    } else {
      root.removeAttribute('data-color-blindness')
    }

    // Screen reader
    if (settings.screenReader) {
      root.setAttribute('data-screen-reader', 'true')
    } else {
      root.removeAttribute('data-screen-reader')
    }

    // Focus indicators
    if (settings.focusIndicators) {
      root.setAttribute('data-focus-indicators', 'true')
    } else {
      root.removeAttribute('data-focus-indicators')
    }

    // Keyboard navigation
    if (settings.keyboardNavigation) {
      root.setAttribute('data-keyboard-nav', 'true')
    } else {
      root.removeAttribute('data-keyboard-nav')
    }

  }, [settings])

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const resetSettings = () => {
    setSettings(defaultSettings)
  }

  return (
    <AccessibilityContext.Provider value={{ settings, updateSetting, resetSettings }}>
      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext)
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider')
  }
  return context
}