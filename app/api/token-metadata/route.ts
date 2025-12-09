import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const REDIS_KEY = 'token:metadata'

export async function GET() {
  try {
    console.log('🔍 API: Getting token metadata from Redis...')
    const tokenMetadata = await redis.get(REDIS_KEY) as Record<string, { image: string; symbol: string }> | null
    console.log('✅ API: Token metadata retrieved:', tokenMetadata)
    return NextResponse.json(tokenMetadata || {})
  } catch (error) {
    console.error('❌ API: Error fetching token metadata:', error)
    return NextResponse.json({}, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address, image, symbol } = body
    console.log('📝 API: Saving token metadata:', { address, image, symbol })

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 })
    }

    // Get current metadata
    const currentMetadata = await redis.get(REDIS_KEY) as Record<string, { image: string; symbol: string }> | null
    console.log('📦 API: Current metadata in Redis:', currentMetadata)
    
    const tokenMetadata = currentMetadata || {}

    // Update with new token
    tokenMetadata[address.toLowerCase()] = {
      image: image || '',
      symbol: symbol || 'TOKEN'
    }

    console.log('💾 API: Saving updated metadata to Redis:', tokenMetadata)
    // Save back to Redis
    await redis.set(REDIS_KEY, tokenMetadata)
    
    // Verify it was saved
    const verified = await redis.get(REDIS_KEY)
    console.log('✅ API: Verified saved data:', verified)

    return NextResponse.json({ success: true, data: tokenMetadata })
  } catch (error) {
    console.error('❌ API: Error saving token metadata:', error)
    return NextResponse.json({ error: 'Failed to save token metadata' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 })
    }

    // Get current metadata
    const tokenMetadata = await redis.get(REDIS_KEY) as Record<string, { image: string; symbol: string }> | null || {}

    // Remove token
    delete tokenMetadata[address.toLowerCase()]

    // Save back to Redis
    await redis.set(REDIS_KEY, tokenMetadata)

    return NextResponse.json({ success: true, data: tokenMetadata })
  } catch (error) {
    console.error('Error deleting token metadata:', error)
    return NextResponse.json({ error: 'Failed to delete token metadata' }, { status: 500 })
  }
}
