'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { VEHICLE_CATALOG } from '@/lib/game/vehicleCatalog'
import { getUpgradeCost, loadBaseboundProfile, saveBaseboundProfile } from '@/lib/game/baseboundProfile'
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

  const selectedVehicle = useMemo(() => {
    return VEHICLE_CATALOG.find(v => v.id === profile.selectedVehicleId) ?? VEHICLE_CATALOG[0]
  }, [profile.selectedVehicleId])

  const handleSelectVehicle = (vehicleId: number) => {
    const next = { ...profile, selectedVehicleId: vehicleId }
    saveBaseboundProfile(next)
    setProfile(next)
  }

  const handleUpgrade = (upgradeKey: keyof UpgradeLevels) => {
    const currentLevel = profile.upgrades[upgradeKey]
    if (currentLevel >= MAX_UPGRADE_LEVEL) return

    const cost = getUpgradeCost(upgradeKey, currentLevel)
    if (profile.coins < cost) return

    const next = {
      ...profile,
      coins: profile.coins - cost,
      upgrades: {
        ...profile.upgrades,
        [upgradeKey]: currentLevel + 1
      }
    }

    saveBaseboundProfile(next)
    setProfile(next)
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            className="px-4 py-2 rounded bg-gray-800 hover:bg-gray-700"
            onClick={() => router.push('/')}
          >
            Back
          </button>
          <div className="text-center">
            <div className="text-xl font-bold">Basebound Garage</div>
            <div className="text-sm text-gray-300">Coins: {profile.coins} • Best: {Math.floor(profile.bestDistance)}m</div>
          </div>
          <button
            className="px-4 py-2 rounded bg-yellow-600 hover:bg-yellow-500 text-black font-bold"
            onClick={() => router.push('/basebound')}
          >
            Play
          </button>
        </div>

        <div className="grid gap-6">
          <section className="bg-gray-900/60 border border-gray-800 rounded-lg p-4">
            <div className="font-bold mb-3">Select Car</div>
            <div className="grid sm:grid-cols-2 gap-4">
              {VEHICLE_CATALOG.map(vehicle => {
                const isSelected = vehicle.id === selectedVehicle.id
                const isLocked = profile.bestDistance < vehicle.unlockDistance

                return (
                  <div key={vehicle.id} className="border border-gray-800 rounded-lg p-3 bg-black/40">
                    <div className="flex items-center gap-3">
                      <div className="relative w-24 h-12 bg-gray-800/50 rounded overflow-hidden">
                        <Image
                          src={vehicle.parts.body.path}
                          alt={vehicle.name}
                          fill
                          sizes="96px"
                          style={{ objectFit: 'contain' }}
                          priority={vehicle.isStarter}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold">{vehicle.name}</div>
                        <div className="text-xs text-gray-300">
                          Unlock: {vehicle.unlockDistance}m • Price: {vehicle.price}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <button
                        className={
                          isLocked
                            ? 'w-full px-3 py-2 rounded bg-gray-800 text-gray-400 cursor-not-allowed'
                            : isSelected
                              ? 'w-full px-3 py-2 rounded bg-green-600 text-black font-bold'
                              : 'w-full px-3 py-2 rounded bg-gray-700 hover:bg-gray-600'
                        }
                        disabled={isLocked}
                        onClick={() => handleSelectVehicle(vehicle.id)}
                      >
                        {isLocked ? 'Locked' : isSelected ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="bg-gray-900/60 border border-gray-800 rounded-lg p-4">
            <div className="font-bold mb-3">Upgrades</div>
            <div className="grid gap-3">
              {UPGRADE_ROWS.map(row => {
                const level = profile.upgrades[row.key]
                const cost = getUpgradeCost(row.key, level)
                const isMaxed = level >= MAX_UPGRADE_LEVEL
                const canBuy = !isMaxed && profile.coins >= cost

                return (
                  <div key={row.key} className="flex items-center justify-between gap-3 border border-gray-800 rounded-lg p-3 bg-black/40">
                    <div>
                      <div className="font-bold">{row.title} <span className="text-gray-300">Lv. {level}</span></div>
                      <div className="text-xs text-gray-400">{row.subtitle}</div>
                    </div>
                    <button
                      className={
                        isMaxed
                          ? 'px-4 py-2 rounded bg-gray-800 text-gray-400 cursor-not-allowed'
                          : canBuy
                            ? 'px-4 py-2 rounded bg-yellow-600 hover:bg-yellow-500 text-black font-bold'
                            : 'px-4 py-2 rounded bg-gray-700 text-gray-300 cursor-not-allowed'
                      }
                      disabled={!canBuy}
                      onClick={() => handleUpgrade(row.key)}
                    >
                      {isMaxed ? 'Max' : `Upgrade (${cost})`}
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
