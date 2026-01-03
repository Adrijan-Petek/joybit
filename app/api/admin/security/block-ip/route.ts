import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

// POST /api/admin/security/block-ip - Block an IP address
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ip, reason } = body

    if (!ip) {
      return NextResponse.json({ error: 'IP address is required' }, { status: 400 })
    }

    // Validate IP address format (basic validation)
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    if (!ipRegex.test(ip)) {
      return NextResponse.json({ error: 'Invalid IP address format' }, { status: 400 })
    }

    // Check if IP is already blocked
    const existing = await client.execute(`
      SELECT id FROM blocked_ips WHERE ip = ?
    `, [ip])

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'IP address is already blocked' }, { status: 409 })
    }

    // Block the IP
    await client.execute(`
      INSERT INTO blocked_ips (ip, reason, blocked_by)
      VALUES (?, ?, ?)
    `, [ip, reason || 'Blocked via admin panel', 'admin'])

    // Log the security action
    await client.execute(`
      INSERT INTO security_logs (action, type, ip, user, details)
      VALUES (?, ?, ?, ?, ?)
    `, [
      `IP Blocked: ${ip}`,
      'ip_block',
      ip,
      'admin',
      JSON.stringify({
        action: 'block_ip',
        reason: reason || 'Blocked via admin panel',
        timestamp: new Date().toISOString()
      })
    ])

    console.log(`🚫 API: IP ${ip} has been blocked`)
    return NextResponse.json({ success: true, message: `IP ${ip} has been blocked` })
  } catch (error) {
    console.error('❌ API: Error blocking IP:', error)
    return NextResponse.json({ error: 'Failed to block IP address' }, { status: 500 })
  }
}