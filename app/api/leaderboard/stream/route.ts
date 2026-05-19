import { NextResponse } from 'next/server'
import { subscribeToLeaderboardUpdates } from '@/lib/server/leaderboardEvents'

export const runtime = 'nodejs'

export async function GET() {
  const encoder = new TextEncoder()
  let cleanup: (() => void) | null = null

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`))
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }

      const close = () => {
        try {
          controller.close()
        } catch {
          // Stream may already be closed by the client.
        }
      }

      const unsubscribe = subscribeToLeaderboardUpdates(send, close)

      send('connected', { ts: Date.now() })

      const keepAlive = setInterval(() => {
        send('ping', { ts: Date.now() })
      }, 25000)

      cleanup = () => {
        clearInterval(keepAlive)
        unsubscribe()
      }
    },
    cancel() {
      if (cleanup) {
        cleanup()
        cleanup = null
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
