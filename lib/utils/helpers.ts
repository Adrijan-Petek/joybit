/**
 * Format Ethereum address for display
 * @param address - Full Ethereum address
 * @param chars - Number of characters to show on each side
 */
export function formatAddress(address: string, chars = 4): string {
  if (!address) return ''
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

/**
 * Format ETH amount for display
 * @param wei - Amount in wei (as string or bigint)
 * @param decimals - Number of decimal places to show
 */
export function formatEther(wei: bigint | string, decimals = 4): string {
  const weiValue = typeof wei === 'string' ? BigInt(wei) : wei
  const etherValue = Number(weiValue) / 1e18
  return etherValue.toFixed(decimals)
}

/**
 * Format large numbers with commas
 * @param num - Number to format
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US')
}

/**
 * Format time remaining
 * @param seconds - Seconds remaining
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return '0s'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

/**
 * Format date for display
 * @param timestamp - Unix timestamp in seconds
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Calculate time until next available action
 * @param lastAction - Timestamp of last action
 * @param cooldown - Cooldown period in seconds
 */
export function getTimeUntilNext(lastAction: number, cooldown: number): number {
  const now = Math.floor(Date.now() / 1000)
  const nextAvailable = lastAction + cooldown
  return Math.max(0, nextAvailable - now)
}

/**
 * Check if cooldown period has passed
 * @param lastAction - Timestamp of last action
 * @param cooldown - Cooldown period in seconds
 */
export function canPerformAction(lastAction: number, cooldown: number): boolean {
  return getTimeUntilNext(lastAction, cooldown) === 0
}

/**
 * Generate a random integer between min and max (inclusive)
 * @param min - Minimum value
 * @param max - Maximum value
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param array - Array to shuffle
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Clamp a value between min and max
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Calculate percentage
 * @param value - Current value
 * @param total - Total value
 * @param decimals - Number of decimal places
 */
export function percentage(value: number, total: number, decimals = 2): string {
  if (total === 0) return '0'
  return ((value / total) * 100).toFixed(decimals)
}

/**
 * Delay execution
 * @param ms - Milliseconds to delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Create a hash from session data (simple implementation)
 * @param sessionId - Session ID
 * @param playerAddress - Player's address
 * @param score - Game score
 */
export function createResultHash(
  sessionId: number,
  playerAddress: string,
  score: number
): string {
  // In production, use proper hashing like keccak256
  const data = `${sessionId}${playerAddress}${score}`
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`
}

/**
 * Check if a value is a valid Ethereum address
 * @param address - Address to validate
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * Convert basis points to percentage
 * @param bps - Basis points (1 bps = 0.01%)
 */
export function bpsToPercentage(bps: number): number {
  return bps / 100
}

/**
 * Convert percentage to basis points
 * @param percentage - Percentage value
 */
export function percentageToBps(percentage: number): number {
  return Math.round(percentage * 100)
}
