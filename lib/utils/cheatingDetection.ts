// Utility function to log cheating attempts to the security system
export async function logCheatingAttempt(
  type: 'multiple_claims' | 'invalid_score' | 'speed_hack' | 'game_manipulation' | 'reward_exploit',
  address: string,
  details?: string
) {
  try {
    // Get client IP and user agent
    const ip = typeof window !== 'undefined' ?
      await fetch('https://api.ipify.org?format=json')
        .then(r => r.json())
        .then(d => d.ip)
        .catch(() => 'unknown') : 'server';

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
      console.error('Failed to log cheating attempt:', await response.text())
    }
  } catch (error) {
    console.error('Error logging cheating attempt:', error)
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