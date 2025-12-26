import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

// Initialize database table
async function initTable() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS level_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT NOT NULL,
      level INTEGER NOT NULL,
      reward_amount TEXT NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      distributed BOOLEAN DEFAULT FALSE,
      distributed_at DATETIME,
      UNIQUE(address, level)
    )
  `)
}

// Call init on module load
initTable().catch(console.error)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')
    const pendingOnly = searchParams.get('pending') === 'true'

    console.log('🔍 API: Getting level completions:', { address, pendingOnly })

    let query = 'SELECT * FROM level_completions'
    const args: any[] = []

    if (address) {
      query += ' WHERE address = ?'
      args.push(address)
    }

    if (pendingOnly) {
      query += (address ? ' AND' : ' WHERE') + ' distributed = FALSE'
    }

    query += ' ORDER BY completed_at DESC'

    const result = await client.execute(query, args)

    console.log('✅ API: Level completions retrieved:', result.rows.length)
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('❌ API: Error fetching level completions:', error)
    return NextResponse.json({ error: 'Failed to fetch level completions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address, level, rewardAmount } = body
    console.log('📝 API: Recording level completion:', { address, level, rewardAmount })

    if (!address || !level || !rewardAmount) {
      return NextResponse.json({ error: 'Address, level, and rewardAmount are required' }, { status: 400 })
    }

    // Insert or update the level completion
    await client.execute({
      sql: `
        INSERT INTO level_completions (address, level, reward_amount, completed_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(address, level) DO UPDATE SET
          reward_amount = excluded.reward_amount,
          completed_at = CURRENT_TIMESTAMP
      `,
      args: [address, level, rewardAmount]
    })

    console.log('✅ API: Level completion recorded successfully')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ API: Error recording level completion:', error)
    return NextResponse.json({ error: 'Failed to record level completion' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids } = body
    console.log('🔄 API: Marking level completions as distributed:', ids)

    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: 'IDs array is required' }, { status: 400 })
    }

    // Update the distributed status
    await client.execute({
      sql: `UPDATE level_completions SET distributed = TRUE, distributed_at = CURRENT_TIMESTAMP WHERE id IN (${ids.map(() => '?').join(',')})`,
      args: ids
    })

    console.log('✅ API: Level completions marked as distributed')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ API: Error updating level completions:', error)
    return NextResponse.json({ error: 'Failed to update level completions' }, { status: 500 })
  }
}