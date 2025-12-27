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
  borderRadius: 'none' | 'small' | 'medium' | 'large'
  animation: 'none' | 'minimal' | 'full'
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
    borderRadius: 'medium',
    animation: 'full'
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
    borderRadius: 'medium',
    animation: 'full'
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
    borderRadius: 'small',
    animation: 'full'
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
    borderRadius: 'none',
    animation: 'minimal'
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
    borderRadius: 'large',
    animation: 'full'
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
    borderRadius: 'medium',
    animation: 'full'
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

    // Font size classes
    root.classList.remove('text-sm', 'text-base', 'text-lg')
    if (theme.fontSize === 'small') root.classList.add('text-sm')
    else if (theme.fontSize === 'large') root.classList.add('text-lg')
    else root.classList.add('text-base')

    // Border radius classes
    root.classList.remove('rounded-none', 'rounded-sm', 'rounded-md', 'rounded-lg')
    if (theme.borderRadius === 'none') root.classList.add('rounded-none')
    else if (theme.borderRadius === 'small') root.classList.add('rounded-sm')
    else if (theme.borderRadius === 'large') root.classList.add('rounded-lg')
    else root.classList.add('rounded-md')

    // Animation classes
    root.classList.remove('motion-reduce', 'motion-safe')
    if (theme.animation === 'none') root.classList.add('motion-reduce')
    else root.classList.add('motion-safe')

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