import { NextRequest, NextResponse } from 'next/server'
import { initAchievementTables, recordBaseboundRun, updateUserScore, getUserStats } from '@/lib/db/achievements'

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

    const stats = await getUserStats(address.toLowerCase())
    return NextResponse.json({
      runs: (stats as any).basebound_runs || 0,
      totalMeters: (stats as any).basebound_total_meters || 0,
      bestMeters: (stats as any).basebound_best_meters || 0,
      lastPlayed: (stats as any).basebound_last_played || 0
    })
  } catch (error) {
    console.error('❌ API: Error fetching Basebound stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureTables()

    const body = await request.json()
    const { address, meters } = body ?? {}

    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Address required' }, { status: 400 })
    }
    if (typeof meters !== 'number' || !Number.isFinite(meters) || meters < 0) {
      return NextResponse.json({ error: 'Valid meters required' }, { status: 400 })
    }

    const result = await recordBaseboundRun(address, meters)
    const updatedScore = await updateUserScore(address)

    return NextResponse.json({
      success: true,
      run: result,
      leaderboardScore: updatedScore
    })
  } catch (error) {
    console.error('❌ API: Error saving Basebound run:', error)
    return NextResponse.json({ error: 'Failed to save run' }, { status: 500 })
  }
}

