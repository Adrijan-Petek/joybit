import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

// Initialize database tables
async function initTables() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS leaderboard_users (
      address TEXT PRIMARY KEY,
      username TEXT,
      pfp TEXT
    )
  `)
}

// Call init on module load
initTables().catch(console.error)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 })
    }

    // Normalize address
    const normalizedAddress = address.toLowerCase()

    // Check if user profile exists (don't generate new ones)
    const result = await client.execute({
      sql: 'SELECT username, pfp FROM leaderboard_users WHERE LOWER(address) = ?',
      args: [normalizedAddress]
    })

    let username = null
    let avatar = null

    if (result.rows.length > 0) {
      username = result.rows[0].username as string
      avatar = result.rows[0].pfp as string
    }

    // Don't generate profiles here - only return existing ones
    return NextResponse.json({
      username,
      avatar
    })
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json({
      error: 'Failed to fetch user profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}