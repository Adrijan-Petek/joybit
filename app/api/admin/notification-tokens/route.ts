import { NextRequest, NextResponse } from 'next/server'
import { notificationTokens } from '../../../../lib/notificationStore'

/**
 * API endpoint to get all notification tokens (admin only)
 * Used by the admin panel to display notification statistics
 */
export async function GET(request: NextRequest) {
  try {
    // In a production app, you'd want to add proper authentication here
    // For now, we'll just return the data

    const allTokens = await notificationTokens.getAll()
    const enabledCount = await notificationTokens.getEnabledCount()
    const totalCount = await notificationTokens.size()

    // Return summary stats and token list (without sensitive token details)
    const summaryTokens = allTokens.map(token => ({
      fid: token.fid,
      enabled: token.enabled,
      hasToken: Boolean(token.token && token.url),
      created_at: token.created_at,
      updated_at: token.updated_at
    }))

    return NextResponse.json({
      success: true,
      stats: {
        total: totalCount,
        enabled: enabledCount,
        disabled: totalCount - enabledCount
      },
      tokens: summaryTokens
    })

  } catch (error) {
    console.error('Error fetching notification tokens:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * API endpoint to manually add/update notification tokens (admin only)
 * Useful for debugging or when webhook fails
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fid, token, url, enabled = true } = body

    if (!fid || typeof fid !== 'number') {
      return NextResponse.json(
        { error: 'Valid FID is required' },
        { status: 400 }
      )
    }

    await notificationTokens.set(fid, {
      token: token || '',
      url: url || '',
      enabled: Boolean(enabled)
    })

    console.log(`✅ Manually ${token ? 'updated' : 'marked enabled'} notification token for FID ${fid}`)

    return NextResponse.json({
      success: true,
      message: `Notification token ${token ? 'updated' : 'marked enabled'} for FID ${fid}`
    })

  } catch (error) {
    console.error('Error setting notification token:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}