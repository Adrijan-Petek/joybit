import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

// POST /api/admin/security/unblock-ip - Unblock an IP address
export async function POST(request: NextRequest) {
  try {
    const { ip } = await request.json()

    if (!ip) {
      return NextResponse.json({ error: 'IP address is required' }, { status: 400 })
    }

    // Check if IP is blocked
    const existing = await client.execute(`
      SELECT id FROM blocked_ips WHERE ip = ?
    `, [ip])

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'IP is not blocked' }, { status: 400 })
    }

    // Unblock the IP
    await client.execute(`
      DELETE FROM blocked_ips WHERE ip = ?
    `, [ip])

    // Log the action
    await client.execute(`
      INSERT INTO security_logs (action, type, ip, user, details)
      VALUES (?, ?, ?, ?, ?)
    `, ['IP Unblocked', 'ip_block', ip, 'admin', `IP ${ip} unblocked manually`])

    console.log(`✅ API: IP ${ip} unblocked`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ API: Error unblocking IP:', error)
    return NextResponse.json({ error: 'Failed to unblock IP' }, { status: 500 })
  }
}