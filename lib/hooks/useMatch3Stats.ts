import { useState, useEffect } from 'react'

interface Match3Stats {
  gamesPlayed: number
  highScore: number
  highScoreLevel: number
  lastPlayed: number
}

export function useMatch3Stats(address?: string) {
  const [stats, setStats] = useState<Match3Stats>({
    gamesPlayed: 0,
    highScore: 0,
    highScoreLevel: 0,
    lastPlayed: Date.now()
  })
  const [isLoading, setIsLoading] = useState(false)

  const fetchStats = async () => {
    if (!address) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/game-stats/match3?address=${address}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch Match3 stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveStats = async (score?: number, level?: number, gamesPlayed?: number) => {
    if (!address) return

    try {
      const response = await fetch('/api/game-stats/match3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          score,
          level,
          gamesPlayed
        })
      })

      if (response.ok) {
        const result = await response.json()
        setStats(result.stats)
        return result.stats
      }
    } catch (error) {
      console.error('Failed to save Match3 stats:', error)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [address])

  return {
    stats,
    isLoading,
    fetchStats,
    saveStats
  }
}