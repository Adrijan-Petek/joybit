'use client'

import { useState } from 'react'
import { AudioSettingsModal } from './audio/AudioSettingsModal'

export function AudioSettingsButton() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsSettingsOpen(true)}
        className="backdrop-blur-sm text-white p-2 md:p-3 rounded-lg transition-all duration-200 shadow-lg border hover:border-gray-600"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)'
        }}
        title="Audio Settings"
      >
        <span className="text-lg md:text-xl">⚙️</span>
      </button>

      <AudioSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  )
}