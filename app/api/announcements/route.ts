import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

// Initialize database table
async function initTable() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY,
      message TEXT NOT NULL,
      position INTEGER NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

// Call init on module load
initTable().catch(console.error)

export async function GET() {
  try {
    console.log('🔍 API: Getting announcements from Turso...')
    const result = await client.execute('SELECT message FROM announcements ORDER BY position')

    const announcements = result.rows.map(row => row.message as string)

    console.log('✅ API: Announcements retrieved:', announcements)
    return NextResponse.json(announcements)
  } catch (error) {
    console.error('❌ API: Error fetching announcements:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages } = body

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages must be an array' }, { status: 400 })
    }

    console.log('📝 API: Saving announcements:', messages)

    // Clear existing announcements
    await client.execute('DELETE FROM announcements')

    // Insert new announcements
    for (let i = 0; i < messages.length; i++) {
      if (messages[i] && messages[i].trim()) {
        await client.execute({
          sql: 'INSERT INTO announcements (message, position) VALUES (?, ?)',
          args: [messages[i].trim(), i + 1]
        })
      }
    }

    console.log('✅ API: Announcements saved successfully')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ API: Error saving announcements:', error)
    return NextResponse.json({ error: 'Failed to save announcements' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    console.log('🗑️ API: Clearing all announcements')

    await client.execute('DELETE FROM announcements')

    console.log('✅ API: Announcements cleared successfully')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ API: Error clearing announcements:', error)
    return NextResponse.json({ error: 'Failed to clear announcements' }, { status: 500 })
  }
}