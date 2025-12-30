import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

// GET /api/admin/security/threats - Check for new security threats
export async function GET() {
  try {
    console.log('🔍 API: Checking for security threats...')

    // Get recent alerts (last 5 minutes)
    const recentAlerts = await client.execute(`
      SELECT * FROM security_alerts
      WHERE resolved = FALSE
      AND timestamp >= datetime('now', '-5 minutes')
      ORDER BY timestamp DESC
    `)

    const threats = recentAlerts.rows.map(row => ({
      id: row.id,
      type: row.type,
      severity: row.severity,
      ip: row.ip,
      details: row.details,
      resolved: row.resolved,
      timestamp: row.timestamp
    }))

    console.log(`✅ API: Found ${threats.length} recent threats`)
    return NextResponse.json(threats)
  } catch (error) {
    console.error('❌ API: Error checking for threats:', error)
    return NextResponse.json([], { status: 500 })
  }
}