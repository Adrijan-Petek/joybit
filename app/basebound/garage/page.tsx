'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { VEHICLE_CATALOG } from '@/lib/game/vehicleCatalog'
import { useForceLandscape } from '@/lib/hooks/useForceLandscape'
import {
  ensureVehicleUpgrades,
  getUpgradeCost,
  getVehicleUpgrades,
  loadBaseboundProfile,
  saveBaseboundProfile
} from '@/lib/game/baseboundProfile'
import type { UpgradeLevels } from '@/lib/game/types'

const MAX_UPGRADE_LEVEL = 20

type UpgradeRow = {
  key: keyof UpgradeLevels
  title: string
  subtitle: string
}

const UPGRADE_ROWS: UpgradeRow[] = [
  { key: 'engine', title: 'Engine', subtitle: 'More speed + torque' },
  { key: 'suspension', title: 'Suspension', subtitle: 'Stability on bumps' },
  { key: 'tires', title: 'Tires', subtitle: 'More grip' },
  { key: 'fuel', title: 'Fuel', subtitle: 'Bigger tank + efficiency' }
]

export default function BaseboundGaragePage() {
  const router = useRouter()
  const [profile, setProfile] = useState(() => loadBaseboundProfile())
  const { isLandscape, isMobile } = useForceLandscape({ lockOrientation: true })
  const forceLandscape = isMobile && !isLandscape
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0, offsetLeft: 0, offsetTop: 0 })

  const selectedVehicle = useMemo(() => {
    return VEHICLE_CATALOG.find(v => v.id === profile.selectedVehicleId) ?? VEHICLE_CATALOG[0]
  }, [profile.selectedVehicleId])

  const [carouselIndex, setCarouselIndex] = useState(() => {
    const idx = VEHICLE_CATALOG.findIndex(v => v.id === profile.selectedVehicleId)
    return idx >= 0 ? idx : 0
  })

  useEffect(() => {
    const idx = VEHICLE_CATALOG.findIndex(v => v.id === profile.selectedVehicleId)
    setCarouselIndex(idx >= 0 ? idx : 0)
  }, [profile.selectedVehicleId])

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

  const currentVehicle = VEHICLE_CATALOG[carouselIndex] ?? VEHICLE_CATALOG[0]
  const isComingSoon = currentVehicle.slug !== 'mini' && currentVehicle.slug !== 'cartoon-car'
  const compact = isMobile

  const handleSelectVehicle = (vehicleId: number) => {
    const next = ensureVehicleUpgrades({ ...profile, selectedVehicleId: vehicleId }, vehicleId)
    saveBaseboundProfile(next)
    setProfile(next)
  }

  const handleUpgrade = (upgradeKey: keyof UpgradeLevels) => {
    const upgrades = getVehicleUpgrades(profile, currentVehicle.id)
    const currentLevel = upgrades[upgradeKey]
    if (currentLevel >= MAX_UPGRADE_LEVEL) return

    const cost = getUpgradeCost(upgradeKey, currentLevel)
    if (profile.coins < cost) return

    const next = {
      ...profile,
      coins: profile.coins - cost,
      upgradesByVehicle: {
        ...(profile.upgradesByVehicle ?? {}),
        [currentVehicle.id]: {
          ...upgrades,
          [upgradeKey]: currentLevel + 1
        }
      }
    }

    saveBaseboundProfile(next)
    setProfile(next)
  }

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
      <div className={compact ? 'h-full w-full p-3' : 'h-full w-full p-4'} style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className={compact ? 'h-full w-full mx-auto max-w-5xl flex flex-col' : 'max-w-3xl mx-auto'}>
        <div className={compact ? 'flex items-center justify-between mb-3' : 'flex items-center justify-between mb-6'}>
          <button
            className={compact ? 'px-3 py-2 rounded bg-gray-800 hover:bg-gray-700 text-sm' : 'px-4 py-2 rounded bg-gray-800 hover:bg-gray-700'}
            onClick={() => router.push('/')}
          >
            Back
          </button>
          <div className="text-center">
            <div className={compact ? 'text-lg font-bold' : 'text-xl font-bold'}>Basebound Garage</div>
            <div className={compact ? 'text-xs text-gray-300' : 'text-sm text-gray-300'}>
              Coins: {profile.coins} • Best: {Math.floor(profile.bestDistance)}m
            </div>
          </div>
          <button
            className={compact ? 'px-3 py-2 rounded bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-sm' : 'px-4 py-2 rounded bg-yellow-600 hover:bg-yellow-500 text-black font-bold'}
            onClick={() => router.push('/basebound?skipTx=1')}
          >
            Play
          </button>
        </div>

        <div className={compact ? 'grid grid-cols-2 gap-3 flex-1 min-h-0' : 'grid gap-6'}>
          <section className={compact ? 'bg-gray-900/60 border border-gray-800 rounded-lg p-3' : 'bg-gray-900/60 border border-gray-800 rounded-lg p-4'}>
            <div className={compact ? 'font-bold mb-2 text-sm' : 'font-bold mb-3'}>Select Car</div>
            <div className={compact ? 'flex items-center gap-2' : 'flex items-center gap-4'}>
              <button
                className={compact ? 'h-9 w-9 rounded-full bg-gray-800 hover:bg-gray-700' : 'h-10 w-10 rounded-full bg-gray-800 hover:bg-gray-700'}
                onClick={() =>
                  setCarouselIndex(prev => (prev - 1 + VEHICLE_CATALOG.length) % VEHICLE_CATALOG.length)
                }
                aria-label="Previous car"
              >
                ‹
              </button>

              <div className={compact ? 'flex-1 border border-gray-800 rounded-lg p-3 bg-black/40' : 'flex-1 border border-gray-800 rounded-lg p-4 bg-black/40'}>
                <div className={compact ? 'flex items-center gap-3' : 'flex items-center gap-4'}>
                  <div className={compact ? 'relative w-24 h-12 bg-gray-800/50 rounded overflow-hidden' : 'relative w-32 h-16 bg-gray-800/50 rounded overflow-hidden'}>
                    <Image
                      src={currentVehicle.parts.body.path}
                      alt={currentVehicle.name}
                      fill
                      sizes={compact ? '96px' : '128px'}
                      style={{ objectFit: 'contain' }}
                      priority={currentVehicle.isStarter}
                    />
                  </div>
                  <div className="flex-1">
                    <div className={compact ? 'font-bold text-base' : 'font-bold text-lg'}>
                      {currentVehicle.name}
                      {isComingSoon && <span className="ml-2 text-xs text-yellow-400">Coming Soon</span>}
                    </div>
                    <div className="text-xs text-gray-300">
                      Unlock: {currentVehicle.unlockDistance}m • Price: {currentVehicle.price}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {carouselIndex + 1} / {VEHICLE_CATALOG.length}
                    </div>
                  </div>
                </div>

                <div className={compact ? 'mt-3' : 'mt-4'}>
                  {(() => {
                    const isSelected = currentVehicle.id === selectedVehicle.id
                    const isLocked = profile.bestDistance < currentVehicle.unlockDistance
                    const isDisabled = isComingSoon || isLocked
                    return (
                      <button
                        className={
                          isDisabled
                            ? 'w-full px-3 py-2 rounded bg-gray-800 text-gray-400 cursor-not-allowed'
                            : isSelected
                              ? 'w-full px-3 py-2 rounded bg-green-600 text-black font-bold'
                              : 'w-full px-3 py-2 rounded bg-gray-700 hover:bg-gray-600'
                        }
                        disabled={isDisabled}
                        onClick={() => handleSelectVehicle(currentVehicle.id)}
                      >
                        {isComingSoon ? 'Coming Soon' : isLocked ? 'Locked' : isSelected ? 'Selected' : 'Select'}
                      </button>
                    )
                  })()}
                </div>
              </div>

              <button
                className={compact ? 'h-9 w-9 rounded-full bg-gray-800 hover:bg-gray-700' : 'h-10 w-10 rounded-full bg-gray-800 hover:bg-gray-700'}
                onClick={() => setCarouselIndex(prev => (prev + 1) % VEHICLE_CATALOG.length)}
                aria-label="Next car"
              >
                ›
              </button>
            </div>
          </section>

          <section className={compact ? 'bg-gray-900/60 border border-gray-800 rounded-lg p-3' : 'bg-gray-900/60 border border-gray-800 rounded-lg p-4'}>
            <div className={compact ? 'font-bold mb-2 text-sm' : 'font-bold mb-3'}>Upgrades</div>
            <div className={compact ? 'grid gap-2' : 'grid gap-3'}>
              {UPGRADE_ROWS.map(row => {
                const level = getVehicleUpgrades(profile, currentVehicle.id)[row.key]
                const cost = getUpgradeCost(row.key, level)
                const isMaxed = level >= MAX_UPGRADE_LEVEL
                const canBuy = !isMaxed && profile.coins >= cost

                return (
                  <div key={row.key} className={compact ? 'flex items-center justify-between gap-2 border border-gray-800 rounded-lg p-2 bg-black/40' : 'flex items-center justify-between gap-3 border border-gray-800 rounded-lg p-3 bg-black/40'}>
                    <div>
                      <div className={compact ? 'font-bold text-sm' : 'font-bold'}>
                        {row.title} <span className="text-gray-300">Lv. {level}</span>
                      </div>
                      {!compact && <div className="text-xs text-gray-400">{row.subtitle}</div>}
                    </div>
                    <button
                      className={
                        isMaxed
                          ? (compact ? 'px-3 py-1.5 rounded bg-gray-800 text-gray-400 cursor-not-allowed text-xs' : 'px-4 py-2 rounded bg-gray-800 text-gray-400 cursor-not-allowed')
                          : canBuy
                            ? (compact ? 'px-3 py-1.5 rounded bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-xs' : 'px-4 py-2 rounded bg-yellow-600 hover:bg-yellow-500 text-black font-bold')
                            : (compact ? 'px-3 py-1.5 rounded bg-gray-700 text-gray-300 cursor-not-allowed text-xs' : 'px-4 py-2 rounded bg-gray-700 text-gray-300 cursor-not-allowed')
                      }
                      disabled={!canBuy}
                      onClick={() => handleUpgrade(row.key)}
                    >
                      {isMaxed ? 'Max' : compact ? 'Upgrade' : `Upgrade (${cost})`}
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
        </div>
      </div>
      </div>
    </div>
  )
}
