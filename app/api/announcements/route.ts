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
  
  // Create announcement settings table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS announcement_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      animation_type TEXT DEFAULT 'scroll',
      color_theme TEXT DEFAULT 'yellow',
      glow_intensity TEXT DEFAULT 'medium',
      speed TEXT DEFAULT 'normal',
      font_style TEXT DEFAULT 'mono',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  // Insert default settings if not exists
  await client.execute(`
    INSERT OR IGNORE INTO announcement_settings (id, animation_type, color_theme, glow_intensity, speed, font_style)
    VALUES (1, 'scroll', 'yellow', 'medium', 'normal', 'mono')
  `)
}

// Call init on module load
initTable().catch(console.error)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isMetaRequest = searchParams.has('meta')

    console.log('🔍 API: Getting announcements from Turso...')
    const result = await client.execute('SELECT message FROM announcements ORDER BY position')

    const announcements = result.rows.map(row => row.message as string)

    // Get the latest update timestamp for versioning
    const versionResult = await client.execute(`
      SELECT MAX(updated_at) as latest_update 
      FROM (
        SELECT updated_at FROM announcements 
        UNION 
        SELECT updated_at FROM announcement_settings WHERE id = 1
      )
    `)
    const latestUpdate = versionResult.rows[0]?.latest_update as string || new Date().toISOString()

    // Get settings
    const settingsResult = await client.execute('SELECT * FROM announcement_settings WHERE id = 1')
    const settings = settingsResult.rows[0] || {
      animation_type: 'scroll',
      color_theme: 'yellow',
      glow_intensity: 'medium',
      speed: 'normal',
      font_style: 'mono'
    }

    console.log('✅ API: Announcements retrieved:', announcements)
    console.log('✅ API: Settings retrieved:', settings)
    console.log('✅ API: Version:', latestUpdate)
    
    // Different cache headers for meta vs data requests
    const cacheHeaders = isMetaRequest 
      ? { 'Cache-Control': 'no-store' } // Meta requests bypass cache
      : { 'Cache-Control': 'public, s-maxage=1296000, stale-while-revalidate=3600' } // Data requests use edge cache
    
    const response = NextResponse.json(
      isMetaRequest 
        ? { version: latestUpdate } // Meta requests: version only
        : { // Data requests: full response
            version: latestUpdate,
            announcements,
            settings: {
              animationType: settings.animation_type,
              colorTheme: settings.color_theme,
              glowIntensity: settings.glow_intensity,
              speed: settings.speed,
              fontStyle: settings.font_style
            }
          })
    
    // Set cache headers explicitly
    if (isMetaRequest) {
      response.headers.set('Cache-Control', 'no-store')
    } else {
      response.headers.set('Cache-Control', 'public, s-maxage=1296000, stale-while-revalidate=3600')
    }
    
    return response
  } catch (error) {
    console.error('❌ API: Error fetching announcements:', error)
    const { searchParams } = new URL(request.url)
    const isMetaRequest = searchParams.has('meta')
    
    const errorResponse = NextResponse.json(
      isMetaRequest 
        ? { version: new Date().toISOString() } // Meta error: version only
        : { // Data error: full error response
            version: new Date().toISOString(),
            announcements: [],
            settings: {
              animationType: 'scroll',
              colorTheme: 'yellow',
              glowIntensity: 'medium',
              speed: 'normal',
              fontStyle: 'mono'
            }
          }, { 
      status: 500
    })
    
    // Set cache headers explicitly on error response
    if (isMetaRequest) {
      errorResponse.headers.set('Cache-Control', 'no-store')
    } else {
      errorResponse.headers.set('Cache-Control', 'public, s-maxage=1296000, stale-while-revalidate=3600')
    }
    
    return errorResponse
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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { animationType, colorTheme, glowIntensity, speed, fontStyle } = body

    console.log('⚙️ API: Updating announcement settings:', { animationType, colorTheme, glowIntensity, speed, fontStyle })

    await client.execute({
      sql: `UPDATE announcement_settings 
            SET animation_type = ?, color_theme = ?, glow_intensity = ?, speed = ?, font_style = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = 1`,
      args: [animationType, colorTheme, glowIntensity, speed, fontStyle]
    })

    console.log('✅ API: Announcement settings updated successfully')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ API: Error updating announcement settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}