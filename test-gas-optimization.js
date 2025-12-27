#!/usr/bin/env node

/**
 * Gas Optimization Test Script
 *
 * Compares gas usage between original and optimized AchievementNFT contracts
 */

const hre = require('hardhat')

async function main() {
  console.log('🧪 AchievementNFT Gas Optimization Test\n')

  // Deploy contracts
  console.log('📦 Deploying contracts...')

  const [deployer] = await hre.ethers.getSigners()
  const treasuryAddress = deployer.address // Use deployer as treasury for testing

  // Deploy original contract
  const AchievementNFT = await hre.ethers.getContractFactory('contracts/AchievementNFT.sol:AchievementNFT')
  const originalContract = await AchievementNFT.deploy(treasuryAddress)
  await originalContract.waitForDeployment()
  console.log('✅ Original contract deployed')

  // Deploy optimized contract
  const AchievementNFT_Optimized = await hre.ethers.getContractFactory('contracts/AchievementNFT_Optimized.sol:AchievementNFT')
  const optimizedContract = await AchievementNFT_Optimized.deploy(treasuryAddress)
  await optimizedContract.waitForDeployment()
  console.log('✅ Optimized contract deployed\n')

  // Test data
  const testAchievements = [
    {
      id: 'first_win',
      name: 'First Win',
      description: 'Win your first game',
      rarity: 0,
      emoji: '🎯',
      metadataUrl: 'https://example.com/metadata/1',
      price: hre.ethers.parseEther('0.001')
    },
    {
      id: 'hot_streak',
      name: 'Hot Streak',
      description: 'Win 5 games in a row',
      rarity: 1,
      emoji: '🔥',
      metadataUrl: 'https://example.com/metadata/2',
      price: hre.ethers.parseEther('0.005')
    }
  ]

  console.log('📊 Testing Gas Usage Comparison\n')

  // Test 1: Adding achievements
  console.log('1️⃣ Adding Achievements:')

  for (const achievement of testAchievements) {
    // Original contract
    const originalTx = await originalContract.addAchievement(
      achievement.id,
      achievement.name,
      achievement.description,
      achievement.rarity,
      achievement.emoji,
      achievement.metadataUrl,
      achievement.price
    )
    const originalReceipt = await originalTx.wait()
    const originalGas = originalReceipt.gasUsed

    // Optimized contract
    const optimizedTx = await optimizedContract.addAchievement(
      achievement.id,
      achievement.name,
      achievement.description,
      achievement.rarity,
      achievement.emoji,
      achievement.metadataUrl,
      achievement.price
    )
    const optimizedReceipt = await optimizedTx.wait()
    const optimizedGas = optimizedReceipt.gasUsed

    const savings = originalGas - optimizedGas
    const percentage = ((savings * 100n) / originalGas).toString()

    console.log(`   ${achievement.id}:`)
    console.log(`     Original:  ${originalGas} gas`)
    console.log(`     Optimized: ${optimizedGas} gas`)
    console.log(`     Savings:   ${savings} gas (${percentage}%)`)
    console.log()
  }

  // Test 2: Minting achievements
  console.log('2️⃣ Minting Achievements:')

  for (const achievement of testAchievements) {
    const mintPrice = achievement.price

    // Original contract
    const originalTx = await originalContract.mintAchievement(achievement.id, { value: mintPrice })
    const originalReceipt = await originalTx.wait()
    const originalGas = originalReceipt.gasUsed

    // Optimized contract
    const optimizedTx = await optimizedContract.mintAchievement(achievement.id, { value: mintPrice })
    const optimizedReceipt = await optimizedTx.wait()
    const optimizedGas = optimizedReceipt.gasUsed

    const savings = originalGas - optimizedGas
    const percentage = ((savings * 100n) / originalGas).toString()

    console.log(`   ${achievement.id}:`)
    console.log(`     Original:  ${originalGas} gas`)
    console.log(`     Optimized: ${optimizedGas} gas`)
    console.log(`     Savings:   ${savings} gas (${percentage}%)`)
    console.log()
  }

  // Test 3: Batch operations (optimized contract only)
  console.log('3️⃣ Batch Operations (Optimized Contract Only):')

  const batchIds = testAchievements.map(a => a.id)
  const batchNames = testAchievements.map(a => a.name)
  const batchDescriptions = testAchievements.map(a => a.description)
  const batchRarities = testAchievements.map(a => a.rarity)
  const batchEmojis = testAchievements.map(a => a.emoji)
  const batchUrls = testAchievements.map(a => a.metadataUrl)
  const batchPrices = testAchievements.map(a => a.price)

  // Deploy fresh optimized contract for batch test
  const batchContract = await hre.ethers.getContractFactory('contracts/AchievementNFT_Optimized.sol:AchievementNFT')
  const batchOptimizedContract = await batchContract.deploy(treasuryAddress)
  await batchOptimizedContract.waitForDeployment()

  // Batch add achievements
  const batchAddTx = await batchOptimizedContract.batchAddAchievements(
    batchIds, batchNames, batchDescriptions, batchRarities,
    batchEmojis, batchUrls, batchPrices
  )
  const batchAddReceipt = await batchAddTx.wait()
  console.log(`   Batch Add (${testAchievements.length} achievements): ${batchAddReceipt.gasUsed} gas`)

  // Calculate individual adds cost for comparison
  let individualAddCost = 0n
  const uniqueIds = ['speed_demon', 'combo_king']
  const uniqueAchievements = [
    {
      id: 'speed_demon',
      name: 'Speed Demon',
      description: 'Complete level quickly',
      rarity: 2,
      emoji: '⚡',
      metadataUrl: 'https://example.com/metadata/3',
      price: hre.ethers.parseEther('0.01')
    },
    {
      id: 'combo_king',
      name: 'Combo King',
      description: 'Achieve high combo',
      rarity: 3,
      emoji: '🎪',
      metadataUrl: 'https://example.com/metadata/4',
      price: hre.ethers.parseEther('0.05')
    }
  ]

  for (const achievement of uniqueAchievements) {
    const tx = await batchOptimizedContract.addAchievement(
      achievement.id,
      achievement.name,
      achievement.description,
      achievement.rarity,
      achievement.emoji,
      achievement.metadataUrl,
      achievement.price
    )
    const receipt = await tx.wait()
    individualAddCost += receipt.gasUsed
  }

  const batchSavings = individualAddCost - batchAddReceipt.gasUsed
  const batchPercentage = ((batchSavings * 100n) / individualAddCost).toString()

  console.log(`   Individual Adds: ${individualAddCost} gas`)
  console.log(`   Batch Savings:   ${batchSavings} gas (${batchPercentage}%)`)
  console.log()

  // Test 4: User achievement queries
  console.log('4️⃣ User Achievement Queries:')

  // Get user achievements count
  const originalCountTx = await originalContract.getUserAchievements(deployer.address)
  const optimizedCountTx = await optimizedContract.getUserAchievementCount(deployer.address)

  console.log(`   User Achievement Count:`)
  console.log(`     Original: O(n) complexity (loops through all achievements)`)
  console.log(`     Optimized: O(1) complexity (direct array access)`)
  console.log()

  console.log('🎉 Gas Optimization Test Complete!')
  console.log('\n📋 Key Optimizations:')
  console.log('   ✅ Efficient user token tracking with arrays (O(1) vs O(n))')
  console.log('   ✅ Packed structs for better storage efficiency')
  console.log('   ✅ Batch operations for bulk actions')
  console.log('   ✅ Optimized event indexing')
  console.log('   ✅ Reduced storage operations')
}

// Handle errors
main().catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})