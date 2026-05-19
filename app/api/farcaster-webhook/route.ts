import { NextRequest, NextResponse } from 'next/server'
import { broadcastLeaderboardUpdated } from '@/lib/server/leaderboardEvents'

const SCORE_RELEVANT_EVENTS = new Set(['cast.created', 'reaction.created'])

type ScoreUpdatePayload = {
  address: string
  score: number
  username?: string
  pfp?: string
  fid?: number
}

function resolveEventType(payload: Record<string, unknown>): string | null {
  const directType = payload.type
  if (typeof directType === 'string' && directType.length > 0) return directType

  const eventContext = payload.event
  if (eventContext && typeof eventContext === 'object') {
    const nestedType = (eventContext as Record<string, unknown>).type
    if (typeof nestedType === 'string' && nestedType.length > 0) return nestedType
  }

  return null
}

function extractScoreUpdate(payload: Record<string, unknown>): ScoreUpdatePayload | null {
  const directAddress = payload.address
  const directScore = payload.score

  if (typeof directAddress === 'string' && typeof directScore === 'number') {
    return {
      address: directAddress,
      score: directScore,
      username: typeof payload.username === 'string' ? payload.username : undefined,
      pfp: typeof payload.pfp === 'string' ? payload.pfp : undefined,
      fid: typeof payload.fid === 'number' ? payload.fid : undefined,
    }
  }

  const updateCandidate = payload.leaderboardUpdate
  if (!updateCandidate || typeof updateCandidate !== 'object') {
    return null
  }

  const update = updateCandidate as Record<string, unknown>
  if (typeof update.address !== 'string' || typeof update.score !== 'number') {
    return null
  }

  return {
    address: update.address,
    score: update.score,
    username: typeof update.username === 'string' ? update.username : undefined,
    pfp: typeof update.pfp === 'string' ? update.pfp : undefined,
    fid: typeof update.fid === 'number' ? update.fid : undefined,
  }
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.NEYNAR_WEBHOOK_SECRET
  if (webhookSecret) {
    const providedSecret = request.headers.get('x-neynar-webhook-secret') || ''
    if (providedSecret !== webhookSecret) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
  }

  let payload: Record<string, unknown>
  try {
    payload = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload' }, { status: 400 })
  }

  const eventType = resolveEventType(payload)
  const scoreUpdate = extractScoreUpdate(payload)

  if (scoreUpdate) {
    const leaderboardUrl = new URL('/api/leaderboard', request.url)
    const leaderboardResponse = await fetch(leaderboardUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(scoreUpdate),
    })

    if (!leaderboardResponse.ok) {
      return NextResponse.json({ ok: false, error: 'Failed to persist leaderboard update' }, { status: 500 })
    }
  }

  if (eventType && SCORE_RELEVANT_EVENTS.has(eventType)) {
    broadcastLeaderboardUpdated(`webhook:${eventType}`)
  }

  return NextResponse.json({ ok: true, eventType: eventType || null })
}
