import { NextRequest, NextResponse } from 'next/server'
import { notificationTokens } from '../../../lib/notificationStore'

interface CreateScheduledNotificationRequest {
  fid?: number // null for broadcast
  title: string
  body: string
  targetUrl?: string
  scheduledTime: string // ISO date string
  isRecurring?: boolean
  recurrencePattern?: 'daily' | 'weekly' | 'monthly'
}

/**
 * API endpoint to manage scheduled notifications
 */
export async function GET(request: NextRequest) {
  try {
    const scheduledNotifications = await notificationTokens.getScheduledNotifications()

    return NextResponse.json({
      success: true,
      notifications: scheduledNotifications
    })
  } catch (error) {
    console.error('Error fetching scheduled notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateScheduledNotificationRequest = await request.json()
    const { fid, title, body: notificationBody, targetUrl, scheduledTime, isRecurring, recurrencePattern } = body

    // Validate required fields
    if (!title || !notificationBody || !scheduledTime) {
      return NextResponse.json(
        { error: 'Missing required fields: title, body, scheduledTime' },
        { status: 400 }
      )
    }

    // Validate scheduled time is in the future
    const scheduledDate = new Date(scheduledTime)
    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: 'Scheduled time must be in the future' },
        { status: 400 }
      )
    }

    // Validate recurrence pattern if recurring
    if (isRecurring && recurrencePattern && !['daily', 'weekly', 'monthly'].includes(recurrencePattern)) {
      return NextResponse.json(
        { error: 'Invalid recurrence pattern. Must be: daily, weekly, or monthly' },
        { status: 400 }
      )
    }

    const id = await notificationTokens.createScheduledNotification({
      fid,
      title,
      body: notificationBody,
      targetUrl,
      scheduledTime,
      isRecurring: isRecurring || false,
      recurrencePattern,
      enabled: true
    })

    return NextResponse.json({
      success: true,
      id,
      message: 'Scheduled notification created successfully'
    })
  } catch (error) {
    console.error('Error creating scheduled notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Missing notification ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { enabled, scheduledTime } = body

    // Validate scheduled time if provided
    if (scheduledTime) {
      const scheduledDate = new Date(scheduledTime)
      if (scheduledDate <= new Date()) {
        return NextResponse.json(
          { error: 'Scheduled time must be in the future' },
          { status: 400 }
        )
      }
    }

    await notificationTokens.updateScheduledNotification(parseInt(id), {
      enabled,
      scheduledTime
    })

    return NextResponse.json({
      success: true,
      message: 'Scheduled notification updated successfully'
    })
  } catch (error) {
    console.error('Error updating scheduled notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Missing notification ID' },
        { status: 400 }
      )
    }

    await notificationTokens.deleteScheduledNotification(parseInt(id))

    return NextResponse.json({
      success: true,
      message: 'Scheduled notification deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting scheduled notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}