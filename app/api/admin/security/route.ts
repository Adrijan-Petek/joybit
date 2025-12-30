import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

// Initialize security tables
async function initSecurityTables() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS security_alerts (
      id INTEGER PRIMARY KEY,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      ip TEXT NOT NULL,
      details TEXT,
      resolved BOOLEAN DEFAULT FALSE,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS blocked_ips (
      id INTEGER PRIMARY KEY,
      ip TEXT UNIQUE NOT NULL,
      reason TEXT,
      blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      blocked_by TEXT
    )
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS security_logs (
      id INTEGER PRIMARY KEY,
      action TEXT NOT NULL,
      type TEXT NOT NULL,
      ip TEXT,
      user TEXT,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS security_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      max_requests_per_minute INTEGER DEFAULT 60,
      max_requests_per_hour INTEGER DEFAULT 1000,
      block_duration_minutes INTEGER DEFAULT 15,
      sql_injection_detection BOOLEAN DEFAULT TRUE,
      xss_detection BOOLEAN DEFAULT TRUE,
      csrf_protection BOOLEAN DEFAULT TRUE,
      input_validation BOOLEAN DEFAULT TRUE,
      session_monitoring BOOLEAN DEFAULT TRUE,
      audit_logging BOOLEAN DEFAULT TRUE,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Insert default settings if not exists
  await client.execute(`
    INSERT OR IGNORE INTO security_settings (id, max_requests_per_minute, max_requests_per_hour, block_duration_minutes,
      sql_injection_detection, xss_detection, csrf_protection, input_validation, session_monitoring, audit_logging)
    VALUES (1, 60, 1000, 15, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)
  `)
}

// Call init on module load
initSecurityTables().catch(console.error)

// Security patterns for detection
const SECURITY_PATTERNS = {
  sql_injection: [
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b|\bEXEC\b|\bEXECUTE\b)/i,
    /('|(--)|(#)|(\/\*.*?\*\/)|(;))/i
  ],
  xss: [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>.*?<\/embed>/gi
  ],
  suspicious: [
    /\.\./g,  // Directory traversal
    /%2e%2e/g,  // URL encoded directory traversal
    /eval\(/gi,
    /base64_decode\(/gi,
    /system\(/gi,
    /shell_exec\(/gi,
    /passthru\(/gi,
    /exec\(/gi
  ]
}

// Function to detect security threats
function detectSecurityThreat(input: string, type: 'sql_injection' | 'xss' | 'suspicious'): boolean {
  const patterns = SECURITY_PATTERNS[type]
  return patterns.some(pattern => pattern.test(input))
}

// Function to get client IP
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const clientIP = request.headers.get('x-client-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  if (realIP) {
    return realIP
  }
  if (clientIP) {
    return clientIP
  }

  // Fallback for development
  return '127.0.0.1'
}

// GET /api/admin/security - Get security dashboard data
export async function GET() {
  try {
    console.log('🔒 API: Getting security dashboard data...')

    // Get security alerts
    const alertsResult = await client.execute(`
      SELECT * FROM security_alerts
      WHERE resolved = FALSE
      ORDER BY timestamp DESC
      LIMIT 50
    `)

    // Get blocked IPs
    const blockedIPsResult = await client.execute(`
      SELECT ip FROM blocked_ips
      ORDER BY blocked_at DESC
    `)

    // Get security logs
    const logsResult = await client.execute(`
      SELECT * FROM security_logs
      ORDER BY timestamp DESC
      LIMIT 100
    `)

    // Get security settings
    const settingsResult = await client.execute(`
      SELECT * FROM security_settings WHERE id = 1
    `)

    // Get suspicious activity counts
    const sqlInjectionCount = await client.execute(`
      SELECT COUNT(*) as count FROM security_alerts
      WHERE type = 'sql_injection' AND timestamp >= datetime('now', '-24 hours')
    `)

    const xssCount = await client.execute(`
      SELECT COUNT(*) as count FROM security_alerts
      WHERE type = 'xss' AND timestamp >= datetime('now', '-24 hours')
    `)

    const rateLimitCount = await client.execute(`
      SELECT COUNT(*) as count FROM security_alerts
      WHERE type = 'rate_limit' AND timestamp >= datetime('now', '-24 hours')
    `)

    const authFailureCount = await client.execute(`
      SELECT COUNT(*) as count FROM security_alerts
      WHERE type = 'auth_failure' AND timestamp >= datetime('now', '-24 hours')
    `)

    const settings = settingsResult.rows[0] || {}

    const response = {
      alerts: alertsResult.rows.map(row => ({
        id: row.id,
        type: row.type,
        severity: row.severity,
        ip: row.ip,
        details: row.details,
        resolved: row.resolved,
        timestamp: row.timestamp
      })),
      blockedIPs: blockedIPsResult.rows.map(row => row.ip),
      logs: logsResult.rows.map(row => ({
        id: row.id,
        action: row.action,
        type: row.type,
        ip: row.ip,
        user: row.user,
        details: row.details,
        timestamp: row.timestamp
      })),
      rateLimitSettings: {
        maxRequestsPerMinute: settings.max_requests_per_minute || 60,
        maxRequestsPerHour: settings.max_requests_per_hour || 1000,
        blockDurationMinutes: settings.block_duration_minutes || 15
      },
      suspiciousActivities: {
        sqlInjectionAttempts: sqlInjectionCount.rows[0]?.count || 0,
        xssAttempts: xssCount.rows[0]?.count || 0,
        rateLimitViolations: rateLimitCount.rows[0]?.count || 0,
        failedAuthAttempts: authFailureCount.rows[0]?.count || 0,
        suspiciousIPs: blockedIPsResult.rows.length
      }
    }

    console.log('✅ API: Security dashboard data retrieved')
    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ API: Error fetching security data:', error)
    return NextResponse.json({
      alerts: [],
      blockedIPs: [],
      logs: [],
      rateLimitSettings: { maxRequestsPerMinute: 60, maxRequestsPerHour: 1000, blockDurationMinutes: 15 },
      suspiciousActivities: { sqlInjectionAttempts: 0, xssAttempts: 0, rateLimitViolations: 0, failedAuthAttempts: 0, suspiciousIPs: 0 }
    }, { status: 500 })
  }
}

// POST /api/admin/security/block-ip - Block an IP address
export async function POST(request: NextRequest) {
  try {
    const { ip, reason } = await request.json()

    if (!ip) {
      return NextResponse.json({ error: 'IP address is required' }, { status: 400 })
    }

    // Check if IP is already blocked
    const existing = await client.execute(`
      SELECT id FROM blocked_ips WHERE ip = ?
    `, [ip])

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'IP is already blocked' }, { status: 400 })
    }

    // Block the IP
    await client.execute(`
      INSERT INTO blocked_ips (ip, reason, blocked_by)
      VALUES (?, ?, ?)
    `, [ip, reason || 'Manual block from admin panel', 'admin'])

    // Log the action
    await client.execute(`
      INSERT INTO security_logs (action, type, ip, user, details)
      VALUES (?, ?, ?, ?, ?)
    `, ['IP Blocked', 'ip_block', ip, 'admin', `IP ${ip} blocked manually`])

    console.log(`🚫 API: IP ${ip} blocked`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ API: Error blocking IP:', error)
    return NextResponse.json({ error: 'Failed to block IP' }, { status: 500 })
  }
}