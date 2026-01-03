const { createClient } = require('@libsql/client')
require('dotenv').config({ path: '.env.local' })

async function testBlockIP() {
  console.log('🧪 Testing Block IP Functionality...\n')

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  const testIP = '192.168.1.100'

  try {
    // Test 1: Block an IP
    console.log('1. Blocking test IP:', testIP)
    const blockResponse = await fetch('http://localhost:3000/api/admin/security/block-ip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip: testIP, reason: 'Test block' })
    })

    if (blockResponse.ok) {
      console.log('✅ IP blocked successfully')
    } else {
      console.log('❌ Failed to block IP:', await blockResponse.text())
    }

    // Test 2: Check if IP is in blocked_ips table
    console.log('\n2. Verifying IP is blocked in database...')
    const blockedCheck = await client.execute('SELECT * FROM blocked_ips WHERE ip = ?', [testIP])
    if (blockedCheck.rows.length > 0) {
      console.log('✅ IP found in blocked_ips table')
      console.log('   Details:', blockedCheck.rows[0])
    } else {
      console.log('❌ IP not found in blocked_ips table')
    }

    // Test 3: Check security logs
    console.log('\n3. Checking security logs...')
    const logsCheck = await client.execute('SELECT * FROM security_logs WHERE type = ? ORDER BY timestamp DESC LIMIT 1', ['ip_block'])
    if (logsCheck.rows.length > 0) {
      console.log('✅ Block action logged in security_logs')
      console.log('   Log:', logsCheck.rows[0])
    } else {
      console.log('❌ Block action not found in security logs')
    }

    // Test 4: Unblock the IP
    console.log('\n4. Unblocking test IP...')
    const unblockResponse = await fetch('http://localhost:3000/api/admin/security/unblock-ip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip: testIP })
    })

    if (unblockResponse.ok) {
      console.log('✅ IP unblocked successfully')
    } else {
      console.log('❌ Failed to unblock IP:', await unblockResponse.text())
    }

    console.log('\n🎯 Block IP Test Complete!')

  } catch (error) {
    console.error('❌ Block IP test failed:', error.message)
  }
}

// Only run if server is available
fetch('http://localhost:3000/api/admin/security')
  .then(() => {
    console.log('✅ Server is running, testing block IP functionality...\n')
    testBlockIP()
  })
  .catch(() => {
    console.log('❌ Server not running, skipping API tests')
    console.log('Run "npm run dev" first, then run this test')
  })