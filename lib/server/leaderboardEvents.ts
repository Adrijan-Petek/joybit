type LeaderboardSubscriber = {
  id: string
  send: (event: string, payload: Record<string, unknown>) => void
  close: () => void
}

type LeaderboardEventState = {
  subscribers: Map<string, LeaderboardSubscriber>
}

function getState(): LeaderboardEventState {
  const globalWithEvents = globalThis as typeof globalThis & {
    __joybitLeaderboardEvents?: LeaderboardEventState
  }

  if (!globalWithEvents.__joybitLeaderboardEvents) {
    globalWithEvents.__joybitLeaderboardEvents = {
      subscribers: new Map<string, LeaderboardSubscriber>(),
    }
  }

  return globalWithEvents.__joybitLeaderboardEvents
}

export function subscribeToLeaderboardUpdates(
  send: LeaderboardSubscriber['send'],
  close: LeaderboardSubscriber['close']
) {
  const state = getState()
  const id = crypto.randomUUID()

  state.subscribers.set(id, { id, send, close })

  return () => {
    const subscriber = state.subscribers.get(id)
    if (!subscriber) return
    state.subscribers.delete(id)
    subscriber.close()
  }
}

export function broadcastLeaderboardUpdated(reason: string) {
  const payload = {
    reason,
    ts: Date.now(),
  }

  const state = getState()
  for (const subscriber of state.subscribers.values()) {
    try {
      subscriber.send('leaderboard-updated', payload)
    } catch {
      state.subscribers.delete(subscriber.id)
      try {
        subscriber.close()
      } catch {
        // Ignore close errors from disconnected clients.
      }
    }
  }
}
