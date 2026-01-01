const hre = require('hardhat')
const { achievements } = require('./generate-achievement-cards')

// Price structure based on rarity (0.000034 to 0.001 ETH range)
const rarityPrices = {
  'Common': '0.000034',     // Cheapest
  'Rare': '0.0001',         // Low
  'Epic': '0.0003',         // Medium
  'Legendary': '0.0006',    // High
  'Mythic': '0.001'         // Max
}

const rarityToIndex = {
  'Common': 0,
  'Rare': 1,
  'Epic': 2,
  'Legendary': 3,
  'Mythic': 4
}

async function main() {
  const contractAddress = process.env.NEXT_PUBLIC_ACHIEVEMENT_ERC1155_ADDRESS

  if (!contractAddress) {
    console.error('❌ NEXT_PUBLIC_ACHIEVEMENT_ERC1155_ADDRESS not set in .env.local')
    console.log('Deploy the contract first with: npm run deploy-achievement')
    process.exit(1)
  }

  console.log('🚀 Configuring all 40 achievements with prices...')
  console.log('📝 Contract:', contractAddress)
  console.log('🌐 Network:', hre.network.name)
  console.log()

  const [signer] = await hre.ethers.getSigners()
  console.log('👤 Signer:', signer.address)
  
  const balance = await hre.ethers.provider.getBalance(signer.address)
  console.log('💰 Balance:', hre.ethers.formatEther(balance), 'ETH')
  console.log()

  console.log('💎 Price Structure:')
  console.log('  Common:    ', rarityPrices.Common, 'ETH')
  console.log('  Rare:      ', rarityPrices.Rare, 'ETH')
  console.log('  Epic:      ', rarityPrices.Epic, 'ETH')
  console.log('  Legendary: ', rarityPrices.Legendary, 'ETH')
  console.log('  Mythic:    ', rarityPrices.Mythic, 'ETH')
  console.log()

  const Achievement = await hre.ethers.getContractAt('AchievementERC1155', contractAddress)

  console.log(`📝 Adding ${achievements.length} achievements...\n`)

  let successCount = 0
  let failCount = 0

  for (const achievement of achievements) {
    try {
      const rarityIndex = rarityToIndex[achievement.rarity]
      const price = hre.ethers.parseEther(rarityPrices[achievement.rarity])
      
      console.log(`📤 #${achievement.id}: ${achievement.name}`)
      console.log(`   ${achievement.rarity} | ${rarityPrices[achievement.rarity]} ETH`)
      
      const tx = await Achievement.addAchievement(
        achievement.id,
        rarityIndex,
        price
      )
      
      await tx.wait()
      console.log(`   ✅ Configured\n`)
      successCount++
      
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}\n`)
      failCount++
    }
  }

  console.log('═══════════════════════════════════════')
  console.log('📊 Configuration Summary:')
  console.log('═══════════════════════════════════════')
  console.log(`  ✅ Successfully added: ${successCount}`)
  console.log(`  ❌ Failed: ${failCount}`)
  console.log(`  📋 Total: ${achievements.length}`)
  console.log('═══════════════════════════════════════')
  
  if (successCount === achievements.length) {
    console.log('\n🎉 All achievements configured successfully!')
    console.log('🎮 Users can now mint achievements from the profile page!')
  } else {
    console.log('\n⚠️  Some achievements failed. Check errors above.')
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
