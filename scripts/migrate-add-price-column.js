require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@libsql/client')

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function migrateDatabase() {
  try {
    console.log('🔄 Starting database migration...')

    // Check if price column exists
    const checkColumn = await client.execute(`
      PRAGMA table_info(achievements)
    `)

    const hasPriceColumn = checkColumn.rows.some(row => row.name === 'price')

    if (!hasPriceColumn) {
      console.log('📝 Adding price column to achievements table...')

      // Add price column to achievements table
      await client.execute(`
        ALTER TABLE achievements ADD COLUMN price TEXT
      `)

      console.log('✅ Price column added successfully')
    } else {
      console.log('ℹ️ Price column already exists')
    }

    console.log('🎉 Database migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

migrateDatabase()