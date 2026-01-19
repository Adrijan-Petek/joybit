'use client'

import { useEffect, useRef, useState } from 'react'
import * as Phaser from 'phaser'
import { BaseboundScene } from '@/lib/game/BaseboundScene'
import { GameState } from '@/lib/game/types'

interface BaseboundGameProps {
  onGameOver: (state: GameState, snapshotUrl?: string | null) => void
  forceRotate?: boolean
  containerSize?: { width: number; height: number }
}

export function BaseboundGame({ onGameOver, forceRotate: forceRotateOverride, containerSize }: BaseboundGameProps) {
  const BASE_WIDTH = 1280
  const BASE_HEIGHT = 720
  const gameRef = useRef<Phaser.Game | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [overlayPedals, setOverlayPedals] = useState({ brake: false, gas: false })
  const initialRotate = typeof forceRotateOverride === 'boolean' ? forceRotateOverride : false
  const [forceRotate, setForceRotate] = useState(initialRotate)
  const forceRotateRef = useRef(initialRotate)

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.style.width = '100%'
    containerRef.current.style.height = '100%'
    containerRef.current.style.position = 'relative'

    const isTouchDevice = (navigator.maxTouchPoints || 0) > 0

    const config: Phaser.Types.Core.GameConfig = {
      // WebViews (incl. Farcaster) can lose WebGL textures when navigating away (e.g., to Garage).
      // Prefer Canvas on touch devices for stability.
      type: isTouchDevice ? Phaser.CANVAS : Phaser.AUTO,
      width: BASE_WIDTH,
      height: BASE_HEIGHT,
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
        mode: Phaser.Scale.NONE
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
      const fallback = getViewportSize()
      const bounds = containerRef.current?.getBoundingClientRect()
      const forcedSize = typeof forceRotateOverride === 'boolean' ? containerSize : undefined
      const availableWidth = Math.round(forcedSize?.width ?? bounds?.width ?? fallback.width)
      const availableHeight = Math.round(forcedSize?.height ?? bounds?.height ?? fallback.height)
      const isTouch = (navigator.maxTouchPoints || 0) > 0
      const scale = (() => {
        if (!isTouch) return 1
        const scaleToFillWidth = availableWidth / BASE_WIDTH
        const scaledHeight = BASE_HEIGHT * scaleToFillWidth
        if (scaledHeight <= availableHeight) return scaleToFillWidth
        return availableHeight / BASE_HEIGHT
      })()
      const displayWidth = Math.max(1, Math.floor(isTouch ? BASE_WIDTH * scale : availableWidth))
      const displayHeight = Math.max(1, Math.floor(isTouch ? BASE_HEIGHT * scale : availableHeight))
      gameRef.current.scale.resize(BASE_WIDTH, BASE_HEIGHT)
      const canvas = gameRef.current.canvas
      if (canvas) {
        canvas.style.position = 'absolute'
        canvas.style.left = isTouch ? `${Math.floor((availableWidth - displayWidth) / 2)}px` : '0'
        canvas.style.top = isTouch ? `${Math.floor((availableHeight - displayHeight) / 2)}px` : '0'
        canvas.style.display = 'block'
        canvas.style.width = `${displayWidth}px`
        canvas.style.height = `${displayHeight}px`
      }
    }

    const updateRotation = () => {
      if (typeof forceRotateOverride === 'boolean') return
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
      if (typeof forceRotateOverride === 'boolean') return
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
    window.requestAnimationFrame(resizeGame)

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

  useEffect(() => {
    if (typeof forceRotateOverride !== 'boolean') return
    if (forceRotateRef.current === forceRotateOverride) return
    forceRotateRef.current = forceRotateOverride
    setForceRotate(forceRotateOverride)
    gameRef.current?.registry.set('baseboundForceRotate', forceRotateOverride)
    gameRef.current?.events.emit('basebound-force-rotate')
    window.requestAnimationFrame(() => {
      if (!containerRef.current) return
      containerRef.current.style.width = '100%'
      containerRef.current.style.height = '100%'
      containerRef.current.style.position = 'relative'
    })
  }, [forceRotateOverride])

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
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
          width: typeof forceRotateOverride === 'boolean' ? '100%' : (forceRotate ? '100vh' : '100vw'),
          height: typeof forceRotateOverride === 'boolean' ? '100%' : (forceRotate ? '100vw' : '100vh'),
          transform: typeof forceRotateOverride === 'boolean'
            ? 'translate(-50%, -50%)'
            : (forceRotate ? 'translate(-50%, -50%) rotate(90deg)' : 'translate(-50%, -50%)'),
          transformOrigin: 'center center'
        }}
      >
        <div ref={containerRef} className="absolute inset-0" />
      </div>
      {forceRotate && (
        <div className="absolute inset-0 z-40 flex items-end justify-between px-6 pb-2">
          <button
            className="h-24 w-24 select-none touch-none"
            onPointerDown={() => {
              setOverlayPedals(prev => ({ ...prev, brake: true }))
              gameRef.current?.events.emit('basebound-pedal', { type: 'brake', pressed: true })
            }}
            onPointerUp={() => {
              setOverlayPedals(prev => ({ ...prev, brake: false }))
              gameRef.current?.events.emit('basebound-pedal', { type: 'brake', pressed: false })
            }}
            onPointerLeave={() => {
              setOverlayPedals(prev => ({ ...prev, brake: false }))
              gameRef.current?.events.emit('basebound-pedal', { type: 'brake', pressed: false })
            }}
            onPointerCancel={() => {
              setOverlayPedals(prev => ({ ...prev, brake: false }))
              gameRef.current?.events.emit('basebound-pedal', { type: 'brake', pressed: false })
            }}
            aria-label="Brake"
          />
          <button
            className="h-24 w-24 select-none touch-none"
            onPointerDown={() => {
              setOverlayPedals(prev => ({ ...prev, gas: true }))
              gameRef.current?.events.emit('basebound-pedal', { type: 'gas', pressed: true })
            }}
            onPointerUp={() => {
              setOverlayPedals(prev => ({ ...prev, gas: false }))
              gameRef.current?.events.emit('basebound-pedal', { type: 'gas', pressed: false })
            }}
            onPointerLeave={() => {
              setOverlayPedals(prev => ({ ...prev, gas: false }))
              gameRef.current?.events.emit('basebound-pedal', { type: 'gas', pressed: false })
            }}
            onPointerCancel={() => {
              setOverlayPedals(prev => ({ ...prev, gas: false }))
              gameRef.current?.events.emit('basebound-pedal', { type: 'gas', pressed: false })
            }}
            aria-label="Gas"
          />
          <img
            src={overlayPedals.brake ? '/basebound-game/icons/pedal-brake-pressed.png' : '/basebound-game/icons/pedal-brake-normal.png'}
            alt=""
            className="pointer-events-none absolute bottom-2 left-6 h-24 w-24 opacity-95"
          />
          <img
            src={overlayPedals.gas ? '/basebound-game/icons/pedal-gas-pressed.png' : '/basebound-game/icons/pedal-gas-normal.png'}
            alt=""
            className="pointer-events-none absolute bottom-2 right-6 h-24 w-24 opacity-95"
          />
        </div>
      )}
    </div>
  )
}
