import { formatEther } from 'viem'

/**
 * Professional token balance formatting like wallet interfaces
 * Handles large numbers with K/M/B suffixes and proper thousand separators
 */
export function formatTokenBalance(balance: bigint | undefined | null): string {
  if (!balance || balance === 0n) return '0.00'

  const formatted = formatEther(balance)
  const num = parseFloat(formatted)

  // Handle very large numbers with abbreviations
  if (num >= 1000000000) { // Billions
    return (num / 1000000000).toFixed(2) + 'B'
  }
  if (num >= 1000000) { // Millions
    return (num / 1000000).toFixed(2) + 'M'
  }
  if (num >= 1000) { // Thousands
    return (num / 1000).toFixed(2) + 'K'
  }

  // For smaller amounts, use thousand separators and appropriate decimals
  if (num >= 100) {
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 })
  }
  if (num >= 1) {
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 })
  }

  // For very small amounts
  return num.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 })
}

/**
 * Compact formatting for smaller displays (like stats)
 */
export function formatTokenBalanceCompact(balance: bigint | undefined | null): string {
  if (!balance || balance === 0n) return '0'

  const formatted = formatEther(balance)
  const num = parseFloat(formatted)

  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B'
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }

  return num.toFixed(2)
}