import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'
import { initAchievementTables, getUserStats } from '@/lib/db/achievements'
import { normalizeBaseboundProfile, type BaseboundProfile } from '@/lib/game/baseboundProfile'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

let tablesInitialized = false

async function ensureTables() {
  if (!tablesInitialized) {
    await initAchievementTables()
    tablesInitialized = true
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureTables()

    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')
    if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 })
    const normalizedAddress = address.toLowerCase()

    const existing = await client.execute({
      sql: `SELECT data FROM basebound_profiles WHERE LOWER(user_address) = LOWER(?)`,
      args: [normalizedAddress]
    })

    const stored = existing.rows.length > 0 ? JSON.parse(String(existing.rows[0].data)) : null
    const profile = normalizeBaseboundProfile(stored)

    // Keep bestDistance aligned with best run distance tracked in user_stats.
    const stats = await getUserStats(normalizedAddress)
    const bestMeters = (stats as any).basebound_best_meters || 0
    const merged: BaseboundProfile = {
      ...profile,
      bestDistance: Math.max(profile.bestDistance || 0, bestMeters)
    }

    // If we merged anything, persist back (idempotent).
    await client.execute({
      sql: `
        INSERT INTO basebound_profiles (user_address, data, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_address) DO UPDATE SET
          data = excluded.data,
          updated_at = CURRENT_TIMESTAMP
      `,
      args: [normalizedAddress, JSON.stringify(merged)]
    })

    return NextResponse.json(merged)
  } catch (error) {
    console.error('❌ API: Error fetching Basebound profile:', error)
    return NextResponse.json({
      error: 'Failed to fetch profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureTables()

    const body = await request.json()
    const { address, profile } = body ?? {}

    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Address required' }, { status: 400 })
    }
    if (!profile || typeof profile !== 'object') {
      return NextResponse.json({ error: 'Profile required' }, { status: 400 })
    }

    const normalizedAddress = address.toLowerCase()
    const normalizedProfile = normalizeBaseboundProfile(profile)

    // Keep bestDistance aligned with best run distance tracked in user_stats.
    const stats = await getUserStats(normalizedAddress)
    const bestMeters = (stats as any).basebound_best_meters || 0
    const merged: BaseboundProfile = {
      ...normalizedProfile,
      bestDistance: Math.max(normalizedProfile.bestDistance || 0, bestMeters)
    }

    await client.execute({
      sql: `
        INSERT INTO basebound_profiles (user_address, data, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_address) DO UPDATE SET
          data = excluded.data,
          updated_at = CURRENT_TIMESTAMP
      `,
      args: [normalizedAddress, JSON.stringify(merged)]
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ API: Error saving Basebound profile:', error)
    return NextResponse.json({
      error: 'Failed to save profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

