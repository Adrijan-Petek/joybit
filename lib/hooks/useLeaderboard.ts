import { useState, useEffect } from 'react'

export type LeaderboardEntry = {
  address: string
  score: number
  username?: string
  pfp?: string
}

export function useLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('Fetching leaderboard from API...')
      
      const response = await fetch('/api/leaderboard')
      console.log('API Response status:', response.status)
      
      const data = await response.json()
      console.log('API Response data:', data)
      
      if (data.error) {
        console.error('API returned error:', data.error, data.details)
        setError(data.error)
        setLeaderboard([])
      } else {
        setLeaderboard(data.leaderboard || [])
        console.log('Leaderboard set:', data.leaderboard?.length || 0, 'entries')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch leaderboard'
      setError(errorMessage)
      console.error('Fetch error:', err)
      setLeaderboard([])
    } finally {
      setLoading(false)
    }
  }

  const updateScore = async (address: string, score: number, username?: string, pfp?: string) => {
    try {
      const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address, score, username, pfp }),
      })
      
      const data = await response.json()
      
      if (data.success && data.updated) {
        // Refresh leaderboard after update
        await fetchLeaderboard()
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
    refetch: fetchLeaderboard,
    updateScore,
  }
}
