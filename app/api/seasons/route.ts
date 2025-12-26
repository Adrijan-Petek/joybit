import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

// Helper function to convert BigInts to numbers
function convertBigInts(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'bigint') return Number(obj)
  if (Array.isArray(obj)) return obj.map(convertBigInts)
  if (typeof obj === 'object') {
    const converted: any = {}
    for (const key in obj) {
      converted[key] = convertBigInts(obj[key])
    }
    return converted
  }
  return obj
}

// Initialize database table
async function initTable() {
  try {
    // Check if table exists and has correct schema
    const tableCheck = await client.execute(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='seasons'
    `)
    
    if (tableCheck.rows.length === 0) {
      // Table doesn't exist, create it
      await client.execute(`
        CREATE TABLE seasons (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          start_date DATETIME NOT NULL,
          end_date DATETIME NOT NULL,
          is_active BOOLEAN DEFAULT FALSE,
          rewards_multiplier REAL DEFAULT 1.0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('✅ Seasons table created')
    } else {
      // Table exists, check if it has the correct columns
      const schemaCheck = await client.execute('PRAGMA table_info(seasons)')
      const columns = schemaCheck.rows.map(row => row.name)
      
      const requiredColumns = ['id', 'name', 'description', 'start_date', 'end_date', 'is_active', 'rewards_multiplier', 'created_at', 'updated_at']
      const missingColumns = requiredColumns.filter(col => !columns.includes(col))
      
      if (missingColumns.length > 0) {
        console.log('⚠️  Seasons table missing columns:', missingColumns)
        // For now, just log the issue. In production, you'd want migration logic here
      } else {
        console.log('✅ Seasons table exists with correct schema')
      }
    }
  } catch (error) {
    console.error('❌ Error initializing seasons table:', error)
  }
}

// Call init on module load
initTable().catch(console.error)

export async function GET() {
  try {
    console.log('🔍 API: Getting seasons from Turso...')

    const result = await client.execute(`
      SELECT * FROM seasons
      ORDER BY start_date DESC
    `)

    console.log('✅ API: Seasons retrieved:', result.rows.length, 'seasons')

    // Find active season
    const activeSeason = result.rows.find(row => row.is_active === 1)

    return NextResponse.json({
      seasons: convertBigInts(result.rows),
      activeSeason: convertBigInts(activeSeason) || null
    })
  } catch (error) {
    console.error('❌ API: Error fetching seasons:', error)
    return NextResponse.json({ error: 'Failed to fetch seasons' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, startDate, endDate, isActive, rewardsMultiplier } = body

    console.log('📝 API: Creating season:', { name, description, startDate, endDate, isActive, rewardsMultiplier })

    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: 'Name, start date, and end date are required' }, { status: 400 })
    }

    // If setting as active, deactivate all other seasons
    if (isActive) {
      await client.execute('UPDATE seasons SET is_active = FALSE WHERE is_active = TRUE')
    }

    const result = await client.execute({
      sql: `
        INSERT INTO seasons (name, description, start_date, end_date, is_active, rewards_multiplier)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [name, description || '', startDate, endDate, isActive ? 1 : 0, rewardsMultiplier || 1.0]
    })

    console.log('✅ API: Season created successfully')
    return NextResponse.json(convertBigInts({ success: true, id: result.lastInsertRowid }))
  } catch (error) {
    console.error('❌ API: Error creating season:', error)
    return NextResponse.json({ error: 'Failed to create season' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description, startDate, endDate, isActive, rewardsMultiplier } = body

    console.log('🔄 API: Updating season:', { id, name, description, startDate, endDate, isActive, rewardsMultiplier })

    if (!id) {
      return NextResponse.json({ error: 'Season ID is required' }, { status: 400 })
    }

    // If setting as active, deactivate all other seasons
    if (isActive) {
      await client.execute('UPDATE seasons SET is_active = FALSE WHERE is_active = TRUE')
    }

    await client.execute({
      sql: `
        UPDATE seasons
        SET name = ?, description = ?, start_date = ?, end_date = ?, is_active = ?, rewards_multiplier = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [name, description || '', startDate, endDate, isActive ? 1 : 0, rewardsMultiplier || 1.0, id]
    })

    console.log('✅ API: Season updated successfully')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ API: Error updating season:', error)
    return NextResponse.json({ error: 'Failed to update season' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    console.log('🗑️ API: Deleting season:', id)

    if (!id) {
      return NextResponse.json({ error: 'Season ID is required' }, { status: 400 })
    }

    await client.execute({
      sql: 'DELETE FROM seasons WHERE id = ?',
      args: [id]
    })

    console.log('✅ API: Season deleted successfully')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ API: Error deleting season:', error)
    return NextResponse.json({ error: 'Failed to delete season' }, { status: 500 })
  }
}