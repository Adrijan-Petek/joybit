const fs = require('fs')
const path = require('path')
const FormData = require('form-data')
const axios = require('axios')
require('dotenv').config({ path: '.env.local' })

const PINATA_API_KEY = process.env.PINATA_API_KEY
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY

if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
  console.error('❌ Error: PINATA_API_KEY and PINATA_SECRET_API_KEY must be set in .env.local')
  process.exit(1)
}

async function uploadFolderToPinata() {
  console.log('📁 Uploading metadata folder to Pinata...\n')
  
  const metadataDir = path.join(__dirname, '../achievement-metadata')
  
  if (!fs.existsSync(metadataDir)) {
    console.error('❌ Error: achievement-metadata folder not found. Run npm run create-metadata first.')
    process.exit(1)
  }

  const form = new FormData()
  
  // Add all JSON files from the folder
  const files = fs.readdirSync(metadataDir).filter(f => f.endsWith('.json'))
  
  console.log(`Found ${files.length} metadata files to upload...\n`)
  
  files.forEach(filename => {
    const filepath = path.join(metadataDir, filename)
    form.append('file', fs.createReadStream(filepath), {
      filepath: `joybit-achievement-metadata/${filename}`
    })
  })

  // Add metadata
  const metadata = JSON.stringify({
    name: 'joybit-achievement-metadata',
    keyvalues: {
      project: 'joybit',
      type: 'achievement-metadata',
      count: files.length.toString()
    }
  })
  form.append('pinataMetadata', metadata)

  const pinataOptions = JSON.stringify({
    wrapWithDirectory: false
  })
  form.append('pinataOptions', pinataOptions)

  try {
    console.log('📤 Uploading folder to IPFS...')
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      form,
      {
        maxBodyLength: Infinity,
        headers: {
          'Content-Type': `multipart/form-data; boundary=${form._boundary}`,
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET_API_KEY
        }
      }
    )

    const folderHash = response.data.IpfsHash
    console.log(`\n✅ Folder uploaded successfully!`)
    console.log(`\n📋 IPFS Details:`)
    console.log(`Folder CID: ${folderHash}`)
    console.log(`Base URI: ipfs://${folderHash}/`)
    console.log(`Gateway URL: https://gateway.pinata.cloud/ipfs/${folderHash}/`)
    console.log(`\nExample metadata URL: ipfs://${folderHash}/1.json`)
    console.log(`\n📝 Save this base URI for contract deployment: ipfs://${folderHash}/`)
    
    // Save the folder hash
    const folderInfo = {
      folderHash,
      baseURI: `ipfs://${folderHash}/`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${folderHash}/`,
      uploadedAt: new Date().toISOString(),
      fileCount: files.length
    }
    
    const outputPath = path.join(__dirname, '../achievement-folder-info.json')
    fs.writeFileSync(outputPath, JSON.stringify(folderInfo, null, 2))
    console.log(`\n💾 Folder info saved to: ${outputPath}`)

  } catch (error) {
    console.error('❌ Error uploading folder:', error.response?.data || error.message)
    process.exit(1)
  }
}

uploadFolderToPinata()
