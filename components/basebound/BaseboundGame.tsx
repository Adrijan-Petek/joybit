'use client'

import { useEffect, useRef, useState } from 'react'
import * as Phaser from 'phaser'
import { BaseboundScene } from '@/lib/game/BaseboundScene'
import { GameState } from '@/lib/game/types'

interface BaseboundGameProps {
  onGameOver: (state: GameState, snapshotUrl?: string | null) => void
}

export function BaseboundGame({ onGameOver }: BaseboundGameProps) {
  const gameRef = useRef<Phaser.Game | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!containerRef.current) return

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: containerRef.current,
      backgroundColor: '#87CEEB',
      render: {
        preserveDrawingBuffer: true,
      },
      scene: [BaseboundScene],
      physics: {
        default: 'matter',
        matter: {
          gravity: { x: 0, y: 1 },
          debug: false
        }
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    }

    gameRef.current = new Phaser.Game(config)
    
    // Wait for scene to be ready (Phaser doesn't emit "ready" in some cases, so poll)
    const captureSnapshot = () => {
      const canvas = gameRef.current?.canvas
      if (!canvas) return null
      const targetWidth = 512
      const scale = targetWidth / canvas.width
      const targetHeight = Math.max(1, Math.round(canvas.height * scale))
      const snapshotCanvas = document.createElement('canvas')
      snapshotCanvas.width = targetWidth
      snapshotCanvas.height = targetHeight
      const ctx = snapshotCanvas.getContext('2d')
      if (!ctx) return null
      ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight)
      return snapshotCanvas.toDataURL('image/png')
    }

    const readyCheck = window.setInterval(() => {
      const scene = gameRef.current?.scene.getScene('BaseboundScene') as BaseboundScene | undefined
      if (scene && scene.scene.isActive()) {
        scene.setGameOverCallback((state: GameState) => {
          const snapshotUrl = captureSnapshot()
          onGameOver(state, snapshotUrl)
        })
        setIsLoading(false)
        window.clearInterval(readyCheck)
      }
    }, 100)

    // Handle window resize
    const handleResize = () => {
      if (gameRef.current) {
        gameRef.current.scale.resize(window.innerWidth, window.innerHeight)
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.clearInterval(readyCheck)
      window.removeEventListener('resize', handleResize)
      if (gameRef.current) {
        gameRef.current.destroy(true)
        gameRef.current = null
      }
    }
  }, [onGameOver])

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center">
            <div className="text-2xl mb-4">🏎️</div>
            <div>Loading Basebound...</div>
          </div>
        </div>
      )}
      <div ref={containerRef} className="absolute inset-0" />
    </div>
  )
}
