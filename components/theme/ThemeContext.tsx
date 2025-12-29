'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export interface Theme {
  name: string
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  text: string
  textSecondary: string
  border: string
  success: string
  warning: string
  error: string
  fontFamily: string
  fontSize: 'small' | 'medium' | 'large'
  headlineSize: 'small' | 'medium' | 'large' | 'extra-large'
  borderRadius: 'none' | 'small' | 'medium' | 'large'
  animation: 'none' | 'minimal' | 'full'
  spacing: 'compact' | 'normal' | 'relaxed'
  shadow: 'none' | 'subtle' | 'medium' | 'strong'
}

export const themes: Record<string, Theme> = {
  default: {
    name: 'Default',
    primary: '#ee3dff',
    secondary: '#0891b2',
    accent: '#f59e0b',
    background: '#000000',
    surface: '#1a1a1a',
    text: '#ffffff',
    textSecondary: '#9ca3af',
    border: '#374151',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    fontFamily: 'Inter, sans-serif',
    fontSize: 'medium',
    headlineSize: 'large',
    borderRadius: 'medium',
    animation: 'full',
    spacing: 'normal',
    shadow: 'medium'
  },
  dark: {
    name: 'Dark',
    primary: '#6366f1',
    secondary: '#8b5cf6',
    accent: '#f59e0b',
    background: '#0f0f0f',
    surface: '#1f1f1f',
    text: '#ffffff',
    textSecondary: '#a1a1aa',
    border: '#3f3f46',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    fontFamily: 'Inter, sans-serif',
    fontSize: 'medium',
    headlineSize: 'large',
    borderRadius: 'medium',
    animation: 'full',
    spacing: 'normal',
    shadow: 'medium'
  },
  neon: {
    name: 'Neon',
    primary: '#00ff88',
    secondary: '#ff0080',
    accent: '#ffff00',
    background: '#000000',
    surface: '#0a0a0a',
    text: '#ffffff',
    textSecondary: '#00ff88',
    border: '#00ff88',
    success: '#00ff88',
    warning: '#ffff00',
    error: '#ff0080',
    fontFamily: 'Courier New, monospace',
    fontSize: 'medium',
    headlineSize: 'large',
    borderRadius: 'small',
    animation: 'full',
    spacing: 'normal',
    shadow: 'strong'
  },
  retro: {
    name: 'Retro',
    primary: '#ff6b35',
    secondary: '#f7931e',
    accent: '#ffd23f',
    background: '#2d1b69',
    surface: '#3d2c8d',
    text: '#ffffff',
    textSecondary: '#ffd23f',
    border: '#f7931e',
    success: '#06ffa5',
    warning: '#ffd23f',
    error: '#ff6b35',
    fontFamily: 'Press Start 2P, monospace',
    fontSize: 'small',
    headlineSize: 'medium',
    borderRadius: 'none',
    animation: 'minimal',
    spacing: 'compact',
    shadow: 'subtle'
  },
  ocean: {
    name: 'Ocean',
    primary: '#0066cc',
    secondary: '#00aaff',
    accent: '#00ffff',
    background: '#001122',
    surface: '#002244',
    text: '#ffffff',
    textSecondary: '#aaddff',
    border: '#004466',
    success: '#00ff88',
    warning: '#ffa500',
    error: '#ff4444',
    fontFamily: 'Inter, sans-serif',
    fontSize: 'medium',
    headlineSize: 'large',
    borderRadius: 'large',
    animation: 'full',
    spacing: 'normal',
    shadow: 'medium'
  },
  forest: {
    name: 'Forest',
    primary: '#22c55e',
    secondary: '#16a34a',
    accent: '#84cc16',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#ffffff',
    textSecondary: '#94a3b8',
    border: '#334155',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    fontFamily: 'Inter, sans-serif',
    fontSize: 'medium',
    headlineSize: 'large',
    borderRadius: 'medium',
    animation: 'full',
    spacing: 'normal',
    shadow: 'medium'
  },
  professional: {
    name: 'Professional',
    primary: '#1e40af',
    secondary: '#3b82f6',
    accent: '#f59e0b',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f8fafc',
    textSecondary: '#cbd5e1',
    border: '#334155',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    fontFamily: 'Inter, sans-serif',
    fontSize: 'medium',
    headlineSize: 'large',
    borderRadius: 'medium',
    animation: 'minimal',
    spacing: 'normal',
    shadow: 'subtle'
  },
  corporate: {
    name: 'Corporate',
    primary: '#059669',
    secondary: '#10b981',
    accent: '#f59e0b',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f8fafc',
    textSecondary: '#cbd5e1',
    border: '#334155',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    fontFamily: 'Inter, sans-serif',
    fontSize: 'medium',
    headlineSize: 'large',
    borderRadius: 'small',
    animation: 'minimal',
    spacing: 'relaxed',
    shadow: 'subtle'
  },
  minimal: {
    name: 'Minimal',
    primary: '#374151',
    secondary: '#6b7280',
    accent: '#9ca3af',
    background: '#ffffff',
    surface: '#f9fafb',
    text: '#111827',
    textSecondary: '#6b7280',
    border: '#d1d5db',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    fontFamily: 'Inter, sans-serif',
    fontSize: 'medium',
    headlineSize: 'large',
    borderRadius: 'small',
    animation: 'none',
    spacing: 'normal',
    shadow: 'none'
  },
  elegant: {
    name: 'Elegant',
    primary: '#7c3aed',
    secondary: '#a855f7',
    accent: '#f59e0b',
    background: '#0f0a19',
    surface: '#1a103d',
    text: '#f8fafc',
    textSecondary: '#c4b5fd',
    border: '#5b21b6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    fontFamily: 'Inter, sans-serif',
    fontSize: 'medium',
    headlineSize: 'extra-large',
    borderRadius: 'large',
    animation: 'full',
    spacing: 'relaxed',
    shadow: 'strong'
  },
  tech: {
    name: 'Tech',
    primary: '#06b6d4',
    secondary: '#0891b2',
    accent: '#f59e0b',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f8fafc',
    textSecondary: '#7dd3fc',
    border: '#334155',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 'medium',
    headlineSize: 'large',
    borderRadius: 'small',
    animation: 'minimal',
    spacing: 'compact',
    shadow: 'medium'
  },
  sunset: {
    name: 'Sunset',
    primary: '#ea580c',
    secondary: '#dc2626',
    accent: '#f59e0b',
    background: '#1c1917',
    surface: '#292524',
    text: '#fef7ed',
    textSecondary: '#fed7aa',
    border: '#57534e',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    fontFamily: 'Inter, sans-serif',
    fontSize: 'medium',
    headlineSize: 'large',
    borderRadius: 'large',
    animation: 'full',
    spacing: 'normal',
    shadow: 'strong'
  },
  midnight: {
    name: 'Midnight',
    primary: '#1e1b4b',
    secondary: '#312e81',
    accent: '#f59e0b',
    background: '#0f0a19',
    surface: '#1a103d',
    text: '#f8fafc',
    textSecondary: '#c4b5fd',
    border: '#3730a3',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    fontFamily: 'Inter, sans-serif',
    fontSize: 'medium',
    headlineSize: 'large',
    borderRadius: 'medium',
    animation: 'minimal',
    spacing: 'normal',
    shadow: 'subtle'
  },
  aurora: {
    name: 'Aurora',
    primary: '#06b6d4',
    secondary: '#8b5cf6',
    accent: '#f59e0b',
    background: '#0c0a09',
    surface: '#1c1917',
    text: '#f8fafc',
    textSecondary: '#a5f3fc',
    border: '#374151',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    fontFamily: 'Inter, sans-serif',
    fontSize: 'medium',
    headlineSize: 'large',
    borderRadius: 'large',
    animation: 'full',
    spacing: 'relaxed',
    shadow: 'strong'
  },
  cyberpunk: {
    name: 'Cyberpunk',
    primary: '#ff0080',
    secondary: '#00ffff',
    accent: '#ffff00',
    background: '#000000',
    surface: '#0a0a0a',
    text: '#ffffff',
    textSecondary: '#00ffff',
    border: '#ff0080',
    success: '#00ff88',
    warning: '#ffff00',
    error: '#ff4444',
    fontFamily: 'Courier New, monospace',
    fontSize: 'small',
    headlineSize: 'medium',
    borderRadius: 'small',
    animation: 'full',
    spacing: 'compact',
    shadow: 'strong'
  },
  nature: {
    name: 'Nature',
    primary: '#059669',
    secondary: '#10b981',
    accent: '#84cc16',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f8fafc',
    textSecondary: '#86efac',
    border: '#065f46',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    fontFamily: 'Inter, sans-serif',
    fontSize: 'medium',
    headlineSize: 'large',
    borderRadius: 'large',
    animation: 'full',
    spacing: 'relaxed',
    shadow: 'medium'
  },
  highContrast: {
    name: 'High Contrast',
    primary: '#ffffff',
    secondary: '#ffff00',
    accent: '#00ffff',
    background: '#000000',
    surface: '#000000',
    text: '#ffffff',
    textSecondary: '#ffff00',
    border: '#ffffff',
    success: '#00ff00',
    warning: '#ffff00',
    error: '#ff0000',
    fontFamily: 'Inter, sans-serif',
    fontSize: 'large',
    headlineSize: 'extra-large',
    borderRadius: 'small',
    animation: 'none',
    spacing: 'normal',
    shadow: 'strong'
  },
  highContrastLight: {
    name: 'High Contrast Light',
    primary: '#000000',
    secondary: '#000080',
    accent: '#800080',
    background: '#ffffff',
    surface: '#ffffff',
    text: '#000000',
    textSecondary: '#000080',
    border: '#000000',
    success: '#008000',
    warning: '#ff8c00',
    error: '#ff0000',
    fontFamily: 'Inter, sans-serif',
    fontSize: 'large',
    headlineSize: 'extra-large',
    borderRadius: 'small',
    animation: 'none',
    spacing: 'normal',
    shadow: 'strong'
  },
  largeText: {
    name: 'Large Text',
    primary: '#ee3dff',
    secondary: '#0891b2',
    accent: '#f59e0b',
    background: '#000000',
    surface: '#1a1a1a',
    text: '#ffffff',
    textSecondary: '#9ca3af',
    border: '#374151',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    fontFamily: 'Inter, sans-serif',
    fontSize: 'large',
    headlineSize: 'extra-large',
    borderRadius: 'medium',
    animation: 'minimal',
    spacing: 'relaxed',
    shadow: 'medium'
  },
  dyslexia: {
    name: 'Dyslexia Friendly',
    primary: '#0066cc',
    secondary: '#0099ff',
    accent: '#ffcc00',
    background: '#f8f8f8',
    surface: '#ffffff',
    text: '#2c2c2c',
    textSecondary: '#666666',
    border: '#cccccc',
    success: '#009900',
    warning: '#ff9900',
    error: '#cc0000',
    fontFamily: 'OpenDyslexic, sans-serif',
    fontSize: 'large',
    headlineSize: 'large',
    borderRadius: 'medium',
    animation: 'minimal',
    spacing: 'relaxed',
    shadow: 'subtle'
  },
  colorBlind: {
    name: 'Color Blind Friendly',
    primary: '#2e7d32',
    secondary: '#1976d2',
    accent: '#f57c00',
    background: '#121212',
    surface: '#1e1e1e',
    text: '#ffffff',
    textSecondary: '#b0b0b0',
    border: '#404040',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    fontFamily: 'Inter, sans-serif',
    fontSize: 'medium',
    headlineSize: 'large',
    borderRadius: 'medium',
    animation: 'full',
    spacing: 'normal',
    shadow: 'medium'
  }
}

interface ThemeContextType {
  currentTheme: Theme
  setTheme: (themeName: string) => void
  customTheme: Partial<Theme>
  setCustomTheme: (theme: Partial<Theme>) => void
  availableThemes: Record<string, Theme>
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentThemeName, setCurrentThemeName] = useState('default')
  const [customTheme, setCustomTheme] = useState<Partial<Theme>>({})

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('joybit-theme')
    const savedCustomTheme = localStorage.getItem('joybit-custom-theme')

    if (savedTheme && themes[savedTheme]) {
      setCurrentThemeName(savedTheme)
    }

    if (savedCustomTheme) {
      try {
        setCustomTheme(JSON.parse(savedCustomTheme))
      } catch (e) {
        console.error('Failed to parse custom theme:', e)
      }
    }
  }, [])

  // Save theme to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('joybit-theme', currentThemeName)
  }, [currentThemeName])

  useEffect(() => {
    localStorage.setItem('joybit-custom-theme', JSON.stringify(customTheme))
  }, [customTheme])

  // Apply theme to CSS variables
  useEffect(() => {
    const theme = { ...themes[currentThemeName], ...customTheme }
    const root = document.documentElement

    root.style.setProperty('--theme-primary', theme.primary)
    root.style.setProperty('--theme-secondary', theme.secondary)
    root.style.setProperty('--theme-accent', theme.accent)
    root.style.setProperty('--theme-background', theme.background)
    root.style.setProperty('--theme-surface', theme.surface)
    root.style.setProperty('--theme-text', theme.text)
    root.style.setProperty('--theme-text-secondary', theme.textSecondary)
    root.style.setProperty('--theme-border', theme.border)
    root.style.setProperty('--theme-success', theme.success)
    root.style.setProperty('--theme-warning', theme.warning)
    root.style.setProperty('--theme-error', theme.error)
    root.style.setProperty('--theme-font-family', theme.fontFamily)

    // Font size
    const fontSizeMap = { small: '0.875rem', medium: '1rem', large: '1.125rem' }
    root.style.setProperty('--theme-font-size', fontSizeMap[theme.fontSize] || '1rem')

    // Headline size
    const headlineSizeMap = { small: '1.5rem', medium: '2rem', large: '2.5rem', 'extra-large': '3rem' }
    root.style.setProperty('--theme-headline-size', headlineSizeMap[theme.headlineSize] || '2.5rem')

    // Border radius
    const borderRadiusMap = { none: '0', small: '0.25rem', medium: '0.5rem', large: '0.75rem' }
    root.style.setProperty('--theme-border-radius', borderRadiusMap[theme.borderRadius] || '0.5rem')

    // Animation duration
    const animationMap = { none: '0s', minimal: '0.1s', full: '0.3s' }
    root.style.setProperty('--theme-animation-duration', animationMap[theme.animation] || '0.3s')

    // Spacing
    const spacingMap = { compact: '0.75rem', normal: '1rem', relaxed: '1.25rem' }
    root.style.setProperty('--theme-spacing', spacingMap[theme.spacing] || '1rem')

    // Shadow
    const shadowMap = {
      none: 'none',
      subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      strong: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
    }
    root.style.setProperty('--theme-shadow', shadowMap[theme.shadow] || '0 4px 6px -1px rgba(0, 0, 0, 0.1)')

  }, [currentThemeName, customTheme])

  const currentTheme = { ...themes[currentThemeName], ...customTheme }

  const value: ThemeContextType = {
    currentTheme,
    setTheme: setCurrentThemeName,
    customTheme,
    setCustomTheme,
    availableThemes: themes
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}