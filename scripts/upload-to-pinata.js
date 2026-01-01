const fs = require('fs')
const path = require('path')
const FormData = require('form-data')
const axios = require('axios')
require('dotenv').config({ path: '.env.local' })

const { achievements } = require('./generate-achievement-cards')

const PINATA_API_KEY = process.env.PINATA_API_KEY
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY
const PINATA_JWT = process.env.PINATA_JWT

async function uploadImageToPinata(filePath, filename) {
  const formData = new FormData()
  formData.append('file', fs.createReadStream(filePath))
  
  const metadata = JSON.stringify({
    name: filename
  })
  formData.append('pinataMetadata', metadata)

  const options = JSON.stringify({
    cidVersion: 0
  })
  formData.append('pinataOptions', options)

  try {
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        maxBodyLength: Infinity,
        headers: {
          'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
          'Authorization': `Bearer ${PINATA_JWT}`
        }
      }
    )
    return response.data.IpfsHash
  } catch (error) {
    console.error(`Error uploading ${filename}:`, error.response?.data || error.message)
    throw error
  }
}

async function uploadMetadataToPinata(metadata, filename) {
  try {
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      metadata,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PINATA_JWT}`
        }
      }
    )
    return response.data.IpfsHash
  } catch (error) {
    console.error(`Error uploading metadata ${filename}:`, error.response?.data || error.message)
    throw error
  }
}

async function uploadAllToIPFS() {
  console.log('🚀 Starting IPFS upload to Pinata...\n')

  if (!PINATA_JWT) {
    console.error('❌ PINATA_JWT not found in .env.local')
    process.exit(1)
  }

  const cardsDir = path.join(__dirname, '../public/achievement-cards')
  const results = []

  // Upload images and create metadata
  for (const achievement of achievements) {
    try {
      console.log(`📤 Uploading achievement ${achievement.id}: ${achievement.name}...`)
      
      // Upload image
      const imagePath = path.join(cardsDir, `${achievement.id}.png`)
      const imageHash = await uploadImageToPinata(imagePath, `achievement-${achievement.id}.png`)
      console.log(`  ✅ Image uploaded: ipfs://${imageHash}`)

      // Create metadata
      const metadata = {
        name: achievement.name,
        description: achievement.description,
        image: `ipfs://${imageHash}`,
        external_url: `https://joybit.xyz/achievements/${achievement.id}`,
        attributes: [
          {
            trait_type: 'Rarity',
            value: achievement.rarity
          },
          {
            trait_type: 'Category',
            value: achievement.category
          },
          {
            trait_type: 'Requirement',
            value: achievement.requirement
          },
          {
            trait_type: 'Emoji',
            value: achievement.emoji
          }
        ]
      }

      // Upload metadata
      const metadataHash = await uploadMetadataToPinata(metadata, `achievement-${achievement.id}.json`)
      console.log(`  ✅ Metadata uploaded: ipfs://${metadataHash}`)

      results.push({
        id: achievement.id,
        name: achievement.name,
        rarity: achievement.rarity,
        imageHash,
        imageUrl: `ipfs://${imageHash}`,
        metadataHash,
        metadataUrl: `ipfs://${metadataHash}/`,
        gatewayUrl: `https://gateway.pinata.cloud/ipfs/${metadataHash}`
      })

      console.log(`  ✨ Achievement ${achievement.id} complete!\n`)
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      console.error(`❌ Failed to upload achievement ${achievement.id}:`, error.message)
    }
  }

  // Save results
  const resultsPath = path.join(__dirname, '../achievement-ipfs-results.json')
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2))
  console.log(`\n✅ Upload complete! Results saved to: ${resultsPath}`)

  // Display base URI for contract
  if (results.length > 0) {
    // All metadata will be in the same format, just use the directory
    console.log('\n📝 Contract Configuration:')
    console.log('Base Metadata URI: ipfs://YOUR_FOLDER_HASH/')
    console.log('\nNote: You can create a folder on Pinata and upload all JSON files there,')
    console.log('      or use individual hashes. Update the contract accordingly.')
  }

  return results
}

// Run if called directly
if (require.main === module) {
  uploadAllToIPFS().catch(console.error)
}

module.exports = { uploadAllToIPFS }
