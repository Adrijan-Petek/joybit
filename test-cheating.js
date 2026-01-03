const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

async function testDatabase() {
  console.log('🧪 Testing Database Connection...\n')

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  try {
    // Test 1: Check if security_logs table exists
    console.log('1. Checking security_logs table...')
    const tables = await client.execute('SELECT name FROM sqlite_master WHERE type="table" AND name="security_logs"')
    if (tables.rows.length > 0) {
      console.log('✅ security_logs table exists')
    } else {
      console.log('❌ security_logs table does not exist')
      return
    }

    // Test 2: Insert a test cheating log
    console.log('\n2. Inserting test cheating log...')
    await client.execute(`
      INSERT INTO security_logs (action, type, ip, user, details)
      VALUES (?, ?, ?, ?, ?)
    `, [
      'Cheating Attempt: test_cheat',
      'cheating_attempt',
      '127.0.0.1',
      '0x1234567890abcdef',
      JSON.stringify({
        cheating_type: 'test_cheat',
        details: 'Test cheating attempt from security check',
        user_agent: 'TestAgent',
        timestamp: new Date().toISOString()
      })
    ])
    console.log('✅ Test cheating log inserted')

    // Test 3: Retrieve cheating logs
    console.log('\n3. Retrieving cheating logs...')
    const result = await client.execute(`
      SELECT * FROM security_logs
      WHERE type = 'cheating_attempt'
      ORDER BY timestamp DESC
      LIMIT 5
    `)

    console.log(`✅ Found ${result.rows.length} cheating logs:`)
    result.rows.forEach((row, i) => {
      console.log(`   ${i+1}. ${row.action} by ${row.user} at ${row.timestamp}`)
    })

    console.log('\n🎯 Database Test Complete! Security system is working.')

  } catch (error) {
    console.error('❌ Database test failed:', error.message)
  }
}

testDatabase()