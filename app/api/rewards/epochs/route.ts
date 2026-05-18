import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'
import type { Client, InStatement } from '@libsql/client'
import { isAddress } from 'viem'

type RewardPeriod = 'weekly' | 'monthly'
type RewardStatus = 'draft' | 'finalized' | 'distributed'

type PlayerRow = {
  address: string
  leaderboardScore: number
}

type RankedPlayer = PlayerRow & {
  rank: number
  score: number
}

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

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function toText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return fallback
  return String(value)
}

function getPeriodBounds(period: RewardPeriod, now = Date.now()) {
  const current = new Date(now)

  if (period === 'weekly') {
    const day = (current.getUTCDay() + 6) % 7
    const startOfWeek = Date.UTC(
      current.getUTCFullYear(),
      current.getUTCMonth(),
      current.getUTCDate() - day,
      0,
      0,
      0,
      0,
    )

    return {
      startAt: startOfWeek - 7 * 24 * 60 * 60 * 1000,
      endAt: startOfWeek,
    }
  }

  const startOfCurrentMonth = Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), 1, 0, 0, 0, 0)
  const previousMonth = new Date(startOfCurrentMonth)
  previousMonth.setUTCMonth(previousMonth.getUTCMonth() - 1)
  const startOfPreviousMonth = Date.UTC(previousMonth.getUTCFullYear(), previousMonth.getUTCMonth(), 1, 0, 0, 0, 0)

  return {
    startAt: startOfPreviousMonth,
    endAt: startOfCurrentMonth,
  }
}

function computePlayerScore(player: PlayerRow) {
  return Math.max(0, player.leaderboardScore)
}

function normalizeBps(values: number[]): number[] {
  const total = values.reduce((acc, value) => acc + value, 0)
  if (total <= 0) return values.map(() => 0)

  const normalized = values.map((value) => Math.floor((value * 10000) / total))
  const remainder = 10000 - normalized.reduce((acc, value) => acc + value, 0)
  if (normalized.length > 0 && remainder > 0) normalized[0] += remainder
  return normalized
}

function ensureAdmin(request: NextRequest) {
  const secret = process.env.REWARDS_ADMIN_SECRET
  if (!secret) return true
  const provided = request.headers.get('x-admin-secret') || ''
  return provided === secret
}

async function ensureTables(db: Client) {
  if (initialized) return

  await db.execute(`
    CREATE TABLE IF NOT EXISTS seasonal_reward_epochs (
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
    )
  `)

  await db.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_seasonal_epoch_unique
    ON seasonal_reward_epochs(period, token_address, start_at, end_at)
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS seasonal_reward_allocations (
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
    )
  `)

  await db.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_seasonal_allocation_unique
    ON seasonal_reward_allocations(epoch_id, address)
  `)

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_seasonal_allocations_address
    ON seasonal_reward_allocations(address)
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS seasonal_reward_fundings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      epoch_id INTEGER NOT NULL,
      token_address TEXT NOT NULL,
      amount_raw TEXT NOT NULL,
      funded_by TEXT,
      tx_hash TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(epoch_id) REFERENCES seasonal_reward_epochs(id)
    )
  `)

  try {
    await db.execute('ALTER TABLE seasonal_reward_epochs ADD COLUMN token_decimals INTEGER NOT NULL DEFAULT 18')
  } catch {
    // Column already exists in deployed databases.
  }

  initialized = true
}

async function resetLeaderboardTables(db: Client) {
  await db.execute('DELETE FROM leaderboard_scores')
  await db.execute('DELETE FROM leaderboard_users')
}

async function loadPlayers(db: Client): Promise<PlayerRow[]> {
  const result = await db.execute(`
    WITH normalized_scores AS (
      SELECT LOWER(address) AS address, MAX(score) AS leaderboard_score
      FROM leaderboard_scores
      WHERE score > 0
      GROUP BY LOWER(address)
    )
    SELECT ns.address,
           ns.leaderboard_score
    FROM normalized_scores ns
  `)

  return result.rows.map((row) => ({
    address: toText(row.address),
    leaderboardScore: toNumber(row.leaderboard_score),
  }))
}

function allocateRewardsByBps(players: RankedPlayer[], budgetRaw: bigint, payoutBps: number[]) {
  const totalBps = payoutBps.reduce((acc, value) => acc + value, 0)
  if (totalBps <= 0 || budgetRaw <= 0n) {
    return players.map((player, index) => ({ ...player, amountRaw: '0', payoutBps: payoutBps[index] || 0 }))
  }

  let distributed = 0n
  const allocations = players.map((player, index) => {
    const bps = payoutBps[index] || 0
    let amount = (budgetRaw * BigInt(bps)) / 10000n

    if (index === 0) {
      const remainder = budgetRaw - distributed - amount
      if (remainder > 0n) amount += remainder
    }

    distributed += amount
    return {
      ...player,
      amountRaw: amount.toString(),
      payoutBps: bps,
    }
  })

  return allocations
}

export async function GET(request: NextRequest) {
  try {
    const db = getClient()
    if (!db) {
      return NextResponse.json({
        address: '',
        weeklyPendingRaw: '0',
        monthlyPendingRaw: '0',
        allocations: [],
        latestEpochs: [],
      })
    }

    await ensureTables(db)

    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (address) {
      const normalized = address.toLowerCase()
      const result = await db.execute({
        sql: `
          SELECT a.epoch_id,
                 a.rank,
                 a.score,
                 a.amount_raw,
                 a.claimed,
                 e.period,
                 e.status,
                 e.token_address,
               e.token_decimals,
                 e.start_at,
                 e.end_at,
                 e.finalized_at,
                 e.distributed_at
          FROM seasonal_reward_allocations a
          JOIN seasonal_reward_epochs e ON e.id = a.epoch_id
          WHERE LOWER(a.address) = ?
          ORDER BY e.end_at DESC
          LIMIT 100
        `,
        args: [normalized],
      })

      const allocations = result.rows.map((row) => ({
        epochId: toNumber(row.epoch_id),
        period: toText(row.period) as RewardPeriod,
        status: toText(row.status),
        tokenAddress: toText(row.token_address),
        tokenDecimals: toNumber(row.token_decimals, 18),
        amountRaw: toText(row.amount_raw, '0'),
        rank: toNumber(row.rank),
        score: toNumber(row.score),
        claimed: toNumber(row.claimed) === 1,
        startAt: toNumber(row.start_at),
        endAt: toNumber(row.end_at),
        finalizedAt: row.finalized_at ? toNumber(row.finalized_at) : null,
        distributedAt: row.distributed_at ? toNumber(row.distributed_at) : null,
      }))

      const weeklyPendingRaw = allocations
        .filter((entry) => entry.period === 'weekly' && !entry.claimed)
        .reduce((acc, entry) => acc + BigInt(entry.amountRaw), 0n)
        .toString()

      const monthlyPendingRaw = allocations
        .filter((entry) => entry.period === 'monthly' && !entry.claimed)
        .reduce((acc, entry) => acc + BigInt(entry.amountRaw), 0n)
        .toString()

      return NextResponse.json({
        address: normalized,
        weeklyPendingRaw,
        monthlyPendingRaw,
        allocations,
      })
    }

    const latestEpochsResult = await db.execute(`
      SELECT id, period, status, token_address, token_decimals, budget_raw, min_games, start_at, end_at, finalized_at, distributed_at, metadata
      FROM seasonal_reward_epochs
      ORDER BY end_at DESC
      LIMIT 10
    `)

    const latestEpochs = latestEpochsResult.rows.map((row) => ({
      id: toNumber(row.id),
      period: toText(row.period),
      status: toText(row.status),
      tokenAddress: toText(row.token_address),
      tokenDecimals: toNumber(row.token_decimals, 18),
      budgetRaw: toText(row.budget_raw),
      minGames: toNumber(row.min_games),
      startAt: toNumber(row.start_at),
      endAt: toNumber(row.end_at),
      finalizedAt: row.finalized_at ? toNumber(row.finalized_at) : null,
      distributedAt: row.distributed_at ? toNumber(row.distributed_at) : null,
      metadata: toText(row.metadata, ''),
    }))

    return NextResponse.json({ latestEpochs })
  } catch (error) {
    console.error('Failed to get seasonal rewards:', error)
    return NextResponse.json({ error: 'Failed to get seasonal rewards' }, { status: 500 })
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
    const action = toText(body.action)

    if (action === 'finalize') {
      const period = (toText(body.period, 'weekly') === 'monthly' ? 'monthly' : 'weekly') as RewardPeriod
      const tokenAddress = toText(body.tokenAddress, '').toLowerCase()
      const budgetRawText = toText(body.budgetRaw, '0')
      const tokenDecimals = Math.max(0, Math.min(36, toNumber(body.tokenDecimals, 18)))
      const winnersCount = Math.max(1, Math.min(100, toNumber(body.winnersCount, 10)))
      const payoutPercentsInput: unknown[] = Array.isArray(body.payoutPercents) ? body.payoutPercents : []

      if (!isAddress(tokenAddress)) {
        return NextResponse.json({ error: 'Invalid token address' }, { status: 400 })
      }

      if (payoutPercentsInput.length !== winnersCount) {
        return NextResponse.json({ error: 'Payout percentages count must match winners count.' }, { status: 400 })
      }

      const payoutBps = payoutPercentsInput.map((value: unknown) => Math.round(toNumber(value, 0) * 100))
      if (payoutBps.some((value) => value < 0)) {
        return NextResponse.json({ error: 'Payout percentages must be non-negative.' }, { status: 400 })
      }

      const totalBps = payoutBps.reduce((acc, value) => acc + value, 0)
      if (totalBps !== 10000) {
        return NextResponse.json({ error: `Payout percentages must total 100. Current total: ${(totalBps / 100).toFixed(2)}` }, { status: 400 })
      }

      const budgetRaw = BigInt(budgetRawText)
      if (budgetRaw <= 0n) {
        return NextResponse.json({ error: 'Budget must be greater than 0' }, { status: 400 })
      }

      const { startAt, endAt } = getPeriodBounds(period)

      const existing = await db.execute({
        sql: `
          SELECT id FROM seasonal_reward_epochs
          WHERE period = ? AND token_address = ? AND start_at = ? AND end_at = ?
          LIMIT 1
        `,
        args: [period, tokenAddress, startAt, endAt],
      })

      if (existing.rows.length > 0) {
        return NextResponse.json({ error: 'Epoch already finalized for this period/token window' }, { status: 409 })
      }

      const players = await loadPlayers(db)
      const ranked = players
        .map((player) => ({
          ...player,
          score: computePlayerScore(player),
        }))
        .filter((player) => player.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, winnersCount)
        .map((player, index) => ({
          ...player,
          rank: index + 1,
        }))

      const effectivePayoutBps = normalizeBps(payoutBps.slice(0, ranked.length))
      const allocations = allocateRewardsByBps(ranked, budgetRaw, effectivePayoutBps)
      const now = Date.now()

      const insertEpoch = await db.execute({
        sql: `
          INSERT INTO seasonal_reward_epochs
            (period, status, token_address, token_decimals, budget_raw, start_at, end_at, created_at, finalized_at, metadata)
          VALUES
            (?, 'finalized', ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          period,
          tokenAddress,
          tokenDecimals,
          budgetRaw.toString(),
          startAt,
          endAt,
          now,
          now,
          JSON.stringify({
            players: allocations.length,
            winnersCount,
            payoutPercents: payoutBps.map((value) => value / 100),
          }),
        ],
      })

      const epochId = Number(insertEpoch.lastInsertRowid)

      if (allocations.length > 0) {
        const statements: InStatement[] = allocations.map((entry) => ({
          sql: `
            INSERT INTO seasonal_reward_allocations
              (epoch_id, address, rank, weight, score, amount_raw, claimed, created_at)
            VALUES
              (?, ?, ?, ?, ?, ?, 0, ?)
          `,
          args: [epochId, entry.address, entry.rank, entry.payoutBps, entry.score, entry.amountRaw, now],
        }))

        await db.batch(statements, 'write')
      }

      return NextResponse.json({
        success: true,
        epochId,
        period,
        tokenAddress,
        tokenDecimals,
        startAt,
        endAt,
        players: allocations.length,
      })
    }

    if (action === 'fund') {
      const epochId = toNumber(body.epochId)
      const tokenAddress = toText(body.tokenAddress).toLowerCase()
      const amountRaw = toText(body.amountRaw, '0')
      const fundedBy = toText(body.fundedBy, '')
      const txHash = toText(body.txHash, '')

      if (!epochId || !isAddress(tokenAddress)) {
        return NextResponse.json({ error: 'epochId and tokenAddress are required' }, { status: 400 })
      }

      const amount = BigInt(amountRaw)
      if (amount <= 0n) {
        return NextResponse.json({ error: 'amountRaw must be > 0' }, { status: 400 })
      }

      const now = Date.now()
      await db.execute({
        sql: `
          INSERT INTO seasonal_reward_fundings
            (epoch_id, token_address, amount_raw, funded_by, tx_hash, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        args: [epochId, tokenAddress, amount.toString(), fundedBy || null, txHash || null, now],
      })

      return NextResponse.json({ success: true })
    }

    if (action === 'distribute') {
      const epochId = toNumber(body.epochId)
      if (!epochId) {
        return NextResponse.json({ error: 'epochId is required' }, { status: 400 })
      }

      const now = Date.now()
      await db.execute({
        sql: `
          UPDATE seasonal_reward_epochs
          SET status = 'distributed', distributed_at = ?
          WHERE id = ?
        `,
        args: [now, epochId],
      })

      await resetLeaderboardTables(db)

      return NextResponse.json({ success: true })
    }

    if (action === 'mark-claimed') {
      const epochId = toNumber(body.epochId)
      const player = toText(body.address, '').toLowerCase()
      if (!epochId || !player) {
        return NextResponse.json({ error: 'epochId and address are required' }, { status: 400 })
      }

      await db.execute({
        sql: `
          UPDATE seasonal_reward_allocations
          SET claimed = 1, claimed_at = ?
          WHERE epoch_id = ? AND LOWER(address) = ?
        `,
        args: [Date.now(), epochId, player],
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (error) {
    console.error('Failed to mutate seasonal rewards:', error)
    return NextResponse.json({ error: 'Failed to mutate seasonal rewards' }, { status: 500 })
  }
}
