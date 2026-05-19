import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'
import type { Client, InStatement } from '@libsql/client'

let client: Client | null = null
let initialized = false

const DEFAULT_BOOSTER_FEES = {
  hammer: '100000',
  shuffle: '200000',
  colorBomb: '500000',
  hammerPack: '500000',
  shufflePack: '1000000',
  colorBombPack: '2500000',
}

function getClient() {
  if (client) return client

  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN
  if (!url || !authToken) return null

  client = createClient({ url, authToken })
  return client
}

function ensureAdmin(request: NextRequest) {
  const secret = process.env.REWARDS_ADMIN_SECRET
  if (!secret) return true
  const provided = request.headers.get('x-admin-secret') || ''
  return provided === secret
}

function parseBoosterFees(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null

  const source = payload as Record<string, unknown>
  const keys = Object.keys(DEFAULT_BOOSTER_FEES) as Array<keyof typeof DEFAULT_BOOSTER_FEES>
  const parsed: Record<string, string> = {}

  for (const key of keys) {
    const value = source[key]
    if (typeof value !== 'string' || !/^\d+$/.test(value)) {
      return null
    }
    parsed[key] = value
  }

  return parsed
}

async function ensureTables(db: Client) {
  if (initialized) return

  await db.execute(`
    CREATE TABLE IF NOT EXISTS admin_game_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  initialized = true
}

async function loadBoosterFees(db: Client) {
  await ensureTables(db)

  const result = await db.execute({
    sql: `SELECT key, value FROM admin_game_config WHERE key LIKE 'booster_fee_%'`,
  })

  const fees = { ...DEFAULT_BOOSTER_FEES }

  for (const row of result.rows) {
    const key = String(row.key || '')
    const value = String(row.value || '')
    if (!/^\d+$/.test(value)) continue

    switch (key) {
      case 'booster_fee_hammer':
        fees.hammer = value
        break
      case 'booster_fee_shuffle':
        fees.shuffle = value
        break
      case 'booster_fee_color_bomb':
        fees.colorBomb = value
        break
      case 'booster_fee_hammer_pack':
        fees.hammerPack = value
        break
      case 'booster_fee_shuffle_pack':
        fees.shufflePack = value
        break
      case 'booster_fee_color_bomb_pack':
        fees.colorBombPack = value
        break
      default:
        break
    }
  }

  return fees
}

export async function GET() {
  try {
    const db = getClient()
    if (!db) {
      return NextResponse.json({ boosterFees: DEFAULT_BOOSTER_FEES })
    }

    const boosterFees = await loadBoosterFees(db)
    return NextResponse.json({ boosterFees })
  } catch (error) {
    console.error('Failed to load admin game config:', error)
    return NextResponse.json({ boosterFees: DEFAULT_BOOSTER_FEES })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!ensureAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getClient()
    if (!db) {
      return NextResponse.json({ error: 'Turso is not configured' }, { status: 503 })
    }

    await ensureTables(db)

    const body = await request.json()
    const parsed = parseBoosterFees(body?.boosterFees)
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid booster fee payload' }, { status: 400 })
    }

    const now = Date.now()
    const statements: InStatement[] = [
      { sql: `INSERT OR REPLACE INTO admin_game_config (key, value, updated_at) VALUES ('booster_fee_hammer', ?, ?)`, args: [parsed.hammer, now] },
      { sql: `INSERT OR REPLACE INTO admin_game_config (key, value, updated_at) VALUES ('booster_fee_shuffle', ?, ?)`, args: [parsed.shuffle, now] },
      { sql: `INSERT OR REPLACE INTO admin_game_config (key, value, updated_at) VALUES ('booster_fee_color_bomb', ?, ?)`, args: [parsed.colorBomb, now] },
      { sql: `INSERT OR REPLACE INTO admin_game_config (key, value, updated_at) VALUES ('booster_fee_hammer_pack', ?, ?)`, args: [parsed.hammerPack, now] },
      { sql: `INSERT OR REPLACE INTO admin_game_config (key, value, updated_at) VALUES ('booster_fee_shuffle_pack', ?, ?)`, args: [parsed.shufflePack, now] },
      { sql: `INSERT OR REPLACE INTO admin_game_config (key, value, updated_at) VALUES ('booster_fee_color_bomb_pack', ?, ?)`, args: [parsed.colorBombPack, now] },
    ]

    await db.batch(statements, 'write')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update admin game config:', error)
    return NextResponse.json({ error: 'Failed to update admin game config' }, { status: 500 })
  }
}
