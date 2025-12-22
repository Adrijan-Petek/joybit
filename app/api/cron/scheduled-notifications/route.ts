import { NextRequest, NextResponse } from 'next/server'
import { notificationTokens } from '../../../../lib/notificationStore'

/**
 * Cron job endpoint to process scheduled notifications
 * This should be called periodically (e.g., every minute) via Vercel Cron
 */
export async function GET(request: NextRequest) {
  try {
    console.log('⏰ Processing scheduled notifications...')

    // Get all due notifications
    const dueNotifications = await notificationTokens.getDueNotifications()
    console.log(`📅 Found ${dueNotifications.length} due notifications`)

    let processedCount = 0
    let successCount = 0
    let failureCount = 0

    for (const notification of dueNotifications) {
      try {
        console.log(`📤 Processing scheduled notification ${notification.id}: ${notification.title}`)

        // Send the notification
        const notificationId = `scheduled-${notification.id}-${Date.now()}`
        const notificationPayload = {
          notificationId,
          title: notification.title,
          body: notification.body,
          targetUrl: notification.targetUrl || 'https://joybit.vercel.app'
        }

        if (notification.fid) {
          // Send to specific user
          const userToken = await notificationTokens.get(notification.fid)
          if (!userToken || !userToken.enabled || !userToken.token || !userToken.url) {
            console.log(`❌ User ${notification.fid} not available for notifications`)
            failureCount++
            continue
          }

          const notificationPayloadWithToken = {
            ...notificationPayload,
            tokens: [userToken.token]
          }

          const response = await fetch(userToken.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(notificationPayloadWithToken)
          })

          if (response.ok) {
            console.log(`✅ Sent scheduled notification to FID ${notification.fid}`)
            successCount++
          } else {
            console.log(`❌ Failed to send to FID ${notification.fid}: ${response.status}`)
            failureCount++
          }
        } else {
          // Send to all enabled users (broadcast)
          const allTokens = await notificationTokens.getAll()
          const enabledTokens = allTokens.filter(token => token.enabled && token.token && token.url)

          console.log(`📢 Broadcasting to ${enabledTokens.length} users`)

          for (const userToken of enabledTokens) {
            try {
            const notificationPayloadWithToken = {
              ...notificationPayload,
              tokens: [userToken.token]
            }

            const response = await fetch(userToken.url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(notificationPayloadWithToken)
            })

              if (response.ok) {
                successCount++
              } else {
                failureCount++
              }
            } catch (error) {
              console.error(`❌ Error sending to FID ${userToken.fid}:`, error)
              failureCount++
            }
          }
        }

        // Mark as sent and reschedule if recurring
        if (notification.isRecurring) {
          await notificationTokens.rescheduleRecurringNotification(notification.id!)
        } else {
          // Disable one-time notifications after sending
          await notificationTokens.updateScheduledNotification(notification.id!, {
            enabled: false,
            lastSent: new Date().toISOString()
          })
        }

        processedCount++
      } catch (error) {
        console.error(`❌ Error processing notification ${notification.id}:`, error)
        failureCount++
      }
    }

    console.log(`✅ Cron job complete: ${processedCount} processed, ${successCount} successful, ${failureCount} failed`)

    return NextResponse.json({
      success: true,
      processed: processedCount,
      successful: successCount,
      failed: failureCount,
      message: 'Scheduled notifications processed'
    })
  } catch (error) {
    console.error('❌ Error in scheduled notifications cron:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Only allow GET requests for cron jobs
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}