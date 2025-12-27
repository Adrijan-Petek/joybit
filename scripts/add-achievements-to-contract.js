const hre = require('hardhat')
const { ethers } = require('hardhat')
const fs = require('fs')
const path = require('path')

interface Achievement {
  id: string
  name: string
  description: string
  rarity: string
  emoji: string
  category: string
  color: string
}

interface UploadResult {
  id: string
  metadataUrl: string
}

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
 * Price mapping based on rarity (in wei)
 */
const priceMap = {
  'Common': ethers.parseEther('0.001'),
  'Rare': ethers.parseEther('0.005'),
  'Epic': ethers.parseEther('0.01'),
  'Legendary': ethers.parseEther('0.05'),
  'Mythic': ethers.parseEther('0.1')
}

/**
 * Load achievements from metadata file
 */
function loadAchievements(): Achievement[] {
  const metadataPath = path.join(__dirname, '..', 'public', 'achievement-metadata.json')
  return JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
}

/**
 * Load upload results
 */
function loadUploadResults(): UploadResult[] {
  const resultsPath = path.join(__dirname, '..', 'public', 'achievement-upload-results.json')
  return JSON.parse(fs.readFileSync(resultsPath, 'utf-8'))
}

/**
 * Add achievements to the NFT contract
 */
async function addAchievementsToContract() {
  console.log('🎯 Adding achievements to NFT contract...\n')

  // Load data
  const achievements = loadAchievements()
  const uploadResults = loadUploadResults()

  console.log(`📊 Found ${achievements.length} achievements`)
  console.log(`📤 Found ${uploadResults.length} upload results`)

  // Create lookup map for metadata URLs
  const metadataMap = new Map(uploadResults.map(r => [r.id, r.metadataUrl]))

  // Get contract
  const AchievementNFT = await ethers.getContractFactory('AchievementNFT')

  // Check deployments to find the contract address
  const deploymentsPath = path.join(__dirname, '..', 'deployments')
  let contractAddress: string | null = null

  // Try achievement NFT deployment first
  const achievementDeployment = path.join(deploymentsPath, 'achievement-nft-deployment.json')
  if (fs.existsSync(achievementDeployment)) {
    const deployment = JSON.parse(fs.readFileSync(achievementDeployment, 'utf-8'))
    if (deployment.achievementNFT) {
      contractAddress = deployment.achievementNFT
      console.log('🎯 Using achievement NFT deployment:', contractAddress)
    }
  }

  // Try testnet deployment as fallback
  if (!contractAddress) {
    const testnetDeployment = path.join(deploymentsPath, 'testnet-deployment.json')
    if (fs.existsSync(testnetDeployment)) {
      const deployment = JSON.parse(fs.readFileSync(testnetDeployment, 'utf-8'))
      if (deployment.AchievementNFT) {
        contractAddress = deployment.AchievementNFT
        console.log('🎯 Using testnet deployment:', contractAddress)
      }
    }
  }

  if (!contractAddress) {
    throw new Error('AchievementNFT contract not found in deployments')
  }

  const contract = AchievementNFT.attach(contractAddress)
  const [owner] = await ethers.getSigners()

  console.log(`👤 Owner: ${owner.address}`)
  console.log(`📄 Contract: ${contractAddress}\n`)

  // Add each achievement
  for (const achievement of achievements) {
    try {
      const metadataUrl = metadataMap.get(achievement.id)
      if (!metadataUrl) {
        console.error(`❌ No metadata URL found for ${achievement.id}`)
        continue
      }

      console.log(`🎯 Adding achievement: ${achievement.name} (${achievement.id})`)

      // Skip existence check for now - just try to add
      const rarity = rarityMap[achievement.rarity as keyof typeof rarityMap]
      const price = priceMap[achievement.rarity as keyof typeof priceMap]

      const tx = await contract.addAchievement(
        achievement.id,
        achievement.name,
        achievement.description,
        rarity,
        achievement.emoji,
        metadataUrl,
        price
      )

      await tx.wait()
      console.log(`✅ Added: ${achievement.id} (${tx.hash})`)

      // Small delay between transactions
      await new Promise(resolve => setTimeout(resolve, 1000))

    } catch (error) {
      console.error(`❌ Failed to add ${achievement.id}:`, error)
    }
  }

  console.log('\n🎉 Achievement addition complete!')
  console.log('📝 Achievements are now linked to the NFT contract')
}

// Run the script
addAchievementsToContract()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })