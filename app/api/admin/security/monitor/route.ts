import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

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

// POST /api/admin/security/monitor - Monitor and detect security threats
export async function POST(request: NextRequest) {
  try {
    const { input, context, userId } = await request.json()
    const clientIP = getClientIP(request)

    if (!input) {
      return NextResponse.json({ threat: false })
    }

    let detectedThreats: string[] = []

    // Check for SQL injection
    if (detectSecurityThreat(input, 'sql_injection')) {
      detectedThreats.push('sql_injection')
    }

    // Check for XSS
    if (detectSecurityThreat(input, 'xss')) {
      detectedThreats.push('xss')
    }

    // Check for other suspicious patterns
    if (detectSecurityThreat(input, 'suspicious')) {
      detectedThreats.push('suspicious')
    }

    // If threats detected, log them
    if (detectedThreats.length > 0) {
      for (const threatType of detectedThreats) {
        const severity = threatType === 'sql_injection' ? 'high' :
                        threatType === 'xss' ? 'high' : 'medium'

        // Insert security alert
        await client.execute(`
          INSERT INTO security_alerts (type, severity, ip, details, resolved)
          VALUES (?, ?, ?, ?, FALSE)
        `, [threatType, severity, clientIP, `Detected in ${context}: ${input.substring(0, 100)}...`])

        // Log the security event
        await client.execute(`
          INSERT INTO security_logs (action, type, ip, user, details)
          VALUES (?, ?, ?, ?, ?)
        `, [
          'Security Threat Detected',
          threatType,
          clientIP,
          userId || 'anonymous',
          `${threatType.toUpperCase()} detected in ${context}`
        ])

        console.log(`🚨 SECURITY ALERT: ${threatType.toUpperCase()} detected from IP ${clientIP} in ${context}`)
      }

      return NextResponse.json({
        threat: true,
        types: detectedThreats,
        severity: detectedThreats.includes('sql_injection') || detectedThreats.includes('xss') ? 'high' : 'medium'
      })
    }

    return NextResponse.json({ threat: false })
  } catch (error) {
    console.error('❌ API: Error in security monitoring:', error)
    return NextResponse.json({ threat: false, error: 'Monitoring failed' }, { status: 500 })
  }
}