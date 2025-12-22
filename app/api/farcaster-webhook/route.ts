import { NextRequest, NextResponse } from 'next/server'
import { notificationTokens } from '../../../lib/notificationStore'

/**
 * Webhook endpoint for Farcaster Mini App events
 * Receives events when users add/remove the app or enable/disable notifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Log the event for monitoring
    console.log('🎣 Farcaster webhook event received:', JSON.stringify(body, null, 2))

    // Extract event type
    const eventData = body.payload ? JSON.parse(Buffer.from(body.payload, 'base64url').toString()) : {}
    const eventType = eventData.event

    console.log('📋 Event type:', eventType)
    console.log('📋 Event data:', JSON.stringify(eventData, null, 2))

    // Extract FID from header (decode base64url)
    const headerData = JSON.parse(Buffer.from(body.header, 'base64url').toString())
    const fid = headerData.fid

    console.log('👤 FID:', fid)

    // Handle different event types
    switch (eventType) {
      case 'miniapp_added':
        console.log(`User ${fid} added the Mini App!`)
        console.log('Notification details:', eventData.notificationDetails)
        
        // When user adds the mini app, automatically enable notifications
        // (user agrees to notifications by adding the app)
        if (eventData.notificationDetails) {
          await notificationTokens.set(fid, {
            token: eventData.notificationDetails.token,
            url: eventData.notificationDetails.url,
            enabled: true
          })
          console.log(`Stored notification token for FID ${fid} (auto-enabled on app add)`)
        } else {
          console.log(`No notification details provided for FID ${fid} - user needs to enable notifications in Farcaster client`)
          // Don't store empty tokens - wait for notifications_enabled event
        }
        break

      case 'miniapp_removed':
        console.log(`User ${fid} removed the Mini App`)
        // Remove notification token from store
        await notificationTokens.delete(fid)
        break

      case 'notifications_enabled':
        console.log(`User ${fid} enabled notifications`)
        console.log('Notification details:', eventData.notificationDetails)
        
        // Update notification token in store (or create if doesn't exist)
        if (eventData.notificationDetails) {
          await notificationTokens.set(fid, {
            token: eventData.notificationDetails.token,
            url: eventData.notificationDetails.url,
            enabled: true
          })
          console.log(`Updated notification token for FID ${fid}`)
        }
        break

      case 'notifications_disabled':
        console.log(`User ${fid} disabled notifications`)
        // Mark notifications as disabled in store
        const existingToken = await notificationTokens.get(fid)
        if (existingToken) {
          existingToken.enabled = false
          await notificationTokens.set(fid, existingToken)
        }
        break

      default:
        console.log('Unknown event type:', eventType)
    }

    // Return 200 OK to acknowledge receipt
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error processing Farcaster webhook:', error)
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
    message: 'Farcaster webhook endpoint is ready',
    storedTokens
  })
}
