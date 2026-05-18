'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { sdk } from '@farcaster/miniapp-sdk'
import { useAccount } from 'wagmi'
import { AudioButtons } from '@/components/AudioButtons'
import { InfoModal } from '@/components/InfoModal'
import { Logo } from '@/components/Logo'
import { WalletButton } from '@/components/WalletButton'
import { useAudio } from '@/components/audio/AudioContext'

const quickLinks = [
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Profile', href: '/profile' },
]

const quickActions = [
  { label: 'Add Mini App', action: 'add-mini-app' },
  { label: 'Recast App', action: 'recast-app' },
]

export default function Home() {
  const router = useRouter()
  const { address } = useAccount()
  const { playMusic } = useAudio()
  const [mounted, setMounted] = useState(false)
  const [logoClickCount, setLogoClickCount] = useState(0)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [miniAppBusy, setMiniAppBusy] = useState(false)
  const [userFid, setUserFid] = useState<number | null>(null)

  const adminWalletList = (process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESSES || process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
  const adminFid = Number(process.env.NEXT_PUBLIC_ADMIN_FARCASTER_FID || '0')
  const isAuthorizedAdmin =
    (!!address && adminWalletList.includes(address.toLowerCase())) ||
    (!!userFid && adminFid > 0 && userFid === adminFid)

  const handleAddMiniApp = useCallback(async () => {
    if (miniAppBusy) return

    setMiniAppBusy(true)
    try {
      const actions = (sdk as any)?.actions
      if (actions && typeof actions.addMiniApp === 'function') {
        await actions.addMiniApp()
        return
      }

      if (typeof window !== 'undefined') {
        window.open('https://joybit.vercel.app', '_blank', 'noopener,noreferrer')
      }
    } catch (error) {
      console.log('Add Mini App not available in this context:', error)
    } finally {
      setMiniAppBusy(false)
    }
  }, [miniAppBusy])

  const handleRecastApp = useCallback(() => {
    if (typeof window === 'undefined') return

    const shareText =
      '🎮 Playing Joybit Match-3. Fast rounds, leaderboard competition, and wallet-ready rewards.'
    const frameUrl = window.location.origin
    const url = new URL('https://warpcast.com/~/compose')
    url.searchParams.set('text', shareText)
    url.searchParams.append('embeds[]', frameUrl)
    window.open(url.toString(), '_blank', 'noopener,noreferrer')
  }, [])

  useEffect(() => {
    setMounted(true)
    playMusic('main-menu')

    const init = async () => {
      try {
        const ctx = await sdk.context
        setUserFid(ctx?.user?.fid || null)
      } catch {
        setUserFid(null)
      }

      sdk.actions.ready().catch(() => {
        // Browser users are not always inside a Farcaster Mini App.
      })
    }

    init()
  }, [playMusic])

  useEffect(() => {
    if (logoClickCount < 5) return

    if (isAuthorizedAdmin) {
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem('joybit_admin_unlock', '1')
        } catch {
          // Some in-app browsers restrict storage access.
        }
      }
      router.push('/admin')
    }

    setLogoClickCount(0)
  }, [logoClickCount, isAuthorizedAdmin, router])

  if (!mounted) return null

  return (
    <main
      className="min-h-screen overflow-hidden"
      style={{
        backgroundColor: 'var(--theme-background)',
        backgroundImage:
          'radial-gradient(70rem 32rem at 80% -8%, rgba(22,82,240,0.24), transparent 62%), radial-gradient(52rem 28rem at -10% 100%, rgba(245,158,11,0.16), transparent 60%)',
        color: 'var(--theme-text)'
      }}
    >
      <InfoModal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} />

      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/45 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => setLogoClickCount((count) => count + 1)}
            className="logo-button-reset flex items-center gap-2 border-0 bg-transparent p-0 shadow-none"
            aria-label="Joybit home"
          >
            <Logo size="small" />
          </button>

          <div className="flex items-center gap-2">
            <AudioButtons splitButtons />
            <WalletButton />
          </div>
        </div>
      </header>

      <button
        type="button"
        onClick={() => setShowInfoModal(true)}
        className="fixed bottom-36 right-4 z-40 flex h-11 w-11 animate-pulse items-center justify-center rounded-full border border-white/15 bg-blue-500 text-base font-bold text-white shadow-lg md:bottom-20"
        title="How to play"
        aria-label="How to play"
      >
        i
      </button>

      <section className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 pb-28 pt-16 md:pb-10 md:pt-16">
        <div className="max-w-xl md:mx-auto md:text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
            Joybit Mini App
          </p>
          <h1 className="mb-4 text-4xl font-black leading-tight text-white md:text-6xl">
            Match. Climb. Earn.
          </h1>
          <p className="mb-7 text-base leading-7 text-gray-300 md:text-lg">
            A focused Match-3 experience built for fast rounds, competitive rankings, and seamless wallet-ready rewards.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row md:justify-center">
            <button
              type="button"
              onClick={() => router.push('/game')}
              className="theme-button-brand rounded-xl px-7 py-4 text-base font-bold"
            >
              Start Playing
            </button>
            <button
              type="button"
              onClick={() => router.push('/leaderboard')}
              className="theme-button-brand-soft rounded-xl px-7 py-4 text-base font-bold"
            >
              View Leaderboard
            </button>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 md:text-center">
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <div className="text-lg font-bold text-white">1</div>
              <div className="text-xs text-gray-400">One polished game mode</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <div className="text-lg font-bold text-white">Fast</div>
              <div className="text-xs text-gray-400">Quick competitive rounds</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <div className="text-lg font-bold text-white">Wallet</div>
              <div className="text-xs text-gray-400">Seamless connection flow</div>
            </div>
          </div>
        </div>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/80 px-3 py-3 backdrop-blur-md md:hidden">
        <div className="grid grid-cols-2 gap-2">
          {quickLinks.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => router.push(link.href)}
              className="theme-button-brand-soft rounded-lg px-2 py-3 text-xs font-semibold"
            >
              {link.label}
            </button>
          ))}
          {quickActions.map((item) => (
            <button
              key={item.action}
              type="button"
              onClick={() => {
                if (item.action === 'add-mini-app') {
                  handleAddMiniApp()
                } else {
                  handleRecastApp()
                }
              }}
              disabled={item.action === 'add-mini-app' && miniAppBusy}
              className="theme-button-brand rounded-lg px-2 py-3 text-xs font-semibold"
            >
              {item.action === 'add-mini-app' && miniAppBusy ? 'Adding...' : item.label}
            </button>
          ))}
        </div>
      </nav>

      <nav className="fixed bottom-6 left-1/2 z-40 hidden -translate-x-1/2 rounded-xl border border-white/10 bg-black/60 p-2 backdrop-blur-md md:block">
        <div className="flex flex-wrap gap-2">
          {quickLinks.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => router.push(link.href)}
              className="theme-button-brand-soft rounded-lg px-4 py-2 text-sm font-semibold"
            >
              {link.label}
            </button>
          ))}
          {quickActions.map((item) => (
            <button
              key={item.action}
              type="button"
              onClick={() => {
                if (item.action === 'add-mini-app') {
                  handleAddMiniApp()
                } else {
                  handleRecastApp()
                }
              }}
              disabled={item.action === 'add-mini-app' && miniAppBusy}
              className="theme-button-brand rounded-lg px-4 py-2 text-sm font-semibold"
            >
              {item.action === 'add-mini-app' && miniAppBusy ? 'Adding...' : item.label}
            </button>
          ))}
        </div>
      </nav>
    </main>
  )
}
