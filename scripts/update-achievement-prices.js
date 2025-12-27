const hre = require('hardhat')
const { ethers } = require('hardhat')
const fs = require('fs')
const path = require('path')

/**
 * Price mapping based on rarity (in wei) - REDUCED PRICES
 */
const priceMap = {
  'Common': ethers.parseEther('0.0001'),
  'Rare': ethers.parseEther('0.0005'),
  'Epic': ethers.parseEther('0.001'),
  'Legendary': ethers.parseEther('0.005'),
  'Mythic': ethers.parseEther('0.01')
}

/**
 * Load achievements from metadata file
 */
function loadAchievements() {
  const metadataPath = path.join(__dirname, '..', 'public', 'achievement-metadata.json')
  return JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
}

/**
 * Update achievement prices in the contract
 */
async function updateAchievementPrices() {
  console.log('💰 Updating achievement prices to lower values...\n')

  // Connect to Base mainnet
  const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org')
  const privateKey = process.env.PRIVATE_KEY.startsWith('0x') ? process.env.PRIVATE_KEY.slice(2) : process.env.PRIVATE_KEY
  const signer = new ethers.Wallet(privateKey, provider)
  
  console.log('👤 Using account:', signer.address)
  console.log('🌐 Connected to:', process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org')

  // Load achievements
  const achievements = loadAchievements()
  console.log(`📊 Found ${achievements.length} achievements to update`)

  // Get contract
  const contractAddress = process.env.NEXT_PUBLIC_ACHIEVEMENT_NFT_ADDRESS
  if (!contractAddress) {
    console.error('❌ Achievement NFT contract address not found in environment')
    process.exit(1)
  }

  console.log('🎯 Contract address:', contractAddress)

  // Get contract instance
  const AchievementNFT = await ethers.getContractFactory('AchievementNFT')
  const contract = AchievementNFT.attach(contractAddress).connect(signer)

  console.log('\n🔄 Updating achievement prices...\n')

  for (const achievement of achievements) {
    try {
      const newPrice = priceMap[achievement.rarity]
      if (!newPrice) {
        console.log(`⚠️  Unknown rarity "${achievement.rarity}" for ${achievement.id}, skipping`)
        continue
      }

      console.log(`📝 Updating ${achievement.id} (${achievement.rarity}) -> ${ethers.formatEther(newPrice)} ETH`)

      // Update the achievement price
      const tx = await contract.updateAchievement(achievement.id, newPrice, true)
      await tx.wait()

      console.log(`✅ Updated ${achievement.id}\n`)

      // Small delay to avoid overwhelming the network
      await new Promise(resolve => setTimeout(resolve, 1000))

    } catch (error) {
      console.error(`❌ Failed to update ${achievement.id}:`, error.message)
    }
  }

  console.log('\n🎉 Achievement price updates completed!')
  console.log('\n💡 New price structure:')
  console.log('   Common: 0.0001 ETH')
  console.log('   Rare: 0.0005 ETH')
  console.log('   Epic: 0.001 ETH')
  console.log('   Legendary: 0.005 ETH')
  console.log('   Mythic: 0.01 ETH')
}

// Run the script
if (require.main === module) {
  updateAchievementPrices()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

module.exports = { updateAchievementPrices }