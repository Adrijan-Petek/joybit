import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// GET leaderboard
export async function GET() {
  try {
    console.log('Fetching leaderboard from Upstash...')
    console.log('Redis URL:', process.env.UPSTASH_REDIS_REST_URL ? 'Set' : 'Missing')
    console.log('Redis Token:', process.env.UPSTASH_REDIS_REST_TOKEN ? 'Set' : 'Missing')
    
    // Get all leaderboard entries (sorted by score descending)
    const leaderboard = await redis.zrange('leaderboard', 0, 99, {
      rev: true,
      withScores: true
    })

    console.log('Leaderboard raw data:', leaderboard)

    // Format the data
    const formatted = []
    for (let i = 0; i < leaderboard.length; i += 2) {
      const address = leaderboard[i] as string
      const score = leaderboard[i + 1] as number
      
      // Get user data
      const userData = await redis.hgetall(`leaderboard:user:${address}`) || {}
      
      formatted.push({
        address,
        score: Math.floor(score),
        username: userData.username,
        pfp: userData.pfp
      })
    }

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

    // Only update if new score is higher
    const currentScore = await redis.zscore('leaderboard', address) || 0
    
    if (score > currentScore) {
      await redis.zadd('leaderboard', { score, member: address })
    }
    
    // Always store user data if provided
    if (username || pfp) {
      const userData: any = {}
      if (username) userData.username = username
      if (pfp) userData.pfp = pfp
      await redis.hset(`leaderboard:user:${address}`, userData)
    }

    return NextResponse.json({ success: true, updated: score > currentScore })
  } catch (error) {
    console.error('Error updating leaderboard:', error)
    return NextResponse.json({ error: 'Failed to update leaderboard' }, { status: 500 })
  }
}
