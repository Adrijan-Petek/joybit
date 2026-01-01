const hre = require('hardhat')
const { ethers } = require('hardhat')
const fs = require('fs')
const path = require('path')

/**
 * Rarity mapping for contract
 */
const rarityMap = {
  'Common': 0,
  'Rare': 1,
  'Epic': 2,
  'Legendary': 3,
  'Mythic': 4
}

/**
 * Price mapping based on rarity (in wei) - UPDATED PRICES
 */
const priceMap = {
  'Common': ethers.parseEther('0.000034'),
  'Rare': ethers.parseEther('0.0001'),
  'Epic': ethers.parseEther('0.0005'),
  'Legendary': ethers.parseEther('0.001'),
  'Mythic': ethers.parseEther('0.0034')
}

/**
 * Load achievements from metadata file
 */
function loadAchievements() {
  const metadataPath = path.join(__dirname, '..', 'public', 'achievement-metadata.json')
  console.log('Loading from:', metadataPath)
  const data = fs.readFileSync(metadataPath, 'utf-8')
  console.log('Data length:', data.length)
  // Remove any trailing non-JSON content
  const cleanData = data.replace(/][^}]*$/, ']')
  try {
    return JSON.parse(cleanData)
  } catch (e) {
    console.error('JSON parse error:', e)
    console.log('Clean data length:', cleanData.length)
    throw e
  }
}

/**
 * Add achievements to the ERC1155 contract
 */
async function addAchievementsToContract() {
  console.log('🎯 Adding achievements to AchievementERC1155 contract...\n')

  // Get contract address
  const contractAddress = process.env.NEXT_PUBLIC_ACHIEVEMENT_ERC1155_ADDRESS || "0x3DDfe21080b8852496414535DA65AC2C3005f5DE"

  // Get contract
  const AchievementERC1155 = await ethers.getContractFactory('contracts/AchievementERC1155.sol:AchievementERC1155')
  const contract = AchievementERC1155.attach(contractAddress)
  const [owner] = await ethers.getSigners()

  console.log(`👤 Owner: ${owner.address}`)
  console.log(`📄 Contract: ${contractAddress}\n`)

  // Define achievements with rarities (simplified)
  const achievements = [
    { id: 1, rarity: 0, price: ethers.parseEther('0.0001') }, // Common
    { id: 2, rarity: 1, price: ethers.parseEther('0.0005') }, // Rare
    { id: 3, rarity: 2, price: ethers.parseEther('0.001') },  // Epic
    { id: 4, rarity: 3, price: ethers.parseEther('0.005') },  // Legendary
    { id: 5, rarity: 4, price: ethers.parseEther('0.01') },   // Mythic
    // Add more with varying rarities
  ]

  // Generate 40 achievements with cycling rarities
  for (let i = 1; i <= 40; i++) {
    const rarity = (i - 1) % 5 // Cycle through 0-4
    const price = priceMap[Object.keys(priceMap)[rarity]]
    achievements.push({ id: i, rarity, price })
  }

  // Add each achievement
  for (const achievement of achievements.slice(5)) { // Skip the first 5 duplicates
    try {
      console.log(`🎯 Adding achievement ID: ${achievement.id} - Rarity: ${achievement.rarity} - Price: ${ethers.formatEther(achievement.price)} ETH`)

      const tx = await contract.addAchievement(achievement.id, achievement.rarity, achievement.price)
      await tx.wait()

      console.log(`✅ Added: ID ${achievement.id} (${tx.hash})`)

      // Small delay between transactions
      await new Promise(resolve => setTimeout(resolve, 2000))

    } catch (error) {
      console.error(`❌ Failed to add ID ${achievement.id}:`, error.message)
    }
  }

  console.log('\n🎉 Achievement addition complete!')
  console.log('📝 Achievements are now available in the ERC1155 contract')
}

// Run the script
addAchievementsToContract()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })