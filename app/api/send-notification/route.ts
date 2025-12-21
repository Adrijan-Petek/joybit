import { NextRequest, NextResponse } from 'next/server'
import { notificationTokens } from '../../../lib/notificationStore'

interface SendNotificationRequest {
  fid: number
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
    const { fid, title, body: notificationBody, targetUrl, notificationId } = body

    // Validate required fields
    if (!fid || !title || !notificationBody) {
      return NextResponse.json(
        { error: 'Missing required fields: fid, title, body' },
        { status: 400 }
      )
    }

    // Get notification token for this user
    const userToken = notificationTokens.get(fid)
    if (!userToken || !userToken.enabled) {
      console.log(`No notification token found or notifications disabled for FID ${fid}`)
      return NextResponse.json(
        { error: 'User has not enabled notifications' },
        { status: 404 }
      )
    }

    // Check if we have the required token details
    if (!userToken.token || !userToken.url) {
      console.log(`Notification token details not yet available for FID ${fid} (notifications enabled but awaiting token from Farcaster)`)
      return NextResponse.json(
        { error: 'Notification details not yet available - user needs to enable notifications in Farcaster client' },
        { status: 404 }
      )
    }

    // Prepare notification payload
    const notificationPayload = {
      notificationId: notificationId || `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      body: notificationBody,
      targetUrl: targetUrl || 'https://joybit.vercel.app'
    }

    // Send notification to Farcaster
    const response = await fetch(userToken.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken.token}`
      },
      body: JSON.stringify(notificationPayload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to send notification:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to send notification', details: errorText },
        { status: response.status }
      )
    }

    const result = await response.json()
    console.log('✅ Notification sent successfully to FID', fid, ':', title)

    return NextResponse.json({
      success: true,
      result,
      notificationId: notificationPayload.notificationId
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
  return NextResponse.json({
    status: 'ok',
    message: 'Send notification endpoint is ready',
    storedTokens: notificationTokens.size
  })
}