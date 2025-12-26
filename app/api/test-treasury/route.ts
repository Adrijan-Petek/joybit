import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 })
    }

    console.log('🔍 Testing treasury state for:', address)

    // Get pending level completions
    const completionsResult = await client.execute(
      'SELECT * FROM level_completions WHERE address = ? AND distributed = FALSE',
      [address]
    )

    // Get total pending rewards
    const totalResult = await client.execute(`
      SELECT SUM(CAST(reward_amount AS INTEGER)) as total_pending
      FROM level_completions
      WHERE address = ? AND distributed = FALSE
    `, [address])

    const totalPending = totalResult.rows[0]?.total_pending || 0

    const result = {
      address,
      pendingCompletions: completionsResult.rows.length,
      totalPendingRewards: totalPending,
      completions: completionsResult.rows
    }

    console.log('✅ Treasury test result:', result)
    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ API: Error testing treasury:', error)
    return NextResponse.json({ error: 'Failed to test treasury' }, { status: 500 })
  }
}