import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

// Rate limiting storage (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Professional Security Patterns for Detection
const SECURITY_PATTERNS = {
  sql_injection: [
    // Only match actual malicious SQL injection attempts, not normal headers
    /union\s+select\s+.*\s+from\s+/i,
    /select\s+.*\s+from\s+.*\s+where\s+.*\s+(or|and)\s+.*\s*=\s*.*\s*(or|and)\s+.*\s*=\s*/i,
    /insert\s+into\s+.*\s+values\s*\(/i,
    /update\s+.*\s+set\s+.*\s+where\s+.*;\s*(drop|delete|select)/i,
    /delete\s+from\s+.*\s+where\s+.*;\s*drop/i,
    /drop\s+(table|database|index)\s+/i,
    /create\s+(table|database|index)\s+/i,
    /alter\s+table\s+.*\s+(drop|add)\s+column/i,
    /exec\s*\(/i,
    /execute\s*\(/i,
    /xp_cmdshell/i,
    /sp_executesql/i,
    // Very specific attack patterns
    /'\s*or\s+'?\d+'?\s*=\s*'?\d/i,
    /;\s*shutdown/i,
    /;\s*drop\s+table/i,
    /script\s+src\s*=\s*["']?\s*select/i
  ],
  xss: [
    // Only match actual XSS attempts, not normal JavaScript in headers
    /<script[^>]*>[^<]*<\/script>/gi,
    /javascript\s*:\s*[^;]*alert\s*\(/gi,
    /vbscript\s*:\s*[^;]*msgbox/gi,
    /onload\s*=\s*["'][^"']*alert\s*\([^"']*["']/gi,
    /onerror\s*=\s*["'][^"']*alert\s*\([^"']*["']/gi,
    /onclick\s*=\s*["'][^"']*javascript\s*:[^"']*["']/gi,
    /<iframe[^>]*src\s*=\s*["']javascript\s*:[^"']*>/gi,
    /<object[^>]*data\s*=\s*["']javascript\s*:[^"']*>/gi,
    /<embed[^>]*src\s*=\s*["']javascript\s*:[^"']*>/gi,
    /expression\s*\([^)]*javascript\s*:[^)]*\)/gi,
    /data\s*:\s*text\/html\s*,[^,]*,<script/gi,
    // Very specific XSS patterns
    /<img[^>]*src\s*=\s*["']?javascript\s*:[^"']*>/gi,
    /<body[^>]*onload\s*=\s*["'][^"']*alert/gi
  ],
  command_injection: [
    // Only match actual command injection, not normal shell usage
    /\|\s*(rm|cat|wget|curl|nc|netcat|bash|sh|python|perl)\s+/i,
    /;\s*(rm|cat|wget|curl|nc|netcat|bash|sh|python|perl)\s+/i,
    /`.*(rm|cat|wget|curl|nc|netcat|bash|sh|python|perl).*`/i,
    /\$\([^)]*(rm|cat|wget|curl|nc|netcat|bash|sh|python|perl)[^)]*\)/i,
    // Very specific command injection patterns
    /\|\s*rm\s+-rf\s+\//i,
    /;\s*cat\s+\/etc\/passwd/i,
    /\|\s*nc\s+.*\s+-e/i,
    /;\s*wget\s+.*\|\s*bash/i,
    /\$\([^)]*wget[^)]*\|[^)]*bash[^)]*\)/i
  ],
  path_traversal: [
    /\.\.\//,
    /\.\.\\/,
    /\/etc\/passwd/i,
    /\/etc\/shadow/i,
    /\/etc\/hosts/i,
    /\/proc\/self/i,
    /\/windows\/system32/i,
    /c:\\windows\\/i
  ],
  suspicious_headers: [
    /<script/i,
    /javascript/i,
    /vbscript/i,
    /onload/i,
    /onerror/i,
    /eval\(/i,
    /alert\(/i,
    /document\.cookie/i,
    /localStorage/i,
    /sessionStorage/i
  ]
}

// Known legitimate user agents (patterns)
const LEGITIMATE_USER_AGENTS = [
  /^Mozilla\/\d+\.\d+.*$/,
  /^curl\/\d+\.\d+.*$/,
  /^PostmanRuntime\/\d+\.\d+.*$/,
  /^axios\/\d+\.\d+.*$/,
  /^node-fetch\/\d+\.\d+.*$/,
  /^python-requests\/\d+\.\d+.*$/,
  /^Go-http-client\/\d+\.\d+.*$/,
  /^Java\/\d+\.\d+.*$/,
  /^Apache-HttpClient\/\d+\.\d+.*$/,
  /^okhttp\/\d+\.\d+.*$/,
  /^Dart\/\d+\.\d+.*$/,
  /^insomnia\/\d+\.\d+.*$/,
  /^Thunder Client.*$/,
  /^VS Code.*$/,
  /^GitHub Actions.*$/,
  /^GitHub-Hookshot.*$/,
  /^Slackbot.*$/,
  /^Discordbot.*$/,
  /^Twitterbot.*$/,
  /^facebookexternalhit.*$/,
  /^LinkedInBot.*$/,
  /^WhatsApp.*$/,
  /^TelegramBot.*$/,
  /^Googlebot.*$/,
  /^Bingbot.*$/,
  /^DuckDuckBot.*$/,
  /^Applebot.*$/,
  /^YandexBot.*$/,
  /^Baiduspider.*$/,
  /^Sogou.*$/,
  /^Exabot.*$/,
  /^MJ12bot.*$/,
  // Development and testing tools
  /^Next\.js.*$/,
  /^webpack.*$/,
  /^vite.*$/,
  /^esbuild.*$/,
  /^parcel.*$/,
  /^rollup.*$/,
  /^snowpack.*$/,
  /^swc.*$/,
  /^tsc.*$/,
  /^node.*$/,
  /^npm.*$/,
  /^yarn.*$/,
  /^pnpm.*$/,
  /^bun.*$/,
  // Browser development tools
  /^Chrome.*$/,
  /^Firefox.*$/,
  /^Safari.*$/,
  /^Edge.*$/,
  /^Opera.*$/,
  /^Brave.*$/,
  /^Vivaldi.*$/,
  /^Arc.*$/,
  // Mobile browsers
  /^Mobile.*$/,
  /^Android.*$/,
  /^iPhone.*$/,
  /^iPad.*$/,
  // Generic patterns for legitimate clients
  /^.*\/.*\d+\.\d+.*$/, // Any client with version numbers
  /^.*Bot.*$/, // Any bot (assuming legitimate unless proven otherwise)
  /^.*Crawler.*$/, // Any crawler
  /^.*Spider.*$/ // Any spider
]

// Suspicious user agent patterns
const SUSPICIOUS_USER_AGENTS = [
  /^[\w\s]*$/i, // Only alphanumeric and spaces (too clean)
  /^.{0,10}$/, // Too short
  /<script/i,
  /javascript/i,
  /vbscript/i,
  /eval\(/i,
  /alert\(/i,
  /document\./i,
  /window\./i,
  /location\./i,
  /cookie/i,
  /localStorage/i,
  /sessionStorage/i,
  /innerHTML/i,
  /outerHTML/i,
  /insertAdjacentHTML/i,
  /write\(/i,
  /writeln\(/i,
  /base64/i,
  /atob\(/i,
  /btoa\(/i,
  /unescape\(/i,
  /decodeURIComponent\(/i,
  /encodeURIComponent\(/i,
  /fromCharCode/i,
  /charCodeAt/i,
  /String\.fromCharCode/i,
  /unescape/i,
  /escape/i,
  /eval/i,
  /Function/i,
  /setTimeout/i,
  /setInterval/i,
  /XMLHttpRequest/i,
  /fetch/i,
  /WebSocket/i,
  /EventSource/i,
  /Worker/i,
  /SharedWorker/i,
  /ServiceWorker/i,
  /BroadcastChannel/i,
  /MessageChannel/i,
  /postMessage/i,
  /importScripts/i,
  /require\(/i,
  /module\.exports/i,
  /exports\./i,
  /process\./i,
  /global/i,
  /Buffer/i,
  /__dirname/i,
  /__filename/i,
  /child_process/i,
  /fs\./i,
  /path\./i,
  /os\./i,
  /crypto/i,
  /http/i,
  /https/i,
  /url/i,
  /querystring/i,
  /zlib/i,
  /stream/i,
  /events/i,
  /util/i,
  /assert/i,
  /tty/i,
  /readline/i,
  /repl/i,
  /vm/i,
  /cluster/i,
  /domain/i,
  /punycode/i,
  /string_decoder/i,
  /timers/i,
  /dns/i,
  /dgram/i,
  /net/i,
  /tls/i,
  /tty/i,
  /v8/i,
  /webcrypto/i
]

// IP reputation patterns (basic)
const SUSPICIOUS_IPS = [
  /^127\./, // Localhost ranges (should be allowed for development)
  /^10\./, // Private networks
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private networks
  /^192\.168\./, // Private networks
  /^169\.254\./, // Link-local
  /^0\./, // Invalid
  /^255\./, // Broadcast
  // Known malicious ranges (examples - in production use a proper IP reputation service)
  /^185\.159\./, // Example malicious range
  /^91\.134\./, // Example malicious range
  /^5\.188\./, // Example malicious range
]

// Threat scoring system
interface ThreatScore {
  score: number
  reasons: string[]
  severity: 'low' | 'medium' | 'high' | 'critical'
}

// Function to validate user agent
function validateUserAgent(userAgent: string): { valid: boolean; reason?: string } {
  if (!userAgent || userAgent.length < 5) {
    return { valid: false, reason: 'User agent too short or empty' }
  }

  if (userAgent.length > 500) {
    return { valid: false, reason: 'User agent too long' }
  }

  // Check if it matches known legitimate patterns
  const isLegitimate = LEGITIMATE_USER_AGENTS.some(pattern => pattern.test(userAgent))
  if (isLegitimate) {
    return { valid: true }
  }

  // For legitimate users, be extremely permissive
  // Only flag as suspicious if it contains obvious attack patterns
  const hasAttackPatterns = /<script|<iframe|javascript:|vbscript:|eval\(.*\)|alert\(.*\)|document\.cookie|localStorage|sessionStorage/i.test(userAgent)
  if (hasAttackPatterns) {
    return { valid: false, reason: 'Contains obvious attack vectors' }
  }

  // Allow virtually any user agent that doesn't have attack patterns
  // This includes development tools, bots, and unusual but legitimate clients
  return { valid: true }
}

// Function to detect security threats with scoring
function detectSecurityThreat(input: string, type: keyof typeof SECURITY_PATTERNS): boolean {
  if (!input || typeof input !== 'string') return false

  const patterns = SECURITY_PATTERNS[type]
  return patterns.some(pattern => pattern.test(input))
}

// Function to calculate threat score
function calculateThreatScore(request: NextRequest, ip: string): ThreatScore {
  let score = 0
  const reasons: string[] = []

  // Check user agent
  const userAgent = request.headers.get('user-agent') || ''
  const uaValidation = validateUserAgent(userAgent)
  if (!uaValidation.valid) {
    score += 10 // Very low penalty - only for obvious attacks
    reasons.push(`Invalid user agent: ${uaValidation.reason}`)
  }

  // Check for suspicious headers (be very lenient)
  const suspiciousHeaders = ['user-agent', 'referer', 'x-forwarded-for', 'accept', 'accept-language']
  for (const headerName of suspiciousHeaders) {
    const headerValue = request.headers.get(headerName) || ''
    if (headerValue) {
      if (detectSecurityThreat(headerValue, 'sql_injection')) {
        score += 200 // Very high for confirmed SQL injection attacks
        reasons.push(`SQL injection in ${headerName}`)
      }
      if (detectSecurityThreat(headerValue, 'xss')) {
        score += 180 // Very high for XSS attempts
        reasons.push(`XSS attempt in ${headerName}`)
      }
      if (detectSecurityThreat(headerValue, 'command_injection')) {
        score += 250 // Extremely high for command injection
        reasons.push(`Command injection in ${headerName}`)
      }
      // Remove suspicious_headers check - too aggressive for legitimate traffic
    }
  }

  // Check URL for path traversal
  const url = request.url
  if (detectSecurityThreat(url, 'path_traversal')) {
    score += 40
    reasons.push('Path traversal attempt')
  }

  // Check query parameters
  const urlObj = new URL(url)
  for (const [key, value] of urlObj.searchParams) {
    if (detectSecurityThreat(value, 'sql_injection')) {
      score += 20
      reasons.push(`SQL injection in param: ${key}`)
    }
    if (detectSecurityThreat(value, 'xss')) {
      score += 20
      reasons.push(`XSS in param: ${key}`)
    }
    if (detectSecurityThreat(value, 'command_injection')) {
      score += 25
      reasons.push(`Command injection in param: ${key}`)
    }
  }

  // Check request body for POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    try {
      // Note: In Next.js middleware, we can't easily read the body
      // This would need to be implemented in API routes
    } catch (error) {
      // Ignore body parsing errors
    }
  }

  // IP-based scoring (basic)
  if (SUSPICIOUS_IPS.some(pattern => pattern.test(ip))) {
    score += 10
    reasons.push('IP in suspicious range')
  }

  // Determine severity
  let severity: 'low' | 'medium' | 'high' | 'critical'
  if (score >= 80) severity = 'critical'
  else if (score >= 50) severity = 'high'
  else if (score >= 25) severity = 'medium'
  else severity = 'low'

  return { score, reasons, severity }
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

// Function to log security event with threat scoring
async function logSecurityEvent(
  type: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  ip: string,
  details: string,
  threatScore?: ThreatScore,
  user?: string
) {
  try {
    await client.execute(`
      INSERT INTO security_alerts (type, severity, ip, details, resolved)
      VALUES (?, ?, ?, ?, FALSE)
    `, [type, severity, ip, details])

    await client.execute(`
      INSERT INTO security_logs (action, type, ip, user, details)
      VALUES (?, ?, ?, ?, ?)
    `, ['Security Event', type, ip, user || 'anonymous', details])

    const scoreInfo = threatScore ? ` (Score: ${threatScore.score}, Reasons: ${threatScore.reasons.join(', ')})` : ''
    console.log(`🚨 SECURITY: ${severity.toUpperCase()} ${type.toUpperCase()} from ${ip} - ${details}${scoreInfo}`)
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
    method === 'OPTIONS' ||
    ip === '::1' || // Skip security for localhost
    ip === '127.0.0.1' // Skip security for localhost
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

    // Comprehensive threat analysis - DISABLED for now
    // const threatScore = calculateThreatScore(request, ip)

    // Block based on threat score - DISABLED
    // if (threatScore.score >= 500) { // Only block extremely critical threats
    //   await logSecurityEvent('critical_threat', 'critical', ip, `Critical threat detected (${threatScore.score} points)`, threatScore)
    //   return new NextResponse('Access Denied - Security Threat Detected', { status: 403 })
    // }

    // if (threatScore.score >= 300) { // Only block very high threats
    //   await logSecurityEvent('high_threat', 'high', ip, `High threat detected (${threatScore.score} points)`, threatScore)
    //   return new NextResponse('Access Denied - Security Threat Detected', { status: 403 })
    // }

    // Log medium threats but don't block
    // if (threatScore.score >= 100) {
    //   await logSecurityEvent('medium_threat', 'medium', ip, `Medium threat detected (${threatScore.score} points)`, threatScore)
    // }

    // Log low threats but don't block (for monitoring)
    // if (threatScore.score > 0 && threatScore.score < 100) {
    //   await logSecurityEvent('low_threat', 'low', ip, `Low threat detected (${threatScore.score} points)`, threatScore)
    // }

    // Legacy security checks (now redundant but kept for compatibility)
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

          // Check for command injection
          if (detectSecurityThreat(body, 'command_injection')) {
            await logSecurityEvent('command_injection_attempt', 'high', ip, `Command injection detected in ${method} ${url}`)
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
      if (detectSecurityThreat(value, 'command_injection')) {
        await logSecurityEvent('command_injection_attempt', 'high', ip, `Command injection in query param: ${key}`)
        return new NextResponse('Security Violation Detected', { status: 403 })
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