import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

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
    const statsKey = `match3:stats:${address.toLowerCase()}`
    const stats = await redis.get(statsKey) as Match3Stats | null

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

    const statsKey = `match3:stats:${address.toLowerCase()}`

    // Get current stats
    const currentStats = await redis.get(statsKey) as Match3Stats | null

    const stats: Match3Stats = currentStats || {
      gamesPlayed: 0,
      highScore: 0,
      highScoreLevel: 0,
      lastPlayed: Date.now()
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

    console.log('💾 API: Saving updated Match3 stats to Redis:', stats)
    await redis.set(statsKey, stats)

    return NextResponse.json({ success: true, stats })
  } catch (error) {
    console.error('❌ API: Error saving Match3 stats:', error)
    return NextResponse.json({ error: 'Failed to save stats' }, { status: 500 })
  }
}