const fs = require('fs')
const path = require('path')

// Import achievements data
const { achievements } = require('./generate-achievement-cards')

// Read the IPFS results
const resultsPath = path.join(__dirname, '../achievement-ipfs-results.json')
const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'))

// Create metadata folder
const metadataDir = path.join(__dirname, '../achievement-metadata')
if (!fs.existsSync(metadataDir)) {
  fs.mkdirSync(metadataDir, { recursive: true })
}

console.log('📁 Creating metadata JSON files for Pinata folder...\n')

results.forEach(result => {
  // Find matching achievement data
  const achievement = achievements.find(a => a.id === result.id)
  
  const metadata = {
    name: result.name,
    description: achievement?.description || `${result.name} - A rare Joybit achievement that showcases your gaming prowess.`,
    image: result.imageUrl,
    attributes: [
      {
        trait_type: "Rarity",
        value: result.rarity
      },
      {
        trait_type: "Category",
        value: achievement?.category || 'general'
      },
      {
        trait_type: "Achievement ID",
        value: result.id
      },
      {
        trait_type: "Requirement",
        value: achievement?.requirement || 'Complete the challenge'
      }
    ]
  }
  
  const filename = `${result.id}.json`
  const filepath = path.join(metadataDir, filename)
  fs.writeFileSync(filepath, JSON.stringify(metadata, null, 2))
  console.log(`✅ Created: ${filename} - ${result.name}`)
})

console.log(`\n✅ All metadata files created in ${metadataDir}`)
console.log('\n📤 Next steps:')
console.log('1. Go to https://app.pinata.cloud/pinmanager')
console.log('2. Click "Upload" → "Folder"')
console.log('3. Select the "achievement-metadata" folder')
console.log('4. Name it "joybit-achievement-metadata"')
console.log('5. Click Upload')
console.log('6. Copy the CID (folder hash)')
console.log('7. Use as base URI: ipfs://YOUR_FOLDER_CID/')
