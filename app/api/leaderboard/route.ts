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

async function ensureTables() {
  if (initialized) return
  const db = getClient()
  if (!db) return

  await db.execute(`
    CREATE TABLE IF NOT EXISTS leaderboard_scores (
      address TEXT PRIMARY KEY,
      score INTEGER NOT NULL
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS leaderboard_users (
      address TEXT PRIMARY KEY,
      username TEXT,
      pfp TEXT,
      fid INTEGER
    )
  `)

  initialized = true
}

function normalizeFid(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

export async function GET(request: NextRequest) {
  try {
    const db = getClient()
    if (!db) {
      const { searchParams } = new URL(request.url)
      if (searchParams.get('address')) return NextResponse.json({ currentScore: 0 })
      return NextResponse.json({ leaderboard: [] })
    }

    await ensureTables()
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (address) {
      const result = await db.execute({
        sql: `
          SELECT ls.score, lu.username, lu.pfp, lu.fid
          FROM leaderboard_scores ls
          LEFT JOIN leaderboard_users lu ON LOWER(ls.address) = LOWER(lu.address)
          WHERE LOWER(ls.address) = ?
        `,
        args: [address.toLowerCase()],
      })

      if (result.rows.length === 0) {
        return NextResponse.json({ currentScore: 0 })
      }

      const row = result.rows[0]
      return NextResponse.json({
        currentScore: Number(row.score) || 0,
        username: (row.username as string) || undefined,
        pfp: (row.pfp as string) || undefined,
        fid: normalizeFid(row.fid),
      })
    }

    const result = await db.execute(`
      WITH normalized_scores AS (
        SELECT LOWER(address) AS address, MAX(score) AS score
        FROM leaderboard_scores
        WHERE score > 0
        GROUP BY LOWER(address)
      ),
      normalized_users AS (
        SELECT LOWER(address) AS address,
               MAX(username) AS username,
               MAX(pfp) AS pfp,
               MAX(fid) AS fid
        FROM leaderboard_users
        GROUP BY LOWER(address)
      )
      SELECT ns.address, ns.score, nu.username, nu.pfp, nu.fid
      FROM normalized_scores ns
      LEFT JOIN normalized_users nu ON ns.address = nu.address
      ORDER BY ns.score DESC
      LIMIT 50
    `)

    const leaderboard = result.rows.map((row) => ({
      address: row.address as string,
      score: Number(row.score) || 0,
      username: (row.username as string) || undefined,
      pfp: (row.pfp as string) || undefined,
      fid: normalizeFid(row.fid),
    }))

    return NextResponse.json({ leaderboard })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard', leaderboard: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getClient()
    if (!db) {
      return NextResponse.json({ success: false, error: 'Leaderboard database is not configured' }, { status: 503 })
    }

    await ensureTables()
    const body = await request.json()
    const { action, address, score, username, pfp, fid } = body

    const isAdminAction = action === 'reset' || action === 'reset-all'
    if (isAdminAction) {
      const secret = process.env.REWARDS_ADMIN_SECRET
      if (secret) {
        const provided = request.headers.get('x-admin-secret') || ''
        if (provided !== secret) {
          return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }
      }

      if (action === 'reset-all') {
        // Wipe every table in the Turso database
        await db.execute('DELETE FROM leaderboard_scores')
        await db.execute('DELETE FROM leaderboard_users')
        await db.execute('DELETE FROM match3_stats')
        try { await db.execute('DELETE FROM seasonal_reward_allocations') } catch { /* table may not exist yet */ }
        try { await db.execute('DELETE FROM seasonal_reward_fundings') } catch { /* table may not exist yet */ }
        try { await db.execute('DELETE FROM seasonal_reward_epochs') } catch { /* table may not exist yet */ }
        return NextResponse.json({ success: true, resetAll: true })
      }

      // action === 'reset' — leaderboard only
      await db.execute('DELETE FROM leaderboard_scores')
      await db.execute('DELETE FROM leaderboard_users')
      return NextResponse.json({ success: true, reset: true })
    }

    if (!address || typeof score !== 'number') {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    const normalizedAddress = address.toLowerCase()

    await db.execute({
      sql: 'INSERT OR REPLACE INTO leaderboard_scores (address, score) VALUES (?, ?)',
      args: [normalizedAddress, score],
    })

    if (username !== undefined || pfp !== undefined || fid !== undefined) {
      await db.execute({
        sql: `
          INSERT INTO leaderboard_users (address, username, pfp, fid)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(address) DO UPDATE SET
            username = COALESCE(excluded.username, leaderboard_users.username),
            pfp = COALESCE(excluded.pfp, leaderboard_users.pfp),
            fid = COALESCE(excluded.fid, leaderboard_users.fid)
        `,
        args: [normalizedAddress, username || null, pfp || null, normalizeFid(fid) ?? null],
      })
    }

    return NextResponse.json({ success: true, updated: true })
  } catch (error) {
    console.error('Error updating leaderboard:', error)
    return NextResponse.json({ error: 'Failed to update leaderboard' }, { status: 500 })
  }
}
