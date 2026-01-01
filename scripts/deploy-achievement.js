const hre = require('hardhat')
const fs = require('fs')
const path = require('path')

async function main() {
  console.log('🚀 Deploying AchievementERC1155 contract...\n')

  // Get deployment info from env
  const treasuryAddress = process.env.NEXT_PUBLIC_TREASURY_ADDRESS
  
  if (!treasuryAddress) {
    throw new Error('NEXT_PUBLIC_TREASURY_ADDRESS not set in .env.local')
  }

  // Try to load folder info for base URI
  let baseMetadataURI = 'ipfs://PLACEHOLDER/'
  try {
    const folderInfoPath = path.join(__dirname, '../achievement-folder-info.json')
    if (fs.existsSync(folderInfoPath)) {
      const folderInfo = JSON.parse(fs.readFileSync(folderInfoPath, 'utf8'))
      baseMetadataURI = folderInfo.baseURI
      console.log('✅ Loaded base URI from folder info')
    }
  } catch (err) {
    console.log('⚠️  No folder info found, using placeholder')
  }

  console.log('📝 Configuration:')
  console.log('  Treasury:', treasuryAddress)
  console.log('  Network:', hre.network.name)
  console.log('  Chain ID:', hre.network.config.chainId)
  console.log('  Base URI:', baseMetadataURI)
  
  if (baseMetadataURI === 'ipfs://PLACEHOLDER/') {
    console.log('  ⚠️  Note: Update base URI after deployment using setBaseMetadataURI\n')
  } else {
    console.log('  ✅ Base URI configured\n')
  }

  // Deploy contract
  console.log('📤 Deploying contract...')
  const AchievementERC1155 = await hre.ethers.getContractFactory('AchievementERC1155')
  const achievement = await AchievementERC1155.deploy(treasuryAddress, baseMetadataURI)

  await achievement.waitForDeployment()
  const achievementAddress = await achievement.getAddress()

  console.log('✅ AchievementERC1155 deployed to:', achievementAddress)

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    achievementERC1155: achievementAddress,
    treasury: treasuryAddress,
    baseMetadataURI: baseMetadataURI,
    timestamp: new Date().toISOString(),
    deployer: (await hre.ethers.getSigners())[0].address
  }

  const fs = require('fs')
  const path = require('path')
  const deploymentsDir = path.join(__dirname, '../deployments')
  
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true })
  }

  const deploymentPath = path.join(deploymentsDir, 'achievement-deployment.json')
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2))
  console.log(`\n📄 Deployment info saved to: ${deploymentPath}`)

  // Update .env.local
  console.log('\n📝 Update your .env.local file:')
  console.log(`NEXT_PUBLIC_ACHIEVEMENT_ERC1155_ADDRESS=${achievementAddress}`)

  console.log('\n🎯 Next steps:')
  console.log('1. Generate achievement cards: npm run generate-cards')
  console.log('2. Upload to Pinata: npm run upload-ipfs')
  console.log('3. Update contract base URI with Pinata folder hash')
  console.log('4. Add achievements via admin panel')
  console.log('5. Verify contract on BaseScan (optional)')

  // Verification command
  console.log('\n🔍 To verify on BaseScan:')
  console.log(`npx hardhat verify --network base ${achievementAddress} "${treasuryAddress}" "${baseMetadataURI}"`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
