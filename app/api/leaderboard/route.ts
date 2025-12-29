import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

// Initialize database tables
async function initTables() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS leaderboard_scores (
      address TEXT PRIMARY KEY,
      score INTEGER NOT NULL
    )
  `)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS leaderboard_users (
      address TEXT PRIMARY KEY,
      username TEXT,
      pfp TEXT
    )
  `)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS notification_tokens (
      fid INTEGER PRIMARY KEY,
      token TEXT,
      url TEXT,
      enabled BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

// Call init on module load
initTables().catch(console.error)

// GET leaderboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')
    
    // If address is provided, return just that user's current score
    if (address) {
      const result = await client.execute({
        sql: 'SELECT score FROM leaderboard_scores WHERE address = ?',
        args: [address]
      })
      
      const currentScore = result.rows.length > 0 ? result.rows[0].score as number : 0
      return NextResponse.json({ currentScore })
    }

    console.log('Fetching leaderboard from Turso...')
    console.log('Turso URL:', process.env.TURSO_DATABASE_URL ? 'Set' : 'Missing')
    console.log('Turso Token:', process.env.TURSO_AUTH_TOKEN ? 'Set' : 'Missing')
    
    // Get leaderboard entries (sorted by score descending)
    const result = await client.execute(`
      SELECT ls.address, ls.score, lu.username, lu.pfp
      FROM leaderboard_scores ls
      LEFT JOIN leaderboard_users lu ON ls.address = lu.address
      ORDER BY ls.score DESC
      LIMIT 100
    `)

    console.log('Leaderboard raw data:', result.rows)

    // Format the data
    const formatted = result.rows.map(row => ({
      address: row.address as string,
      score: Math.floor(row.score as number),
      username: row.username as string || undefined,
      pfp: row.pfp as string || undefined
    }))

    console.log('Formatted leaderboard:', formatted)
    return NextResponse.json({ leaderboard: formatted })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch leaderboard',
      details: error instanceof Error ? error.message : 'Unknown error',
      leaderboard: []
    }, { status: 500 })
  }
}

// POST update score
export async function POST(request: NextRequest) {
  try {
    const { address, score, username, pfp } = await request.json()

    if (!address || typeof score !== 'number') {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    // Always update the score with the new total (since we're now sending accumulated totals)
    await client.execute({
      sql: 'INSERT OR REPLACE INTO leaderboard_scores (address, score) VALUES (?, ?)',
      args: [address, score]
    })
    
    // Always store user data if provided
    if (username !== undefined || pfp !== undefined) {
      await client.execute({
        sql: 'INSERT OR REPLACE INTO leaderboard_users (address, username, pfp) VALUES (?, ?, ?)',
        args: [address, username || null, pfp || null]
      })
    }

    return NextResponse.json({ success: true, updated: true })
  } catch (error) {
    console.error('Error updating leaderboard:', error)
    return NextResponse.json({ error: 'Failed to update leaderboard' }, { status: 500 })
  }
}
