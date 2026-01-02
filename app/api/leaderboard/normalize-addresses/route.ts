import { NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

export async function POST() {
  try {
    console.log('🔄 Starting address normalization...')

    // Normalize user_stats addresses
    const statsResult = await client.execute('SELECT user_address FROM user_stats')
    console.log(`📊 Found ${statsResult.rows.length} user_stats entries`)
    
    for (const row of statsResult.rows) {
      const oldAddress = row.user_address as string
      const normalizedAddress = oldAddress.toLowerCase()
      
      if (oldAddress !== normalizedAddress) {
        console.log(`Normalizing stats: ${oldAddress} -> ${normalizedAddress}`)
        
        // Update the address
        await client.execute({
          sql: 'UPDATE user_stats SET user_address = ? WHERE user_address = ?',
          args: [normalizedAddress, oldAddress]
        })
      }
    }

    // Normalize user_achievements addresses
    const achievementsResult = await client.execute('SELECT DISTINCT user_address FROM user_achievements')
    console.log(`🏆 Found ${achievementsResult.rows.length} user_achievements entries`)
    
    for (const row of achievementsResult.rows) {
      const oldAddress = row.user_address as string
      const normalizedAddress = oldAddress.toLowerCase()
      
      if (oldAddress !== normalizedAddress) {
        console.log(`Normalizing achievements: ${oldAddress} -> ${normalizedAddress}`)
        
        await client.execute({
          sql: 'UPDATE user_achievements SET user_address = ? WHERE user_address = ?',
          args: [normalizedAddress, oldAddress]
        })
      }
    }

    // Normalize leaderboard_scores addresses
    const scoresResult = await client.execute('SELECT address FROM leaderboard_scores')
    console.log(`📈 Found ${scoresResult.rows.length} leaderboard_scores entries`)
    
    for (const row of scoresResult.rows) {
      const oldAddress = row.address as string
      const normalizedAddress = oldAddress.toLowerCase()
      
      if (oldAddress !== normalizedAddress) {
        console.log(`Normalizing scores: ${oldAddress} -> ${normalizedAddress}`)
        
        await client.execute({
          sql: 'UPDATE leaderboard_scores SET address = ? WHERE address = ?',
          args: [normalizedAddress, oldAddress]
        })
      }
    }

    // Normalize leaderboard_users addresses
    const usersResult = await client.execute('SELECT address FROM leaderboard_users')
    console.log(`👥 Found ${usersResult.rows.length} leaderboard_users entries`)
    
    for (const row of usersResult.rows) {
      const oldAddress = row.address as string
      const normalizedAddress = oldAddress.toLowerCase()
      
      if (oldAddress !== normalizedAddress) {
        console.log(`Normalizing users: ${oldAddress} -> ${normalizedAddress}`)
        
        await client.execute({
          sql: 'UPDATE leaderboard_users SET address = ? WHERE address = ?',
          args: [normalizedAddress, oldAddress]
        })
      }
    }

    console.log('✅ Address normalization complete!')

    return NextResponse.json({
      success: true,
      message: 'All addresses normalized to lowercase'
    })
  } catch (error) {
    console.error('❌ Error normalizing addresses:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
