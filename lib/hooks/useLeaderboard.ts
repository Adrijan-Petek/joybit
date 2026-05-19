import { useState, useEffect } from 'react'

export type LeaderboardEntry = {
  address: string
  score: number
  username?: string
  pfp?: string
  fid?: number
}

export function useLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeaderboard = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setLoading(true)
      setError(null)

      const response = await fetch('/api/leaderboard')

      const data = await response.json()

      if (data.error) {
        setError(data.error)
        setLeaderboard([])
      } else {
        setLeaderboard(data.leaderboard || [])
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch leaderboard'
      setError(errorMessage)
      setLeaderboard([])
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const updateScore = async (address: string, pointsToAdd: number, username?: string, pfp?: string) => {
    try {
      // First get current score
      const currentResult = await fetch(`/api/leaderboard?address=${address}`)
      const currentData = await currentResult.json()
      const currentScore = currentData.currentScore || 0
      
      // Calculate new total score
      const newTotalScore = currentScore + pointsToAdd
      
      const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address, score: newTotalScore, username, pfp }),
      })
      
      const data = await response.json()
      
      if (data.success && data.updated) {
        // Refresh leaderboard after update
        await fetchLeaderboard({ silent: true })
      }
      
      return data
    } catch (err) {
      console.error('Failed to update score:', err)
      return { success: false, error: 'Failed to update score' }
    }
  }

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  return {
    leaderboard,
    loading,
    error,
    refetch: () => fetchLeaderboard(),
    refetchSilently: () => fetchLeaderboard({ silent: true }),
    updateScore,
  }
}
