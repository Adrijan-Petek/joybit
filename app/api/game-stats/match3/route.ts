import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'
import { updateUserStats, checkAndUnlockAchievements } from '@/lib/db/achievements'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

// Initialize database table
async function initTable() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS match3_stats (
      address TEXT PRIMARY KEY,
      data TEXT NOT NULL
    )
  `)
}

// Call init on module load
initTable().catch(console.error)

interface Match3Stats {
  gamesPlayed: number
  highScore: number
  highScoreLevel: number
  lastPlayed: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 })
    }

    console.log('🔍 API: Getting Match3 stats for:', address)
    const result = await client.execute({
      sql: 'SELECT data FROM match3_stats WHERE address = ?',
      args: [address.toLowerCase()]
    })

    let stats: Match3Stats | null = null
    if (result.rows.length > 0) {
      stats = JSON.parse(result.rows[0].data as string)
    }

    const defaultStats: Match3Stats = {
      gamesPlayed: 0,
      highScore: 0,
      highScoreLevel: 0,
      lastPlayed: Date.now()
    }

    console.log('✅ API: Match3 stats retrieved:', stats || defaultStats)
    return NextResponse.json(stats || defaultStats)
  } catch (error) {
    console.error('❌ API: Error fetching Match3 stats:', error)
    return NextResponse.json({
      gamesPlayed: 0,
      highScore: 0,
      highScoreLevel: 0,
      lastPlayed: Date.now()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address, score, level, gamesPlayed } = body

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 })
    }

    console.log('📝 API: Saving Match3 stats:', { address, score, level, gamesPlayed })

    // Get current stats
    const result = await client.execute({
      sql: 'SELECT data FROM match3_stats WHERE address = ?',
      args: [address.toLowerCase()]
    })

    let stats: Match3Stats
    if (result.rows.length > 0) {
      stats = JSON.parse(result.rows[0].data as string)
    } else {
      stats = {
        gamesPlayed: 0,
        highScore: 0,
        highScoreLevel: 0,
        lastPlayed: Date.now()
      }
    }

    // Update stats
    if (gamesPlayed !== undefined) {
      stats.gamesPlayed = gamesPlayed
    }

    if (score !== undefined && score > stats.highScore) {
      stats.highScore = score
      stats.highScoreLevel = level || 1
    }

    stats.lastPlayed = Date.now()

    console.log('💾 API: Saving updated Match3 stats to Turso:', stats)
    await client.execute({
      sql: 'INSERT OR REPLACE INTO match3_stats (address, data) VALUES (?, ?)',
      args: [address.toLowerCase(), JSON.stringify(stats)]
    })

    // Update user stats in achievements system
    const achievementStats = {
      match3_games_played: stats.gamesPlayed,
      match3_high_score: stats.highScore,
      match3_high_score_level: stats.highScoreLevel
    }

    console.log('🏆 API: Updating achievement stats:', achievementStats)
    await updateUserStats(address.toLowerCase(), achievementStats)

    // Check for new achievements
    console.log('🎯 API: Checking for new achievements...')
    const unlockedAchievements = await checkAndUnlockAchievements(address.toLowerCase())
    console.log('✅ API: New achievements unlocked:', unlockedAchievements)

    return NextResponse.json({ 
      success: true, 
      stats,
      unlockedAchievements 
    })
  } catch (error) {
    console.error('❌ API: Error saving Match3 stats:', error)
    return NextResponse.json({ error: 'Failed to save stats' }, { status: 500 })
  }
}