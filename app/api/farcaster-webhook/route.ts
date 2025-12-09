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
    console.log('Farcaster webhook event received:', body)

    // Extract event type
    const eventData = body.payload ? JSON.parse(Buffer.from(body.payload, 'base64url').toString()) : {}
    const eventType = eventData.event

    // Extract FID from header (decode base64url)
    const headerData = JSON.parse(Buffer.from(body.header, 'base64url').toString())
    const fid = headerData.fid

    // Handle different event types
    switch (eventType) {
      case 'miniapp_added':
        console.log(`User ${fid} added the Mini App!`)
        console.log('Notification details:', eventData.notificationDetails)
        
        // When user adds the mini app, automatically enable notifications
        // (user agrees to notifications by adding the app)
        if (eventData.notificationDetails) {
          notificationTokens.set(fid, {
            token: eventData.notificationDetails.token,
            url: eventData.notificationDetails.url,
            enabled: true
          })
          console.log(`Stored notification token for FID ${fid} (auto-enabled on app add)`)
        } else {
          // No notification details provided yet, but mark as enabled
          // Token details will be provided later when notifications are actually enabled
          notificationTokens.set(fid, {
            token: '', // Will be filled later
            url: '', // Will be filled later
            enabled: true
          })
          console.log(`Marked notifications as enabled for FID ${fid} (awaiting token details)`)
        }
        break

      case 'miniapp_removed':
        console.log(`User ${fid} removed the Mini App`)
        // Remove notification token from store
        notificationTokens.delete(fid)
        break

      case 'notifications_enabled':
        console.log(`User ${fid} enabled notifications`)
        console.log('Notification details:', eventData.notificationDetails)
        
        // Update notification token in store (or create if doesn't exist)
        if (eventData.notificationDetails) {
          const existingEntry = notificationTokens.get(fid)
          notificationTokens.set(fid, {
            token: eventData.notificationDetails.token,
            url: eventData.notificationDetails.url,
            enabled: true
          })
          if (existingEntry) {
            console.log(`Updated notification token for FID ${fid}`)
          } else {
            console.log(`Created notification token for FID ${fid}`)
          }
        }
        break

      case 'notifications_disabled':
        console.log(`User ${fid} disabled notifications`)
        // Mark notifications as disabled in store
        const existingToken = notificationTokens.get(fid)
        if (existingToken) {
          existingToken.enabled = false
          notificationTokens.set(fid, existingToken)
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
  return NextResponse.json({ 
    status: 'ok',
    message: 'Farcaster webhook endpoint is ready',
    storedTokens: notificationTokens.size
  })
}
