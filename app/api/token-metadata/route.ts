import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

// Initialize database table
async function initTable() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS token_metadata (
      address TEXT PRIMARY KEY,
      image TEXT,
      symbol TEXT
    )
  `)
}

// Call init on module load
initTable().catch(console.error)

export async function GET() {
  try {
    console.log('🔍 API: Getting token metadata from Turso...')
    const result = await client.execute('SELECT address, image, symbol FROM token_metadata')
    
    const tokenMetadata: Record<string, { image: string; symbol: string }> = {}
    result.rows.forEach(row => {
      tokenMetadata[row.address as string] = {
        image: row.image as string || '',
        symbol: row.symbol as string || 'TOKEN'
      }
    })
    
    console.log('✅ API: Token metadata retrieved:', tokenMetadata)
    return NextResponse.json(tokenMetadata)
  } catch (error) {
    console.error('❌ API: Error fetching token metadata:', error)
    return NextResponse.json({}, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address, image, symbol } = body
    console.log('📝 API: Saving token metadata:', { address, image, symbol })

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 })
    }

    // Insert or update token metadata
    await client.execute({
      sql: 'INSERT OR REPLACE INTO token_metadata (address, image, symbol) VALUES (?, ?, ?)',
      args: [address.toLowerCase(), image || '', symbol || 'TOKEN']
    })

    console.log('💾 API: Token metadata saved to Turso')

    // Get all metadata to return
    const result = await client.execute('SELECT address, image, symbol FROM token_metadata')
    const tokenMetadata: Record<string, { image: string; symbol: string }> = {}
    result.rows.forEach(row => {
      tokenMetadata[row.address as string] = {
        image: row.image as string || '',
        symbol: row.symbol as string || 'TOKEN'
      }
    })

    return NextResponse.json({ success: true, data: tokenMetadata })
  } catch (error) {
    console.error('❌ API: Error saving token metadata:', error)
    return NextResponse.json({ error: 'Failed to save token metadata' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 })
    }

    // Delete token metadata
    await client.execute({
      sql: 'DELETE FROM token_metadata WHERE address = ?',
      args: [address.toLowerCase()]
    })

    // Get all metadata to return
    const result = await client.execute('SELECT address, image, symbol FROM token_metadata')
    const tokenMetadata: Record<string, { image: string; symbol: string }> = {}
    result.rows.forEach(row => {
      tokenMetadata[row.address as string] = {
        image: row.image as string || '',
        symbol: row.symbol as string || 'TOKEN'
      }
    })

    return NextResponse.json({ success: true, data: tokenMetadata })
  } catch (error) {
    console.error('Error deleting token metadata:', error)
    return NextResponse.json({ error: 'Failed to delete token metadata' }, { status: 500 })
  }
}
