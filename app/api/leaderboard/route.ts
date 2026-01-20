import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'
import { getAvatar, getName } from '@coinbase/onchainkit/identity'
import { base } from 'viem/chains'

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

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchFarcasterIdentity(address: string): Promise<{ username?: string; pfp?: string } | null> {
  try {
    const response = await fetchWithTimeout(
      `https://api.farcaster.xyz/v2/user-by-verification?address=${address}`,
      2500
    )
    if (!response.ok) return null
    const data = await response.json()
    const user = data?.result?.user
    if (!user) return null
    return {
      username: typeof user.username === 'string' ? user.username : undefined,
      pfp: typeof user.pfp?.url === 'string' ? user.pfp.url : undefined
    }
  } catch {
    return null
  }
}

async function fetchBasename(address: string): Promise<string | null> {
  try {
    const name = await Promise.race([
      getName({ address: address as `0x${string}`, chain: base }),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 2000))
    ])
    return typeof name === 'string' && name.trim().length > 0 ? name : null
  } catch {
    return null
  }
}

async function fetchBasenameAvatar(basename: string): Promise<string | null> {
  try {
    const avatar = await Promise.race([
      getAvatar({ ensName: basename, chain: base }),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 2000))
    ])
    return typeof avatar === 'string' && avatar.trim().length > 0 ? avatar : null
  } catch {
    return null
  }
}

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
    
    // Compute unique scores by normalized address, then join to a unique user row by normalized address.
    const allUsersResult = await client.execute(`
      WITH normalized_scores AS (
        SELECT LOWER(address) AS address, MAX(score) AS score
        FROM leaderboard_scores
        WHERE score > 0
        GROUP BY LOWER(address)
      ),
      normalized_users AS (
        SELECT LOWER(address) AS address,
               MAX(username) AS username,
               MAX(pfp) AS pfp
        FROM leaderboard_users
        GROUP BY LOWER(address)
      )
      SELECT ns.address, ns.score, nu.username, nu.pfp
      FROM normalized_scores ns
      LEFT JOIN normalized_users nu ON ns.address = nu.address
      ORDER BY ns.score DESC
      LIMIT 50
    `)

    // Process leaderboard entries
    const leaderboard = allUsersResult.rows.map(row => ({
      address: row.address as string,
      score: row.score as number,
      username: (row.username as string) || undefined,
      pfp: (row.pfp as string) || undefined
    }))

    // Best-effort: fill missing Farcaster/Basename identity into DB (scores untouched).
    const concurrency = 5
    for (let i = 0; i < leaderboard.length; i += concurrency) {
      const batch = leaderboard.slice(i, i + concurrency)
      await Promise.all(batch.map(async (entry) => {
        let username = entry.username
        let pfp = entry.pfp

        if (username && pfp) return

        const farcaster = await fetchFarcasterIdentity(entry.address)
        if (!username && farcaster?.username) username = farcaster.username
        if (!pfp && farcaster?.pfp) pfp = farcaster.pfp

        let basename: string | null = null
        if (!username || !pfp) {
          basename = await fetchBasename(entry.address)
          if (!username && basename) username = basename
        }

        if (!pfp && basename) {
          pfp = await fetchBasenameAvatar(basename) || undefined
        }

        if (!username && !pfp) return

        // Upsert only missing fields; never overwrite existing identity with null.
        await client.execute({
          sql: `
            INSERT INTO leaderboard_users (address, username, pfp)
            VALUES (?, ?, ?)
            ON CONFLICT(address) DO UPDATE SET
              username = COALESCE(leaderboard_users.username, excluded.username),
              pfp = COALESCE(leaderboard_users.pfp, excluded.pfp)
          `,
          args: [entry.address.toLowerCase(), username || null, pfp || null]
        })

        entry.username = username
        entry.pfp = pfp
      }))
    }

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
