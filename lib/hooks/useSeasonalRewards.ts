import { useEffect, useState } from 'react'

export type RewardPeriod = 'weekly' | 'monthly'

export type SeasonalAllocation = {
  epochId: number
  period: RewardPeriod
  status: string
  tokenAddress: string
  amountRaw: string
  rank: number
  score: number
  claimed: boolean
  startAt: number
  endAt: number
  finalizedAt: number | null
  distributedAt: number | null
}

type SeasonalRewardsResponse = {
  address: string
  weeklyPendingRaw: string
  monthlyPendingRaw: string
  allocations: SeasonalAllocation[]
}

const EMPTY_RESPONSE: SeasonalRewardsResponse = {
  address: '',
  weeklyPendingRaw: '0',
  monthlyPendingRaw: '0',
  allocations: [],
}

export function useSeasonalRewards(address?: string) {
  const [data, setData] = useState<SeasonalRewardsResponse>(EMPTY_RESPONSE)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSeasonalRewards = async () => {
    if (!address) {
      setData(EMPTY_RESPONSE)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/rewards/epochs?address=${address}`)
      const payload = await response.json()

      if (!response.ok) {
        setError(payload?.error || 'Failed to load seasonal rewards')
        setData(EMPTY_RESPONSE)
        return
      }

      setData({
        address: payload.address || address,
        weeklyPendingRaw: payload.weeklyPendingRaw || '0',
        monthlyPendingRaw: payload.monthlyPendingRaw || '0',
        allocations: Array.isArray(payload.allocations) ? payload.allocations : [],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load seasonal rewards')
      setData(EMPTY_RESPONSE)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSeasonalRewards()
  }, [address])

  return {
    data,
    isLoading,
    error,
    refetch: fetchSeasonalRewards,
  }
}
