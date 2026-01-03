import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

// POST /api/admin/security/cheating - Log cheating attempt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, address, details, ip, userAgent } = body

    if (!type || !address) {
      return NextResponse.json({ error: 'Missing required fields: type, address' }, { status: 400 })
    }

    // Log the cheating attempt
    await client.execute(`
      INSERT INTO security_logs (action, type, ip, user, details)
      VALUES (?, ?, ?, ?, ?)
    `, [
      `Cheating Attempt: ${type}`,
      'cheating_attempt',
      ip || 'unknown',
      address,
      JSON.stringify({
        cheating_type: type,
        details: details || 'No additional details',
        user_agent: userAgent || 'unknown',
        timestamp: new Date().toISOString()
      })
    ])

    // Also create a security alert for high-severity cheating attempts
    if (type === 'multiple_claims' || type === 'invalid_score' || type === 'speed_hack') {
      await client.execute(`
        INSERT INTO security_alerts (type, severity, ip, details)
        VALUES (?, ?, ?, ?)
      `, [
        'cheating_detected',
        'high',
        ip || 'unknown',
        `Cheating attempt detected: ${type} by ${address}. Details: ${details || 'N/A'}`
      ])
    }

    console.log(`🚨 API: Cheating attempt logged - ${type} by ${address}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ API: Error logging cheating attempt:', error)
    return NextResponse.json({ error: 'Failed to log cheating attempt' }, { status: 500 })
  }
}

// GET /api/admin/security/cheating - Get cheating logs
export async function GET() {
  try {
    const result = await client.execute(`
      SELECT * FROM security_logs
      WHERE type = 'cheating_attempt'
      ORDER BY timestamp DESC
      LIMIT 100
    `)

    const cheatingLogs = result.rows.map(row => ({
      id: row.id,
      action: row.action,
      type: row.type,
      ip: row.ip,
      user: row.user,
      details: row.details,
      timestamp: row.timestamp
    }))

    return NextResponse.json({ cheatingLogs })
  } catch (error) {
    console.error('❌ API: Error fetching cheating logs:', error)
    return NextResponse.json({ error: 'Failed to fetch cheating logs' }, { status: 500 })
  }
}