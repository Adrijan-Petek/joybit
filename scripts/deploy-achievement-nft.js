#!/usr/bin/env node

/**
 * AchievementNFT Deployment Script
 *
 * Deploys the AchievementNFT contract and sets up all achievements
 * with their IPFS metadata URLs.
 */

const hre = require('hardhat')
const { ethers } = require('hardhat')
const fs = require('fs')
const path = require('path')

// Achievement data with pricing based on rarity
const achievements = [
  // Match-3 Achievements
  { id: 'first_win', name: 'First Win', description: 'Win your first Match-3 game', rarity: 0, emoji: '🎯', price: ethers.parseEther('0.001') },
  { id: 'hot_streak', name: 'Hot Streak', description: 'Win 5 games in a row', rarity: 1, emoji: '🔥', price: ethers.parseEther('0.005') },
  { id: 'gem_master', name: 'Gem Master', description: 'Collect 1000 gems', rarity: 2, emoji: '💎', price: ethers.parseEther('0.01') },
  { id: 'star_player', name: 'Star Player', description: 'Reach level 10', rarity: 1, emoji: '🌟', price: ethers.parseEther('0.005') },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Complete a level in under 30 seconds', rarity: 2, emoji: '⚡', price: ethers.parseEther('0.01') },
  { id: 'combo_king', name: 'Combo King', description: 'Achieve a 10x combo', rarity: 3, emoji: '🎪', price: ethers.parseEther('0.05') },
  { id: 'champion', name: 'Champion', description: 'Win 100 games', rarity: 3, emoji: '🏆', price: ethers.parseEther('0.05') },
  { id: 'artist', name: 'Artist', description: 'Create beautiful patterns', rarity: 1, emoji: '🎨', price: ethers.parseEther('0.005') },
  { id: 'rainbow', name: 'Rainbow', description: 'Match all colors in one move', rarity: 2, emoji: '🌈', price: ethers.parseEther('0.01') },
  { id: 'heart_breaker', name: 'Heart Breaker', description: 'Break 10,000 hearts', rarity: 1, emoji: '💖', price: ethers.parseEther('0.005') },
  { id: 'royal', name: 'Royal', description: 'Reach the top of the leaderboard', rarity: 3, emoji: '👑', price: ethers.parseEther('0.05') },
  { id: 'mystic', name: 'Mystic', description: 'Unlock all power-ups', rarity: 2, emoji: '🔮', price: ethers.parseEther('0.01') },
  { id: 'lucky', name: 'Lucky', description: 'Win with lucky bonuses', rarity: 1, emoji: '🍀', price: ethers.parseEther('0.005') },
  { id: 'inferno', name: 'Inferno', description: 'Create massive chain reactions', rarity: 2, emoji: '🔥', price: ethers.parseEther('0.01') },
  { id: 'frost', name: 'Frost', description: 'Freeze time perfectly', rarity: 1, emoji: '❄️', price: ethers.parseEther('0.005') },
  { id: 'thespian', name: 'Thespian', description: 'Master all game modes', rarity: 3, emoji: '🎭', price: ethers.parseEther('0.05') },
  { id: 'unicorn', name: 'Unicorn', description: 'Achieve the impossible', rarity: 4, emoji: '🦄', price: ethers.parseEther('0.1') },
  { id: 'summit', name: 'Summit', description: 'Reach the highest peaks', rarity: 2, emoji: '🏔️', price: ethers.parseEther('0.01') },
  { id: 'tempest', name: 'Tempest', description: 'Control the storm', rarity: 3, emoji: '🌪️', price: ethers.parseEther('0.05') },
  { id: 'phantom', name: 'Phantom', description: 'Become untouchable', rarity: 4, emoji: '💀', price: ethers.parseEther('0.1') },

  // Daily Claim Achievements
  { id: 'daily_starter', name: 'Daily Starter', description: 'Claim your first daily reward', rarity: 0, emoji: '📅', price: ethers.parseEther('0.001') },
  { id: 'streak_master', name: 'Streak Master', description: 'Maintain a 7-day claim streak', rarity: 1, emoji: '🔥', price: ethers.parseEther('0.005') },
  { id: 'dedicated_player', name: 'Dedicated Player', description: 'Claim rewards for 30 days', rarity: 2, emoji: '💪', price: ethers.parseEther('0.01') },
  { id: 'loyal_supporter', name: 'Loyal Supporter', description: 'Claim rewards for 100 days', rarity: 3, emoji: '👑', price: ethers.parseEther('0.05') },
  { id: 'eternal_claimant', name: 'Eternal Claimant', description: 'Claim rewards for 365 days', rarity: 4, emoji: '♾️', price: ethers.parseEther('0.1') },

  // Card Game Achievements
  { id: 'card_novice', name: 'Card Novice', description: 'Play your first card game', rarity: 0, emoji: '🃏', price: ethers.parseEther('0.001') },
  { id: 'card_winner', name: 'Card Winner', description: 'Win your first card game', rarity: 0, emoji: '🎯', price: ethers.parseEther('0.001') },
  { id: 'card_expert', name: 'Card Expert', description: 'Win 10 card games', rarity: 1, emoji: '🎪', price: ethers.parseEther('0.005') },
  { id: 'card_master', name: 'Card Master', description: 'Win 50 card games', rarity: 2, emoji: '🏆', price: ethers.parseEther('0.01') },
  { id: 'card_legend', name: 'Card Legend', description: 'Win 100 card games', rarity: 3, emoji: '👑', price: ethers.parseEther('0.05') },
  { id: 'card_god', name: 'Card God', description: 'Win 500 card games', rarity: 4, emoji: '⚡', price: ethers.parseEther('0.1') },
  { id: 'card_addict', name: 'Card Addict', description: 'Play 1000 card games', rarity: 2, emoji: '🎰', price: ethers.parseEther('0.01') },

  // General Achievements
  { id: 'well_rounded', name: 'Well Rounded', description: 'Play all game types', rarity: 1, emoji: '🎭', price: ethers.parseEther('0.005') },
  { id: 'high_scorer', name: 'High Scorer', description: 'Reach a high score of 1000', rarity: 1, emoji: '📊', price: ethers.parseEther('0.005') },
  { id: 'level_climber', name: 'Level Climber', description: 'Reach level 5 in Match-3', rarity: 1, emoji: '🗻', price: ethers.parseEther('0.005') },
  { id: 'consistent_player', name: 'Consistent Player', description: 'Play games for 7 days', rarity: 1, emoji: '📅', price: ethers.parseEther('0.005') },
  { id: 'early_adopter', name: 'Early Adopter', description: 'Join during beta phase', rarity: 2, emoji: '🚀', price: ethers.parseEther('0.01') },
  { id: 'social_butterfly', name: 'Social Butterfly', description: 'Share your achievements', rarity: 1, emoji: '🦋', price: ethers.parseEther('0.005') },
  { id: 'perfectionist', name: 'Perfectionist', description: 'Achieve perfect scores', rarity: 3, emoji: '💎', price: ethers.parseEther('0.05') },
  { id: 'marathon_player', name: 'Marathon Player', description: 'Play for 24 hours total', rarity: 2, emoji: '🏃', price: ethers.parseEther('0.01') }
]

async function main() {
  try {
    console.log('🚀 Deploying AchievementNFT contract...\n')

    // Get the deployer account
    const [deployer] = await hre.ethers.getSigners()
    console.log('Deploying with account:', deployer.address)

    // Get treasury address from deployments or mainnet
    let treasuryAddress
    if (hre.network.name === 'base') {
      // Mainnet Base treasury address
      treasuryAddress = '0x91F67245cE0ad7AFB5301EE5d8eaE29Db69078Af'
      console.log('Using mainnet treasury address:', treasuryAddress)
    } else {
      const deploymentsPath = path.join(__dirname, '../deployments/testnet-deployment.json')
      if (!fs.existsSync(deploymentsPath)) {
        throw new Error('Treasury deployment not found. Please deploy treasury first.')
      }

      const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'))
      treasuryAddress = deployments.contracts.treasury

      if (!treasuryAddress) {
        throw new Error('Treasury address not found in deployments')
      }
    }

    // Deploy AchievementNFT contract
    const AchievementNFT = await hre.ethers.getContractFactory('AchievementNFT')
    const achievementNFT = await AchievementNFT.deploy(treasuryAddress)

    await achievementNFT.waitForDeployment()
    const achievementNFTAddress = await achievementNFT.getAddress()
    console.log('✅ AchievementNFT deployed to:', achievementNFTAddress)

    // Load metadata URLs
    const metadataPath = path.join(__dirname, '../achievement-metadata-urls.json')
    if (!fs.existsSync(metadataPath)) {
      throw new Error('Achievement metadata URLs not found. Please run upload-achievement-metadata.ts first.')
    }

    const metadataUrls = JSON.parse(fs.readFileSync(metadataPath, 'utf8'))
    console.log(`📄 Loaded ${metadataUrls.length} metadata URLs`)

    // Create mapping of achievement ID to metadata URL
    const metadataMap = {}
    metadataUrls.forEach(item => {
      metadataMap[item.id] = item.metadataUrl
    })

    // Add all achievements to the contract
    console.log('\n📝 Adding achievements to contract...')
    for (let i = 0; i < achievements.length; i++) {
      const achievement = achievements[i]
      const metadataUrl = metadataMap[achievement.id]

      if (!metadataUrl) {
        console.warn(`⚠️  No metadata URL found for achievement: ${achievement.id}`)
        continue
      }

      console.log(`Adding ${achievement.id} (${achievement.name})...`)

      const tx = await achievementNFT.addAchievement(
        achievement.id,
        achievement.name,
        achievement.description,
        achievement.rarity,
        achievement.emoji,
        metadataUrl,
        achievement.price
      )

      await tx.wait()
      console.log(`✅ Added ${achievement.id}`)
    }

    // Save deployment info
    const deploymentInfo = {
      achievementNFT: achievementNFTAddress,
      treasury: treasuryAddress,
      network: hre.network.name,
      deployedAt: new Date().toISOString(),
      achievementsCount: achievements.length
    }

    const outputPath = path.join(__dirname, `../deployments/achievement-nft-${hre.network.name}-deployment.json`)
    fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2))

    console.log('\n🎉 Deployment complete!')
    console.log('===============================')
    console.log('AchievementNFT:', achievementNFTAddress)
    console.log('Treasury:', treasuryAddress)
    console.log('Network:', hre.network.name)
    console.log('Achievements added:', achievements.length)
    console.log(`📄 Deployment info saved to: ${outputPath}`)

  } catch (error) {
    console.error('❌ Deployment failed:', error)
    process.exit(1)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })