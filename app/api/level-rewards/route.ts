import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

// Initialize database table
async function initTable() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS level_rewards (
      level INTEGER PRIMARY KEY,
      reward TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

// Call init on module load
initTable().catch(console.error)

export async function GET() {
  try {
    console.log('🔍 API: Getting level rewards from Turso...')
    const result = await client.execute('SELECT level, reward FROM level_rewards ORDER BY level')

    const levelRewards: Record<number, string> = {}
    result.rows.forEach(row => {
      levelRewards[Number(row.level)] = row.reward as string
    })

    console.log('✅ API: Level rewards retrieved:', levelRewards)
    return NextResponse.json(levelRewards)
  } catch (error) {
    console.error('❌ API: Error fetching level rewards:', error)
    return NextResponse.json({}, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { level, reward } = body
    console.log('📝 API: Saving level reward:', { level, reward })

    if (level === undefined || reward === undefined) {
      return NextResponse.json({ error: 'Level and reward are required' }, { status: 400 })
    }

    // Upsert the level reward
    await client.execute({
      sql: `
        INSERT INTO level_rewards (level, reward, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(level) DO UPDATE SET
          reward = excluded.reward,
          updated_at = CURRENT_TIMESTAMP
      `,
      args: [level, reward]
    })

    console.log('✅ API: Level reward saved successfully')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ API: Error saving level reward:', error)
    return NextResponse.json({ error: 'Failed to save level reward' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { level } = body
    console.log('🗑️ API: Deleting level reward:', { level })

    if (level === undefined) {
      return NextResponse.json({ error: 'Level is required' }, { status: 400 })
    }

    await client.execute('DELETE FROM level_rewards WHERE level = ?', [level])

    console.log('✅ API: Level reward deleted successfully')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ API: Error deleting level reward:', error)
    return NextResponse.json({ error: 'Failed to delete level reward' }, { status: 500 })
  }
}