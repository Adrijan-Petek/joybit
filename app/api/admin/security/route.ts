import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'
import { emailService, SecurityAlert } from '@/lib/emailService'

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
      email_notifications BOOLEAN DEFAULT FALSE,
      email_recipient TEXT,
      email_threat_threshold INTEGER DEFAULT 50,
      email_smtp_host TEXT,
      email_smtp_port INTEGER DEFAULT 587,
      email_smtp_user TEXT,
      email_smtp_pass TEXT,
      email_from_address TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Insert default settings if not exists
  await client.execute(`
    INSERT OR IGNORE INTO security_settings (id, max_requests_per_minute, max_requests_per_hour, block_duration_minutes,
      sql_injection_detection, xss_detection, csrf_protection, input_validation, session_monitoring, audit_logging,
      email_notifications, email_threat_threshold)
    VALUES (1, 60, 1000, 15, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, 50)
  `)
}

// Call init on module load
initSecurityTables().catch(console.error)

// Initialize email service if configured
async function initEmailService() {
  try {
    const settingsResult = await client.execute(`
      SELECT email_notifications, email_smtp_host, email_smtp_port, email_smtp_user, email_smtp_pass, email_from_address
      FROM security_settings WHERE id = 1
    `)

    const settings = settingsResult.rows[0]
    if (settings && settings.email_notifications && settings.email_smtp_host) {
      emailService.configure({
        host: String(settings.email_smtp_host),
        port: Number(settings.email_smtp_port) || 587,
        secure: (Number(settings.email_smtp_port) || 587) === 465,
        user: String(settings.email_smtp_user),
        pass: String(settings.email_smtp_pass || ''),
        from: String(settings.email_from_address || settings.email_smtp_user),
      })
      console.log('📧 Email service configured for security notifications')
    }
  } catch (error) {
    console.error('Failed to initialize email service:', error)
  }
}

// Initialize email service
initEmailService().catch(console.error)

// Function to check and send email alerts
async function checkAndSendEmailAlerts(threatCount: number) {
  try {
    const settingsResult = await client.execute(`
      SELECT email_notifications, email_recipient, email_threat_threshold,
             email_smtp_host, email_smtp_port, email_smtp_user, email_smtp_pass, email_from_address
      FROM security_settings WHERE id = 1
    `)

    const settings = settingsResult.rows[0]
    if (!settings || !settings.email_notifications || !settings.email_recipient) {
      return
    }

    const threshold = Number(settings.email_threat_threshold) || 50

    if (threatCount >= threshold) {
      // Check if we already sent an alert recently (within last hour)
      const recentAlert = await client.execute(`
        SELECT id FROM security_logs
        WHERE action = 'email_alert_sent' AND timestamp >= datetime('now', '-1 hour')
        LIMIT 1
      `)

      if (recentAlert.rows.length === 0) {
        // Configure email service if not already configured
        if (!emailService.isConfigured()) {
          emailService.configure({
            host: String(settings.email_smtp_host),
            port: Number(settings.email_smtp_port) || 587,
            secure: (Number(settings.email_smtp_port) || 587) === 465,
            user: String(settings.email_smtp_user),
            pass: String(settings.email_smtp_pass || ''),
            from: String(settings.email_from_address || settings.email_smtp_user),
          })
        }

        // Get the most recent threat for details
        const recentThreat = await client.execute(`
          SELECT type, severity, ip, details, timestamp
          FROM security_alerts
          WHERE resolved = FALSE
          ORDER BY timestamp DESC
          LIMIT 1
        `)

        const threat = recentThreat.rows[0]

        const alert: SecurityAlert = {
          type: String(threat?.type || 'multiple_threats'),
          severity: String(threat?.severity || 'high'),
          ip: String(threat?.ip || 'multiple_sources'),
          details: String(threat?.details || `${threatCount} active security threats detected`),
          timestamp: String(threat?.timestamp || new Date().toISOString()),
          threatCount: threatCount,
        }

        const emailSent = await emailService.sendSecurityAlert(String(settings.email_recipient), alert)

        // Log the email attempt
        await client.execute(`
          INSERT INTO security_logs (action, type, details, timestamp)
          VALUES (?, 'security', ?, ?)
        `, [
          emailSent ? 'email_alert_sent' : 'email_alert_failed',
          `Threat threshold (${threshold}) exceeded. Active threats: ${threatCount}. Email ${emailSent ? 'sent' : 'failed'}`,
          new Date().toISOString()
        ])

        console.log(`📧 Security alert ${emailSent ? 'sent' : 'failed to send'} for ${threatCount} active threats`)
      }
    }
  } catch (error) {
    console.error('Failed to check and send email alerts:', error)
  }
}

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

    // Check for email alerts
    const activeThreatCount = alertsResult.rows.length
    await checkAndSendEmailAlerts(activeThreatCount)

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
      emailSettings: {
        enabled: settings.email_notifications || false,
        recipient: settings.email_recipient || '',
        threatThreshold: settings.email_threat_threshold || 50,
        smtpConfigured: !!(settings.email_smtp_host && settings.email_smtp_user),
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