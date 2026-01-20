import { NextRequest, NextResponse } from 'next/server'
import { initAchievementTables, recordBaseboundRun, updateUserScore, getUserStats } from '@/lib/db/achievements'
import { createClient } from '@libsql/client'

let tablesInitialized = false

async function ensureTables() {
  if (!tablesInitialized) {
    await initAchievementTables()
    tablesInitialized = true
  }
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

export async function GET(request: NextRequest) {
  try {
    await ensureTables()

    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')
    const debug = searchParams.get('debug') === '1'
    if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 })

    if (debug) {
      const baseboundRuns = await client.execute(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='basebound_runs'
      `)
      const userStats = await client.execute(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='user_stats'
      `)
      const userStatsColumns = await client.execute(`PRAGMA table_info(user_stats)`)
      const columnNames = userStatsColumns.rows.map(row => String((row as any).name))

      return NextResponse.json({
        tursoUrlSet: Boolean(process.env.TURSO_DATABASE_URL),
        tursoTokenSet: Boolean(process.env.TURSO_AUTH_TOKEN),
        tables: {
          user_stats: userStats.rows.length > 0,
          basebound_runs: baseboundRuns.rows.length > 0
        },
        user_stats_columns: columnNames
      })
    }

    const stats = await getUserStats(address.toLowerCase())
    return NextResponse.json({
      runs: (stats as any).basebound_runs || 0,
      totalMeters: (stats as any).basebound_total_meters || 0,
      bestMeters: (stats as any).basebound_best_meters || 0,
      lastPlayed: (stats as any).basebound_last_played || 0
    })
  } catch (error) {
    console.error('❌ API: Error fetching Basebound stats:', error)
    return NextResponse.json({
      error: 'Failed to fetch stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureTables()

    const body = await request.json()
    const { address, meters, coins, crashReason, vehicleId } = body ?? {}

    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Address required' }, { status: 400 })
    }
    if (typeof meters !== 'number' || !Number.isFinite(meters) || meters < 0) {
      return NextResponse.json({ error: 'Valid meters required' }, { status: 400 })
    }

    const result = await recordBaseboundRun(address, meters, {
      coins: typeof coins === 'number' ? coins : undefined,
      vehicleId: typeof vehicleId === 'number' ? vehicleId : undefined,
      crashReason: typeof crashReason === 'string' ? crashReason : undefined
    })
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
