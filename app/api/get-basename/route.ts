import { NextRequest, NextResponse } from 'next/server'
import { getName } from '@coinbase/onchainkit/identity'
import { base } from 'viem/chains'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json({ error: 'Address parameter required' }, { status: 400 })
    }

    console.log(`🔍 Fetching Basename for address: ${address}`)

    // Fetch the basename using OnchainKit
    const basename = await getName({ address: address as `0x${string}`, chain: base })

    if (basename) {
      console.log(`✅ Found Basename: ${basename}`)
      return NextResponse.json({ 
        basename,
        username: basename // Return as username for consistency with existing code
      })
    }

    console.log(`❌ No Basename found for ${address}`)
    return NextResponse.json({ 
      basename: null,
      username: null
    })

  } catch (error) {
    console.error('Error fetching Basename:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch Basename',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
