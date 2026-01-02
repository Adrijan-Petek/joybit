import { NextResponse } from 'next/server'
import { createClient } from '@libsql/client'
import { calculateUserScore } from '@/lib/db/achievements'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

export async function POST() {
  try {
    console.log('🔄 Recalculating all leaderboard scores...')
    
    // Get all unique addresses from user_stats (normalize to lowercase)
    const allUsersResult = await client.execute(`
      SELECT DISTINCT LOWER(user_address) as user_address FROM user_stats
    `)
    
    let recalculated = 0
    const results = []
    
    // First, clean up duplicate entries with different casing
    console.log('🧹 Cleaning up duplicate entries...')
    const allScoresResult = await client.execute('SELECT address FROM leaderboard_scores')
    const addressMap = new Map<string, string>()
    
    for (const row of allScoresResult.rows) {
      const addr = row.address as string
      const lower = addr.toLowerCase()
      if (!addressMap.has(lower)) {
        addressMap.set(lower, addr)
      } else {
        // Delete duplicate with different casing
        await client.execute({
          sql: 'DELETE FROM leaderboard_scores WHERE address = ?',
          args: [addr]
        })
        console.log(`🗑️ Removed duplicate: ${addr}`)
      }
    }
    
    // Recalculate scores for all users
    for (const row of allUsersResult.rows) {
      const userAddress = (row.user_address as string).toLowerCase()
      const newScore = await calculateUserScore(userAddress)
      
      // Delete all variations first
      await client.execute({
        sql: 'DELETE FROM leaderboard_scores WHERE LOWER(address) = ?',
        args: [userAddress]
      })
      
      // Insert with lowercase address
      await client.execute({
        sql: 'INSERT INTO leaderboard_scores (address, score) VALUES (?, ?)',
        args: [userAddress, newScore]
      })
      
      // Normalize user data addresses too
      await client.execute({
        sql: 'UPDATE leaderboard_users SET address = ? WHERE LOWER(address) = ?',
        args: [userAddress, userAddress]
      })
      
      results.push({ address: userAddress, score: newScore })
      recalculated++
      
      console.log(`✅ ${userAddress}: ${newScore} points`)
    }
    
    console.log(`✅ Recalculated ${recalculated} user scores`)
    return NextResponse.json({ 
      success: true, 
      recalculated,
      results 
    })
  } catch (error) {
    console.error('Error recalculating scores:', error)
    return NextResponse.json({ 
      error: 'Failed to recalculate scores',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
