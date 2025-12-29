'use client'

import { useState } from 'react'
import { SettingsModal } from './audio/SettingsModal'

export function SettingsButton() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsSettingsOpen(true)}
        className="backdrop-blur-sm text-white p-1.5 md:p-2 rounded-lg transition-all duration-200 shadow-lg border hover:border-gray-600"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)'
        }}
        title="Settings"
      >
        <span className="text-sm md:text-base">⚙️</span>
      </button>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  )
}