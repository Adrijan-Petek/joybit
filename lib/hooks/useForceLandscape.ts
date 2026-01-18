import { useEffect, useState } from 'react'

type ForceLandscapeState = {
  isLandscape: boolean
  isMobile: boolean
}

export function useForceLandscape(): ForceLandscapeState {
  const [state, setState] = useState<ForceLandscapeState>({
    isLandscape: false,
    isMobile: false
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const isMobile = () => Math.min(window.innerWidth, window.innerHeight) <= 900

    const updateFromScreen = () => {
      const mobile = isMobile()
      if (!mobile) {
        setState({ isLandscape: false, isMobile: false })
        return
      }
      const screenOrientation = window.screen?.orientation
      const angle = typeof screenOrientation?.angle === 'number'
        ? screenOrientation.angle
        : (typeof window.orientation === 'number' ? window.orientation : 0)
      const next = angle === 90 || angle === -90 || angle === 270
      setState({ isLandscape: next, isMobile: true })
    }

    let lastSensorUpdate = 0
    const updateFromSensor = (event: DeviceOrientationEvent) => {
      if (!isMobile()) return
      if (typeof event.beta !== 'number' || typeof event.gamma !== 'number') return
      const now = Date.now()
      if (now - lastSensorUpdate < 250) return
      lastSensorUpdate = now
      const beta = Math.abs(event.beta)
      const gamma = Math.abs(event.gamma)
      setState({ isLandscape: gamma > beta, isMobile: true })
    }

    updateFromScreen()

    window.addEventListener('resize', updateFromScreen)
    window.addEventListener('orientationchange', updateFromScreen)
    window.screen?.orientation?.addEventListener('change', updateFromScreen)
    window.addEventListener('deviceorientation', updateFromSensor)

    return () => {
      window.removeEventListener('resize', updateFromScreen)
      window.removeEventListener('orientationchange', updateFromScreen)
      window.screen?.orientation?.removeEventListener('change', updateFromScreen)
      window.removeEventListener('deviceorientation', updateFromSensor)
    }
  }, [])

  return state
}
