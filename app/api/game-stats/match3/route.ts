import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'
import type { Client } from '@libsql/client'

let client: Client | null = null
let initialized = false

function getClient() {
  if (client) return client

  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN
  if (!url || !authToken) return null

  client = createClient({ url, authToken })
  return client
}

async function ensureTable() {
  if (initialized) return
  const db = getClient()
  if (!db) return

  await db.execute(`
    CREATE TABLE IF NOT EXISTS match3_stats (
      address TEXT PRIMARY KEY,
      data TEXT NOT NULL
    )
  `)

  initialized = true
}

interface Match3Stats {
  gamesPlayed: number
  highScore: number
  highScoreLevel: number
  lastPlayed: number
}

function defaultStats(): Match3Stats {
  return {
    gamesPlayed: 0,
    highScore: 0,
    highScoreLevel: 0,
    lastPlayed: Date.now(),
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 })
    }

    const db = getClient()
    if (!db) return NextResponse.json(defaultStats())

    await ensureTable()
    const result = await db.execute({
      sql: 'SELECT data FROM match3_stats WHERE address = ?',
      args: [address.toLowerCase()],
    })

    if (result.rows.length === 0) return NextResponse.json(defaultStats())

    return NextResponse.json(JSON.parse(result.rows[0].data as string) as Match3Stats)
  } catch (error) {
    console.error('Error fetching Match-3 stats:', error)
    return NextResponse.json(defaultStats(), { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address, score, level, gamesPlayed } = body

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 })
    }

    const db = getClient()
    if (!db) {
      return NextResponse.json({ success: true, stats: defaultStats(), persisted: false })
    }

    await ensureTable()

    const result = await db.execute({
      sql: 'SELECT data FROM match3_stats WHERE address = ?',
      args: [address.toLowerCase()],
    })

    const stats: Match3Stats = result.rows.length > 0
      ? JSON.parse(result.rows[0].data as string)
      : defaultStats()

    if (gamesPlayed !== undefined) stats.gamesPlayed = gamesPlayed
    if (score !== undefined && score > stats.highScore) {
      stats.highScore = score
      stats.highScoreLevel = level || 1
    }
    stats.lastPlayed = Date.now()

    await db.execute({
      sql: 'INSERT OR REPLACE INTO match3_stats (address, data) VALUES (?, ?)',
      args: [address.toLowerCase(), JSON.stringify(stats)],
    })

    return NextResponse.json({ success: true, stats, persisted: true })
  } catch (error) {
    console.error('Error saving Match-3 stats:', error)
    return NextResponse.json({ error: 'Failed to save stats' }, { status: 500 })
  }
}
