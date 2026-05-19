import { NextRequest, NextResponse } from 'next/server'
import { getName } from '@coinbase/onchainkit/identity'
import { getAddress, isAddress } from 'viem'
import { base } from 'viem/chains'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address || !isAddress(address)) {
      return NextResponse.json({ error: 'Address parameter required' }, { status: 400 })
    }

    const normalizedAddress = getAddress(address)

    console.log(`🔍 Fetching identity for address: ${normalizedAddress}`)

    // Fetch the basename using OnchainKit
    const nameResult = await getName({ address: normalizedAddress as `0x${string}`, chain: base })
    const basename =
      typeof nameResult === 'string'
        ? nameResult
        : ((nameResult as any)?.name || (nameResult as any)?.basename || null)
    let avatar: string | null = null

    // Try to fetch a Base profile avatar when available.
    try {
      const identityModule = await import('@coinbase/onchainkit/identity')
      const getAvatar = (identityModule as any).getAvatar
      if (typeof getAvatar === 'function') {
        const avatarResult = await getAvatar({ address: normalizedAddress as `0x${string}`, chain: base })
        avatar = typeof avatarResult === 'string' ? avatarResult : ((avatarResult as any)?.url || null)
      }
    } catch {
      avatar = null
    }

    if (basename) {
      console.log(`✅ Found Basename: ${basename}`)
      return NextResponse.json({ 
        basename,
        username: basename,
        avatar,
      }, {
        headers: {
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600'
        }
      })
    }

    console.log(`❌ No Basename found for ${normalizedAddress}`)
    return NextResponse.json({ 
      basename: null,
      username: null,
      avatar,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600'
      }
    })

  } catch (error) {
    console.error('Error fetching Basename:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch Basename',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
