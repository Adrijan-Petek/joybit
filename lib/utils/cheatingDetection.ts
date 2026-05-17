const CHEATING_LOG_COOLDOWN_MS = 30_000
const recentCheatingEvents = new Map<string, number>()

function eventKey(type: string, address: string, details?: string) {
  return `${type}:${address.toLowerCase()}:${details || ''}`
}

function shouldSendEvent(type: string, address: string, details?: string) {
  const now = Date.now()

  for (const [key, ts] of recentCheatingEvents) {
    if (now - ts > CHEATING_LOG_COOLDOWN_MS) {
      recentCheatingEvents.delete(key)
    }
  }

  const key = eventKey(type, address, details)
  const lastSent = recentCheatingEvents.get(key)
  if (lastSent && now - lastSent < CHEATING_LOG_COOLDOWN_MS) {
    return false
  }

  recentCheatingEvents.set(key, now)
  return true
}

// Utility function to log cheating attempts to the security system
export async function logCheatingAttempt(
  type: 'multiple_claims' | 'invalid_score' | 'speed_hack' | 'game_manipulation' | 'reward_exploit',
  address: string,
  details?: string
) {
  if (!shouldSendEvent(type, address, details)) {
    return
  }

  try {
    // Keep this lightweight and non-blocking for gameplay flow.
    const ip = 'unknown'
    const userAgent = typeof window !== 'undefined' ? navigator.userAgent : 'server';

    const response = await fetch('/api/admin/security/cheating', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        address,
        details,
        ip,
        userAgent
      })
    })

    if (response.ok) {
      console.log(`🚨 Cheating attempt logged: ${type} by ${address}`)
    } else {
      const contentType = response.headers.get('content-type') || ''
      let detail = `${response.status}`

      if (contentType.includes('application/json')) {
        const data = await response.json().catch(() => null)
        if (data?.error) detail = `${response.status} ${String(data.error)}`
      }

      // Avoid printing full HTML payloads in console when route is missing.
      console.warn(`Cheating log endpoint unavailable (${detail})`)
    }
  } catch (error) {
    // Never break user flow because telemetry failed.
    console.warn('Cheating telemetry send skipped:', error)
  }
}

// Specific cheating detection functions
export function detectMultipleClaims(address: string, recentClaims: number) {
  if (recentClaims > 3) {
    logCheatingAttempt('multiple_claims', address, `Multiple claims detected: ${recentClaims} in short time`)
  }
}

export function detectInvalidScore(address: string, score: number, expectedMax: number) {
  if (score > expectedMax * 2) { // Allow some margin but flag extreme outliers
    logCheatingAttempt('invalid_score', address, `Invalid score: ${score}, expected max: ${expectedMax}`)
  }
}

export function detectSpeedHack(address: string, completionTime: number, expectedMinTime: number) {
  if (completionTime < expectedMinTime / 2) { // Completed too fast
    logCheatingAttempt('speed_hack', address, `Speed hack detected: ${completionTime}ms, expected min: ${expectedMinTime}ms`)
  }
}

export function detectGameManipulation(address: string, action: string) {
  logCheatingAttempt('game_manipulation', address, `Game manipulation detected: ${action}`)
}

export function detectRewardExploit(address: string, rewardAmount: string, expectedAmount: string) {
  logCheatingAttempt('reward_exploit', address, `Reward exploit: got ${rewardAmount}, expected ${expectedAmount}`)
}