'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForceLandscape } from '@/lib/hooks/useForceLandscape'
import { GarageContent } from '@/components/basebound/GarageContent'

export default function BaseboundGaragePage() {
  const router = useRouter()
  const { isLandscape, isMobile } = useForceLandscape({ lockOrientation: true })
  const forceLandscape = isMobile && !isLandscape
  const compact = isMobile
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0, offsetLeft: 0, offsetTop: 0 })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const update = () => {
      const vv = window.visualViewport
      const width = Math.round(vv?.width ?? window.innerWidth)
      const height = Math.round(vv?.height ?? window.innerHeight)
      const offsetLeft = Math.round(vv?.offsetLeft ?? 0)
      const offsetTop = Math.round(vv?.offsetTop ?? 0)
      setViewportSize({ width, height, offsetLeft, offsetTop })
    }
    update()
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    return () => {
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('scroll', update)
    }
  }, [])

  const isInAppWebView =
    typeof navigator !== 'undefined' && /CoinbaseWallet|CBWallet|Coinbase|Farcaster|Warpcast/i.test(navigator.userAgent)

  return (
    <div className="fixed inset-0 bg-black text-white">
      <div
        className="absolute overflow-hidden overscroll-contain"
        style={{
          left: `calc(50% + ${viewportSize.offsetLeft}px)`,
          top: `calc(50% + ${viewportSize.offsetTop}px)`,
          width: viewportSize.width
            ? `${forceLandscape ? viewportSize.height : viewportSize.width}px`
            : (forceLandscape ? '100vh' : '100vw'),
          height: viewportSize.height
            ? `${forceLandscape ? viewportSize.width : viewportSize.height}px`
            : (forceLandscape ? '100vw' : '100vh'),
          transform: forceLandscape ? 'translate(-50%, -50%) rotate(90deg)' : 'translate(-50%, -50%)',
          transformOrigin: 'center center',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <GarageContent
          compact={compact}
          onBack={() => router.push('/')}
          onPlay={() => {
            if (isInAppWebView) {
              window.location.href = '/basebound?skipTx=1'
              return
            }
            router.push('/basebound?skipTx=1')
          }}
        />
      </div>
    </div>
  )
}

