#!/usr/bin/env node

/**
 * Update Pinata Credentials Helper
 *
 * This script helps you update your Pinata API credentials
 * Run: node update-pinata-credentials.js
 */

const fs = require('fs')
const path = require('path')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer)
    })
  })
}

async function main() {
  console.log('🔑 Pinata Credentials Update Helper')
  console.log('=====================================\n')

  console.log('Make sure you have:')
  console.log('1. Created an API key at https://app.pinata.cloud/developers/api-keys')
  console.log('2. Enabled ALL permissions (pinFileToIPFS, pinJSONToIPFS, etc.)')
  console.log('3. Set unlimited or high rate limits\n')

  const apiKey = await askQuestion('Enter your Pinata API Key: ')
  const apiSecret = await askQuestion('Enter your Pinata API Secret: ')
  const jwtToken = await askQuestion('Enter your Pinata JWT Token: ')
  const gateway = await askQuestion('Enter your Pinata Gateway domain (or press enter for default): ')

  rl.close()

  if (!apiKey || !apiSecret || !jwtToken) {
    console.error('❌ All credentials are required!')
    process.exit(1)
  }

  // Read current .env.local
  const envPath = path.join(__dirname, '.env.local')
  let envContent = fs.readFileSync(envPath, 'utf8')

  // Update credentials
  envContent = envContent.replace(/PINATA_API_KEY=.*/, `PINATA_API_KEY=${apiKey}`)
  envContent = envContent.replace(/PINATA_SECRET_API_KEY=.*/, `PINATA_SECRET_API_KEY=${apiSecret}`)
  envContent = envContent.replace(/PINATA_JWT=.*/, `PINATA_JWT=${jwtToken}`)

  if (gateway) {
    envContent = envContent.replace(/PINATA_GATEWAY=.*/, `PINATA_GATEWAY=${gateway}`)
  }

  // Write back
  fs.writeFileSync(envPath, envContent)

  console.log('\n✅ Pinata credentials updated successfully!')
  console.log('🔄 Restart your development server and try uploading again.')
}

main().catch(console.error)