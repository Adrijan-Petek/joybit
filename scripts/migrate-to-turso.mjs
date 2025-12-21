import { createClient } from '@libsql/client'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const tursoUrl = process.env.TURSO_DATABASE_URL
const tursoToken = process.env.TURSO_AUTH_TOKEN

if (!tursoUrl || !tursoToken) {
  console.error('❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN environment variables')
  console.error('Please make sure your .env.local file contains the Turso credentials')
  process.exit(1)
}

const client = createClient({
  url: tursoUrl,
  authToken: tursoToken,
})

// Initialize database tables
async function initTables() {
  console.log('🏗️  Creating database tables...')

  await client.execute(`
    CREATE TABLE IF NOT EXISTS match3_stats (
      address TEXT PRIMARY KEY,
      data TEXT NOT NULL
    )
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS leaderboard_scores (
      address TEXT PRIMARY KEY,
      score INTEGER NOT NULL
    )
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS leaderboard_users (
      address TEXT PRIMARY KEY,
      username TEXT,
      pfp TEXT
    )
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS token_metadata (
      address TEXT PRIMARY KEY,
      image TEXT,
      symbol TEXT
    )
  `)

  console.log('✅ Tables created successfully')
}

// Migrate data from JSON files (if available)
async function migrateFromJSON() {
  const migrationDir = path.join(process.cwd(), 'migration-data')

  // Migrate match3 stats
  const match3Path = path.join(migrationDir, 'match3-stats.json')
  if (fs.existsSync(match3Path)) {
    console.log('📊 Migrating match3 stats...')
    const match3Data = JSON.parse(fs.readFileSync(match3Path, 'utf8'))
    for (const [address, stats] of Object.entries(match3Data)) {
      await client.execute({
        sql: 'INSERT OR REPLACE INTO match3_stats (address, data) VALUES (?, ?)',
        args: [address.toLowerCase(), JSON.stringify(stats)]
      })
    }
    console.log(`✅ Migrated ${Object.keys(match3Data).length} match3 stats`)
  }

  // Migrate leaderboard
  const leaderboardPath = path.join(migrationDir, 'leaderboard.json')
  if (fs.existsSync(leaderboardPath)) {
    console.log('🏆 Migrating leaderboard...')
    const leaderboardData = JSON.parse(fs.readFileSync(leaderboardPath, 'utf8'))
    for (const entry of leaderboardData) {
      await client.execute({
        sql: 'INSERT OR REPLACE INTO leaderboard_scores (address, score) VALUES (?, ?)',
        args: [entry.address, entry.score]
      })
      if (entry.username || entry.pfp) {
        await client.execute({
          sql: 'INSERT OR REPLACE INTO leaderboard_users (address, username, pfp) VALUES (?, ?, ?)',
          args: [entry.address, entry.username || null, entry.pfp || null]
        })
      }
    }
    console.log(`✅ Migrated ${leaderboardData.length} leaderboard entries`)
  }

  // Migrate token metadata
  const tokenPath = path.join(migrationDir, 'token-metadata.json')
  if (fs.existsSync(tokenPath)) {
    console.log('🪙 Migrating token metadata...')
    const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'))
    for (const [address, metadata] of Object.entries(tokenData)) {
      await client.execute({
        sql: 'INSERT OR REPLACE INTO token_metadata (address, image, symbol) VALUES (?, ?, ?)',
        args: [address.toLowerCase(), metadata.image || '', metadata.symbol || 'TOKEN']
      })
    }
    console.log(`✅ Migrated ${Object.keys(tokenData).length} token metadata entries`)
  }
}

// Main migration function
async function migrate() {
  try {
    console.log('🚀 Starting database migration to Turso...')

    await initTables()
    await migrateFromJSON()

    console.log('🎉 Migration completed successfully!')

    // Verify migration
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'")
    console.log('📋 Created tables:', tables.rows.map(r => r.name))

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

migrate()