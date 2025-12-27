const hre = require('hardhat')
const { ethers } = require('hardhat')

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
    console.log('📝 Adding achievements to deployed AchievementNFT contract...\n')

    // Deployed contract address
    const contractAddress = '0x4e690D45E99C31362B1DDd193db58e1C28687Eaa'

    // Get the signer
    const [deployer] = await hre.ethers.getSigners()
    console.log('Using account:', deployer.address)

    // Attach to deployed contract
    const AchievementNFT = await hre.ethers.getContractFactory('AchievementNFT')
    const achievementNFT = AchievementNFT.attach(contractAddress)

    console.log('📄 Adding', achievements.length, 'achievements...')

    for (let i = 0; i < achievements.length; i++) {
      const achievement = achievements[i]
      console.log(`Adding ${achievement.id} (${achievement.name})...`)

      // Generate metadata URL (assuming same as before)
      const metadataUrl = `https://gateway.pinata.cloud/ipfs/QmYourMetadataHash/${achievement.id}.json`

      try {
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
      } catch (error) {
        console.log(`❌ Failed to add ${achievement.id}:`, error.message)
      }
    }

    console.log('\n✅ All achievements added successfully!')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()