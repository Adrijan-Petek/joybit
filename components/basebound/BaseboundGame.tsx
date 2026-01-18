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
  const [forceRotate, setForceRotate] = useState(false)
  const forceRotateRef = useRef(false)

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
    gameRef.current.registry.set('baseboundForceRotate', forceRotateRef.current)
    let sizeWatcher: number | undefined

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

    const getViewportSize = () => {
      const vv = window.visualViewport
      if (vv) {
        return { width: Math.round(vv.width), height: Math.round(vv.height) }
      }
      return { width: window.innerWidth, height: window.innerHeight }
    }

    const resizeGame = () => {
      if (!gameRef.current) return
      const { width, height } = getViewportSize()
      const targetWidth = forceRotateRef.current ? height : width
      const targetHeight = forceRotateRef.current ? width : height
      gameRef.current.scale.resize(targetWidth, targetHeight)
      const canvas = gameRef.current.canvas
      if (canvas) {
        canvas.style.width = `${targetWidth}px`
        canvas.style.height = `${targetHeight}px`
      }
    }

    const updateRotation = () => {
      const screenOrientation = window.screen?.orientation
      const angle = typeof screenOrientation?.angle === 'number'
        ? screenOrientation.angle
        : (typeof window.orientation === 'number' ? window.orientation : 0)
      const isLandscapeAngle = angle === 90 || angle === -90 || angle === 270
      if (forceRotateRef.current !== isLandscapeAngle) {
        forceRotateRef.current = isLandscapeAngle
        setForceRotate(isLandscapeAngle)
        gameRef.current?.registry.set('baseboundForceRotate', isLandscapeAngle)
        gameRef.current?.events.emit('basebound-force-rotate')
        resizeGame()
      }
    }

    let lastSensorUpdate = 0
    const updateRotationFromSensor = (event: DeviceOrientationEvent) => {
      if (typeof event.beta !== 'number' || typeof event.gamma !== 'number') return
      const now = Date.now()
      if (now - lastSensorUpdate < 250) return
      lastSensorUpdate = now
      const beta = Math.abs(event.beta)
      const gamma = Math.abs(event.gamma)
      const isLandscape = gamma > beta
      if (forceRotateRef.current !== isLandscape) {
        forceRotateRef.current = isLandscape
        setForceRotate(isLandscape)
        gameRef.current?.registry.set('baseboundForceRotate', isLandscape)
        gameRef.current?.events.emit('basebound-force-rotate')
        resizeGame()
      }
    }

    const handleResize = () => {
      resizeGame()
    }

    const handleOrientationChange = () => {
      window.setTimeout(resizeGame, 150)
      window.setTimeout(resizeGame, 350)
      updateRotation()
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleOrientationChange)
    window.visualViewport?.addEventListener('resize', handleResize)
    window.visualViewport?.addEventListener('scroll', handleResize)
    window.screen?.orientation?.addEventListener('change', handleOrientationChange)
    window.addEventListener('deviceorientation', updateRotationFromSensor)
    updateRotation()

    const startSizeWatcher = () => {
      let last = getViewportSize()
      sizeWatcher = window.setInterval(() => {
        const next = getViewportSize()
        if (next.width !== last.width || next.height !== last.height) {
          last = next
          resizeGame()
        }
      }, 250)
    }
    startSizeWatcher()

    return () => {
      window.clearInterval(readyCheck)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleOrientationChange)
      window.visualViewport?.removeEventListener('resize', handleResize)
      window.visualViewport?.removeEventListener('scroll', handleResize)
      window.screen?.orientation?.removeEventListener('change', handleOrientationChange)
      window.removeEventListener('deviceorientation', updateRotationFromSensor)
      if (sizeWatcher) window.clearInterval(sizeWatcher)
      if (gameRef.current) {
        gameRef.current.destroy(true)
        gameRef.current = null
      }
    }
  }, [onGameOver])

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center">
            <div className="text-2xl mb-4">🏎️</div>
            <div>Loading Basebound...</div>
          </div>
        </div>
      )}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: forceRotate ? '100vh' : '100vw',
          height: forceRotate ? '100vw' : '100vh',
          transform: forceRotate ? 'translate(-50%, -50%) rotate(90deg)' : 'translate(-50%, -50%)',
          transformOrigin: 'center center'
        }}
      >
        <div ref={containerRef} className="absolute inset-0" />
      </div>
    </div>
  )
}
