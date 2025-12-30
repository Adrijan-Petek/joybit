import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

// PUT /api/admin/security/rate-limit - Update rate limit settings
export async function PUT(request: NextRequest) {
  try {
    const { maxRequestsPerMinute, maxRequestsPerHour, blockDurationMinutes } = await request.json()

    if (typeof maxRequestsPerMinute !== 'number' || typeof maxRequestsPerHour !== 'number' || typeof blockDurationMinutes !== 'number') {
      return NextResponse.json({ error: 'Invalid input parameters' }, { status: 400 })
    }

    // Update rate limit settings
    await client.execute(`
      UPDATE security_settings
      SET max_requests_per_minute = ?, max_requests_per_hour = ?, block_duration_minutes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `, [maxRequestsPerMinute, maxRequestsPerHour, blockDurationMinutes])

    // Log the action
    await client.execute(`
      INSERT INTO security_logs (action, type, user, details)
      VALUES (?, ?, ?, ?)
    `, ['Rate Limit Settings Updated', 'settings_change', 'admin', `Updated to ${maxRequestsPerMinute}/min, ${maxRequestsPerHour}/hour, ${blockDurationMinutes}min block`])

    console.log('✅ API: Rate limit settings updated')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ API: Error updating rate limit settings:', error)
    return NextResponse.json({ error: 'Failed to update rate limit settings' }, { status: 500 })
  }
}