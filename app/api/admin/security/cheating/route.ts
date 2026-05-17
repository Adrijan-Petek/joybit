import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))

    // Minimal server-side telemetry endpoint.
    console.warn('Cheating telemetry event:', {
      type: body?.type,
      address: body?.address,
      details: body?.details,
      ip: body?.ip,
      userAgent: body?.userAgent,
      at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to process event' }, { status: 500 })
  }
}
