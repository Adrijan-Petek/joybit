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
      // Normalize address for lookup
      const normalizedAddress = address.toLowerCase()
      
      const result = await client.execute({
        sql: 'SELECT ls.score, lu.username, lu.pfp FROM leaderboard_scores ls LEFT JOIN leaderboard_users lu ON ls.address = lu.address WHERE LOWER(ls.address) = ?',
        args: [normalizedAddress]
      })
      
      const currentScore = result.rows.length > 0 ? result.rows[0].score as number : 0
      const username = result.rows.length > 0 ? result.rows[0].username as string : null
      const pfp = result.rows.length > 0 ? result.rows[0].pfp as string : null
      
      return NextResponse.json({ 
        currentScore,
        username: username || undefined,
        pfp: pfp || undefined
      })
    }

    console.log('Fetching leaderboard from Turso...')
    console.log('Turso URL:', process.env.TURSO_DATABASE_URL ? 'Set' : 'Missing')
    console.log('Turso Token:', process.env.TURSO_AUTH_TOKEN ? 'Set' : 'Missing')
    
    // Get all users from leaderboard_scores table with their data
    // Ensure no duplicates by grouping and getting the highest score per address
    const allUsersResult = await client.execute(`
      SELECT 
        ls.address, 
        MAX(ls.score) as score, 
        lu.username, 
        lu.pfp 
      FROM leaderboard_scores ls 
      LEFT JOIN leaderboard_users lu ON LOWER(ls.address) = LOWER(lu.address) 
      WHERE ls.score > 0
      GROUP BY LOWER(ls.address), lu.username, lu.pfp
      ORDER BY score DESC
      LIMIT 50
    `)

    const leaderboard = allUsersResult.rows.map(row => ({
      address: row.address as string,
      score: row.score as number,
      username: (row.username as string) || undefined,
      pfp: (row.pfp as string) || undefined
    }))

    console.log('Leaderboard fetched:', leaderboard.length, 'unique entries')
    console.log('Top 5 entries:', leaderboard.slice(0, 5).map((entry, index) => 
      `${index + 1}. ${entry.username || entry.address.slice(0, 8)}...: ${entry.score}`
    ))
    
    return NextResponse.json({ leaderboard })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch leaderboard',
      details: error instanceof Error ? error.message : 'Unknown error',
      leaderboard: []
    }, { status: 500 })
  }
}

// POST update score or recalculate all scores
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address, score, username, pfp, action } = body

    // Handle recalculate action
    if (action === 'recalculate') {
      console.log('🔄 Recalculating all leaderboard scores...')
      const { calculateUserScore } = await import('@/lib/db/achievements')
      
      // First, clean up any duplicate entries
      console.log('🧹 Cleaning up duplicate leaderboard entries...')
      await client.execute(`
        DELETE FROM leaderboard_scores 
        WHERE rowid NOT IN (
          SELECT MIN(rowid) 
          FROM leaderboard_scores 
          GROUP BY LOWER(address)
        )
      `)
      
      // Get all unique addresses from user_stats
      const allUsersResult = await client.execute(`
        SELECT DISTINCT user_address FROM user_stats
      `)
      
      let recalculated = 0
      for (const row of allUsersResult.rows) {
        const userAddress = row.user_address as string
        const newScore = await calculateUserScore(userAddress)
        
        await client.execute({
          sql: 'INSERT OR REPLACE INTO leaderboard_scores (address, score) VALUES (?, ?)',
          args: [userAddress.toLowerCase(), newScore]
        })
        
        recalculated++
      }
      
      console.log(`✅ Recalculated ${recalculated} user scores and cleaned up duplicates`)
      return NextResponse.json({ success: true, recalculated })
    }

    if (!address || typeof score !== 'number') {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    // Normalize address to lowercase to avoid duplicates
    const normalizedAddress = address.toLowerCase()

    // Clean up any existing duplicate entries for this address
    await client.execute({
      sql: 'DELETE FROM leaderboard_scores WHERE LOWER(address) = ? AND address != ?',
      args: [normalizedAddress, normalizedAddress]
    })

    // Update or insert the score
    await client.execute({
      sql: 'INSERT OR REPLACE INTO leaderboard_scores (address, score) VALUES (?, ?)',
      args: [normalizedAddress, score]
    })
    
    // Always store user data if provided (also normalized)
    if (username !== undefined || pfp !== undefined) {
      // Clean up any existing duplicate user entries
      await client.execute({
        sql: 'DELETE FROM leaderboard_users WHERE LOWER(address) = ? AND address != ?',
        args: [normalizedAddress, normalizedAddress]
      })
      
      await client.execute({
        sql: 'INSERT OR REPLACE INTO leaderboard_users (address, username, pfp) VALUES (?, ?, ?)',
        args: [normalizedAddress, username || null, pfp || null]
      })
    }

    return NextResponse.json({ success: true, updated: true })
  } catch (error) {
    console.error('Error updating leaderboard:', error)
    return NextResponse.json({ error: 'Failed to update leaderboard' }, { status: 500 })
  }
}
