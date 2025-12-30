import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

// Rate limiting storage (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

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
    /<iframe[^>]*>.*?<\/iframe>/gi
  ]
}

// Function to detect security threats
function detectSecurityThreat(input: string, type: 'sql_injection' | 'xss'): boolean {
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

  return '127.0.0.1'
}

// Function to check rate limiting
async function checkRateLimit(ip: string): Promise<boolean> {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute
  const maxRequests = 60 // 60 requests per minute

  const key = `rate_limit:${ip}`
  const current = rateLimitStore.get(key)

  if (!current || now > current.resetTime) {
    // Reset or initialize
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return false
  }

  if (current.count >= maxRequests) {
    return true // Rate limited
  }

  current.count++
  return false
}

// Function to log security event
async function logSecurityEvent(type: string, severity: string, ip: string, details: string, user?: string) {
  try {
    await client.execute(`
      INSERT INTO security_alerts (type, severity, ip, details, resolved)
      VALUES (?, ?, ?, ?, FALSE)
    `, [type, severity, ip, details])

    await client.execute(`
      INSERT INTO security_logs (action, type, ip, user, details)
      VALUES (?, ?, ?, ?, ?)
    `, ['Security Event', type, ip, user || 'anonymous', details])

    console.log(`🚨 SECURITY: ${type.toUpperCase()} from ${ip} - ${details}`)
  } catch (error) {
    console.error('Failed to log security event:', error)
  }
}

export async function proxy(request: NextRequest) {
  const ip = getClientIP(request)
  const url = request.url
  const method = request.method

  // Skip security checks for static assets and health checks
  if (
    url.includes('/_next/') ||
    url.includes('/favicon.ico') ||
    url.includes('/api/health') ||
    method === 'OPTIONS'
  ) {
    return NextResponse.next()
  }

  try {
    // Check if IP is blocked
    const blockedCheck = await client.execute(`
      SELECT ip FROM blocked_ips WHERE ip = ?
    `, [ip])

    if (blockedCheck.rows.length > 0) {
      await logSecurityEvent('blocked_ip_access', 'high', ip, `Blocked IP attempted access to ${url}`)
      return new NextResponse('Access Denied - IP Blocked', { status: 403 })
    }

    // Rate limiting check
    const isRateLimited = await checkRateLimit(ip)
    if (isRateLimited) {
      await logSecurityEvent('rate_limit_exceeded', 'medium', ip, `Rate limit exceeded for ${method} ${url}`)
      return new NextResponse('Rate Limit Exceeded', {
        status: 429,
        headers: {
          'Retry-After': '60'
        }
      })
    }

    // Security threat detection in request body/query params
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      try {
        const body = await request.clone().text()

        if (body && body.length > 0) {
          // Check for SQL injection
          if (detectSecurityThreat(body, 'sql_injection')) {
            await logSecurityEvent('sql_injection_attempt', 'high', ip, `SQL injection detected in ${method} ${url}`)
            return new NextResponse('Security Violation Detected', { status: 403 })
          }

          // Check for XSS
          if (detectSecurityThreat(body, 'xss')) {
            await logSecurityEvent('xss_attempt', 'high', ip, `XSS attempt detected in ${method} ${url}`)
            return new NextResponse('Security Violation Detected', { status: 403 })
          }
        }
      } catch (error) {
        // Ignore body parsing errors
      }
    }

    // Check query parameters for threats
    const urlObj = new URL(url)
    for (const [key, value] of urlObj.searchParams) {
      if (detectSecurityThreat(value, 'sql_injection')) {
        await logSecurityEvent('sql_injection_attempt', 'high', ip, `SQL injection in query param: ${key}`)
        return new NextResponse('Security Violation Detected', { status: 403 })
      }
      if (detectSecurityThreat(value, 'xss')) {
        await logSecurityEvent('xss_attempt', 'high', ip, `XSS in query param: ${key}`)
        return new NextResponse('Security Violation Detected', { status: 403 })
      }
    }

    // Log suspicious patterns in headers
    const suspiciousHeaders = ['user-agent', 'referer', 'x-forwarded-for']
    for (const headerName of suspiciousHeaders) {
      const headerValue = request.headers.get(headerName)
      if (headerValue && (detectSecurityThreat(headerValue, 'sql_injection') || detectSecurityThreat(headerValue, 'xss'))) {
        await logSecurityEvent('suspicious_header', 'medium', ip, `Suspicious content in ${headerName} header`)
        // Don't block, just log
      }
    }

  } catch (error) {
    console.error('Security middleware error:', error)
    // Continue processing if security check fails
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/health (health check endpoint)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/health|_next/static|_next/image|favicon.ico).*)',
  ],
}