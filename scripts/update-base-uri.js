const hre = require('hardhat')
const fs = require('fs')
const path = require('path')

async function main() {
  const contractAddress = process.env.NEXT_PUBLIC_ACHIEVEMENT_ERC1155_ADDRESS

  if (!contractAddress) {
    console.error('❌ Contract address not set')
    process.exit(1)
  }

  // Load base URI from folder info
  const folderInfoPath = path.join(__dirname, '../achievement-folder-info.json')
  if (!fs.existsSync(folderInfoPath)) {
    console.error('❌ achievement-folder-info.json not found')
    process.exit(1)
  }

  const folderInfo = JSON.parse(fs.readFileSync(folderInfoPath, 'utf8'))
  const baseURI = folderInfo.baseURI

  console.log('🔧 Updating contract base URI...')
  console.log('📝 Contract:', contractAddress)
  console.log('🌐 Network:', hre.network.name)
  console.log('📁 New Base URI:', baseURI)
  console.log()

  const Achievement = await hre.ethers.getContractAt('AchievementERC1155', contractAddress)
  
  console.log('📤 Sending transaction...')
  const tx = await Achievement.setBaseMetadataURI(baseURI)
  console.log('⏳ Waiting for confirmation...')
  await tx.wait()
  
  console.log('✅ Base URI updated successfully!')
  console.log('🔗 TX:', tx.hash)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
