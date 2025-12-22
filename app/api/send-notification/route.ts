import { NextRequest, NextResponse } from 'next/server'
import { notificationTokens, NotificationToken } from '../../../lib/notificationStore'

interface SendNotificationRequest {
  fid?: number
  sendToAll?: boolean
  title: string
  body: string
  targetUrl?: string
  notificationId?: string
}

/**
 * API endpoint to send notifications to Farcaster users
 * Called from client-side notification functions
 */
export async function POST(request: NextRequest) {
  try {
    const body: SendNotificationRequest = await request.json()
    const { fid, sendToAll, title, body: notificationBody, targetUrl, notificationId } = body

    console.log('📨 Send notification request:', { fid, sendToAll, title, targetUrl })

    // Validate required fields
    if (!title || !notificationBody) {
      console.error('❌ Missing required fields:', { title: !!title, body: !!notificationBody })
      return NextResponse.json(
        { error: 'Missing required fields: title, body' },
        { status: 400 }
      )
    }

    // Validate that either fid or sendToAll is provided
    if (!fid && !sendToAll) {
      console.error('❌ Must provide either fid or sendToAll')
      return NextResponse.json(
        { error: 'Must provide either fid or sendToAll parameter' },
        { status: 400 }
      )
    }

    if (fid && sendToAll) {
      console.error('❌ Cannot provide both fid and sendToAll')
      return NextResponse.json(
        { error: 'Cannot provide both fid and sendToAll parameters' },
        { status: 400 }
      )
    }

    let usersToNotify: NotificationToken[] = []

    if (sendToAll) {
      // Get all enabled notification tokens
      const allTokens = await notificationTokens.getAll()
      usersToNotify = allTokens.filter(token => token.enabled && token.token && token.url && token.token.trim() !== '')
      console.log(`📢 Sending to all users: ${usersToNotify.length} enabled users with valid tokens found`)
    } else {
      // Get notification token for specific user
      const userToken = await notificationTokens.get(fid!)
      console.log('🔍 User token lookup result:', { found: !!userToken, enabled: userToken?.enabled, hasToken: !!userToken?.token, hasUrl: !!userToken?.url, tokenLength: userToken?.token?.length })

      if (!userToken || !userToken.enabled) {
        console.log(`❌ No notification token found or notifications disabled for FID ${fid}`)
        return NextResponse.json(
          { error: 'User has not enabled notifications' },
          { status: 404 }
        )
      }

      // Check if we have the required token details
      if (!userToken.token || !userToken.url || userToken.token.trim() === '') {
        console.log(`❌ Notification token details not yet available for FID ${fid} (notifications enabled but awaiting token from Farcaster)`)
        console.log(`   Token value: "${userToken.token}" (length: ${userToken.token?.length || 0})`)
        console.log(`   URL value: "${userToken.url}"`)
        return NextResponse.json(
          { error: 'Notification details not yet available - user needs to enable notifications in Farcaster client' },
          { status: 404 }
        )
      }

      usersToNotify = [userToken]
    }

    if (usersToNotify.length === 0) {
      return NextResponse.json(
        { error: sendToAll ? 'No users have enabled notifications' : 'User has not enabled notifications' },
        { status: 404 }
      )
    }

    // Prepare notification payload
    const baseNotificationId = notificationId || `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Send notifications to all target users
    const results = []
    let successCount = 0
    let failureCount = 0

    for (let i = 0; i < usersToNotify.length; i++) {
      const userToken = usersToNotify[i]
      const userNotificationId = sendToAll ? `${baseNotificationId}-${userToken.fid}` : baseNotificationId

      const notificationPayload = {
        notificationId: userNotificationId,
        title,
        body: notificationBody,
        targetUrl: targetUrl || 'https://joybit.vercel.app',
        tokens: [userToken.token]
      }

      console.log(`📤 Sending to ${userToken.url} with payload:`, JSON.stringify(notificationPayload, null, 2))
      console.log(`   Token being used: "${userToken.token}" (length: ${userToken.token.length})`)

      try {
        console.log(`📤 Sending notification to FID ${userToken.fid}...`)

        // Send notification to Farcaster
        const response = await fetch(userToken.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken.token}`
          },
          body: JSON.stringify(notificationPayload)
        })

        console.log(`📥 Response status: ${response.status}`)
        const responseText = await response.text()
        console.log(`📥 Response body: ${responseText}`)

        if (response.ok) {
          let result
          try {
            result = JSON.parse(responseText)
          } catch (parseError) {
            result = { message: responseText }
          }
          console.log(`✅ Notification sent successfully to FID ${userToken.fid}`)
          results.push({
            fid: userToken.fid,
            success: true,
            result,
            notificationId: userNotificationId
          })
          successCount++
        } else {
          console.error(`❌ Failed to send notification to FID ${userToken.fid}:`, response.status, responseText)
          results.push({
            fid: userToken.fid,
            success: false,
            error: `HTTP ${response.status}: ${responseText}`,
            notificationId: userNotificationId
          })
          failureCount++
        }
      } catch (error) {
        console.error(`❌ Error sending notification to FID ${userToken.fid}:`, error)
        results.push({
          fid: userToken.fid,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          notificationId: userNotificationId
        })
        failureCount++
      }
    }

    console.log(`📊 Notification batch complete: ${successCount} successful, ${failureCount} failed`)

    return NextResponse.json({
      success: failureCount === 0,
      totalUsers: usersToNotify.length,
      successCount,
      failureCount,
      results: sendToAll ? results : results[0], // Return array for sendToAll, single result for individual
      notificationId: baseNotificationId
    })

  } catch (error) {
    console.error('Error sending notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  const storedTokens = await notificationTokens.size()
  return NextResponse.json({
    status: 'ok',
    message: 'Send notification endpoint is ready',
    storedTokens
  })
}