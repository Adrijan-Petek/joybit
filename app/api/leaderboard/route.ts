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
        // Discover every table that actually exists (including old/unknown ones)
        const tablesResult = await db.execute(
          `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
        )
        const existingTables = tablesResult.rows.map((r) => String(r.name))

        // Drop indexes first, then tables (disable FK checks not available in libsql,
        // so drop child tables before parent tables)
        const childFirst = [
          'seasonal_reward_allocations',
          'seasonal_reward_fundings',
          'seasonal_reward_epochs',
        ]
        const ordered = [
          ...childFirst.filter((t) => existingTables.includes(t)),
          ...existingTables.filter((t) => !childFirst.includes(t)),
        ]
        for (const table of ordered) {
          try { await db.execute(`DROP TABLE IF EXISTS "${table}"`) } catch { /* ignore */ }
        }

        // Also drop any leftover named indexes
        const idxResult = await db.execute(
          `SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'`
        )
        for (const row of idxResult.rows) {
          try { await db.execute(`DROP INDEX IF EXISTS "${String(row.name)}"`) } catch { /* ignore */ }
        }

        // Recreate all tables fresh
        await db.execute(`CREATE TABLE leaderboard_scores (
          address TEXT PRIMARY KEY,
          score INTEGER NOT NULL
        )`)
        await db.execute(`CREATE TABLE leaderboard_users (
          address TEXT PRIMARY KEY,
          username TEXT,
          pfp TEXT,
          fid INTEGER
        )`)
        await db.execute(`CREATE TABLE match3_stats (
          address TEXT PRIMARY KEY,
          data TEXT NOT NULL
        )`)
        await db.execute(`CREATE TABLE seasonal_reward_epochs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          period TEXT NOT NULL,
          status TEXT NOT NULL,
          token_address TEXT NOT NULL,
          token_decimals INTEGER NOT NULL DEFAULT 18,
          budget_raw TEXT NOT NULL,
          min_games INTEGER NOT NULL DEFAULT 5,
          start_at INTEGER NOT NULL,
          end_at INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          finalized_at INTEGER,
          distributed_at INTEGER,
          metadata TEXT
        )`)
        await db.execute(`CREATE UNIQUE INDEX idx_seasonal_epoch_unique
          ON seasonal_reward_epochs(period, token_address, start_at, end_at)`)
        await db.execute(`CREATE TABLE seasonal_reward_allocations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          epoch_id INTEGER NOT NULL,
          address TEXT NOT NULL,
          rank INTEGER NOT NULL,
          weight INTEGER NOT NULL,
          score INTEGER NOT NULL,
          amount_raw TEXT NOT NULL,
          claimed INTEGER NOT NULL DEFAULT 0,
          claimed_at INTEGER,
          created_at INTEGER NOT NULL,
          FOREIGN KEY(epoch_id) REFERENCES seasonal_reward_epochs(id)
        )`)
        await db.execute(`CREATE UNIQUE INDEX idx_seasonal_allocation_unique
          ON seasonal_reward_allocations(epoch_id, address)`)
        await db.execute(`CREATE INDEX idx_seasonal_allocations_address
          ON seasonal_reward_allocations(address)`)
        await db.execute(`CREATE TABLE seasonal_reward_fundings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          epoch_id INTEGER NOT NULL,
          token_address TEXT NOT NULL,
          amount_raw TEXT NOT NULL,
          funded_by TEXT,
          tx_hash TEXT,
          created_at INTEGER NOT NULL,
          FOREIGN KEY(epoch_id) REFERENCES seasonal_reward_epochs(id)
        )`)

        // Force all route modules to re-run ensureTables on next request
        initialized = false

        return NextResponse.json({ success: true, droppedAndRecreated: true })
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
