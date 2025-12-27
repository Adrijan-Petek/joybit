#!/usr/bin/env node

/**
 * Achievement NFT Metadata Uploader
 *
 * This script uploads all achievement metadata to IPFS via NFT.Storage
 * and generates the metadata URLs for use in the AchievementNFT contract.
 */

import { uploadMultipleAchievements } from '../lib/nft-storage'
import * as fs from 'fs'
import * as path from 'path'

// Achievement data - matches the database achievements
const achievements = [
  // Match-3 Achievements
  { id: 'first_win', name: 'First Win', description: 'Win your first Match-3 game', rarity: 'Common', emoji: '🎯' },
  { id: 'hot_streak', name: 'Hot Streak', description: 'Win 5 games in a row', rarity: 'Rare', emoji: '🔥' },
  { id: 'gem_master', name: 'Gem Master', description: 'Collect 1000 gems', rarity: 'Epic', emoji: '💎' },
  { id: 'star_player', name: 'Star Player', description: 'Reach level 10', rarity: 'Rare', emoji: '🌟' },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Complete a level in under 30 seconds', rarity: 'Epic', emoji: '⚡' },
  { id: 'combo_king', name: 'Combo King', description: 'Achieve a 10x combo', rarity: 'Legendary', emoji: '🎪' },
  { id: 'champion', name: 'Champion', description: 'Win 100 games', rarity: 'Legendary', emoji: '🏆' },
  { id: 'artist', name: 'Artist', description: 'Create beautiful patterns', rarity: 'Rare', emoji: '🎨' },
  { id: 'rainbow', name: 'Rainbow', description: 'Match all colors in one move', rarity: 'Epic', emoji: '🌈' },
  { id: 'heart_breaker', name: 'Heart Breaker', description: 'Break 10,000 hearts', rarity: 'Rare', emoji: '💖' },
  { id: 'royal', name: 'Royal', description: 'Reach the top of the leaderboard', rarity: 'Legendary', emoji: '👑' },
  { id: 'mystic', name: 'Mystic', description: 'Unlock all power-ups', rarity: 'Epic', emoji: '🔮' },
  { id: 'lucky', name: 'Lucky', description: 'Win with lucky bonuses', rarity: 'Rare', emoji: '🍀' },
  { id: 'inferno', name: 'Inferno', description: 'Create massive chain reactions', rarity: 'Epic', emoji: '🔥' },
  { id: 'frost', name: 'Frost', description: 'Freeze time perfectly', rarity: 'Rare', emoji: '❄️' },
  { id: 'thespian', name: 'Thespian', description: 'Master all game modes', rarity: 'Legendary', emoji: '🎭' },
  { id: 'unicorn', name: 'Unicorn', description: 'Achieve the impossible', rarity: 'Mythic', emoji: '🦄' },
  { id: 'summit', name: 'Summit', description: 'Reach the highest peaks', rarity: 'Epic', emoji: '🏔️' },
  { id: 'tempest', name: 'Tempest', description: 'Control the storm', rarity: 'Legendary', emoji: '🌪️' },
  { id: 'phantom', name: 'Phantom', description: 'Become untouchable', rarity: 'Mythic', emoji: '💀' },

  // Daily Claim Achievements
  { id: 'daily_starter', name: 'Daily Starter', description: 'Claim your first daily reward', rarity: 'Common', emoji: '📅' },
  { id: 'streak_master', name: 'Streak Master', description: 'Maintain a 7-day claim streak', rarity: 'Rare', emoji: '🔥' },
  { id: 'dedicated_player', name: 'Dedicated Player', description: 'Claim rewards for 30 days', rarity: 'Epic', emoji: '💪' },
  { id: 'loyal_supporter', name: 'Loyal Supporter', description: 'Claim rewards for 100 days', rarity: 'Legendary', emoji: '👑' },
  { id: 'eternal_claimant', name: 'Eternal Claimant', description: 'Claim rewards for 365 days', rarity: 'Mythic', emoji: '♾️' },

  // Card Game Achievements
  { id: 'card_novice', name: 'Card Novice', description: 'Play your first card game', rarity: 'Common', emoji: '🃏' },
  { id: 'card_winner', name: 'Card Winner', description: 'Win your first card game', rarity: 'Common', emoji: '🎯' },
  { id: 'card_expert', name: 'Card Expert', description: 'Win 10 card games', rarity: 'Rare', emoji: '🎪' },
  { id: 'card_master', name: 'Card Master', description: 'Win 50 card games', rarity: 'Epic', emoji: '🏆' },
  { id: 'card_legend', name: 'Card Legend', description: 'Win 100 card games', rarity: 'Legendary', emoji: '👑' },
  { id: 'card_god', name: 'Card God', description: 'Win 500 card games', rarity: 'Mythic', emoji: '⚡' },
  { id: 'card_addict', name: 'Card Addict', description: 'Play 1000 card games', rarity: 'Epic', emoji: '🎰' },

  // General Achievements
  { id: 'well_rounded', name: 'Well Rounded', description: 'Play all game types', rarity: 'Rare', emoji: '🎭' },
  { id: 'high_scorer', name: 'High Scorer', description: 'Reach a high score of 1000', rarity: 'Rare', emoji: '📊' },
  { id: 'level_climber', name: 'Level Climber', description: 'Reach level 5 in Match-3', rarity: 'Rare', emoji: '🗻' },
  { id: 'consistent_player', name: 'Consistent Player', description: 'Play games for 7 days', rarity: 'Rare', emoji: '📅' },
  { id: 'early_adopter', name: 'Early Adopter', description: 'Join during beta phase', rarity: 'Epic', emoji: '🚀' },
  { id: 'social_butterfly', name: 'Social Butterfly', description: 'Share your achievements', rarity: 'Rare', emoji: '🦋' },
  { id: 'perfectionist', name: 'Perfectionist', description: 'Achieve perfect scores', rarity: 'Legendary', emoji: '💎' },
  { id: 'marathon_player', name: 'Marathon Player', description: 'Play for 24 hours total', rarity: 'Epic', emoji: '🏃' }
]

async function main() {
  try {
    console.log('🚀 Starting achievement metadata upload to IPFS...\n')

    const results = await uploadMultipleAchievements(achievements)

    console.log('\n✅ Upload complete! Results:')
    console.log('===============================')

    // Save results to file
    const outputPath = path.join(__dirname, '../achievement-metadata-urls.json')
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))

    console.log(`📄 Metadata URLs saved to: ${outputPath}`)
    console.log(`📊 Total achievements uploaded: ${results.length}`)

    // Display results
    results.forEach(result => {
      console.log(`${result.id}: ${result.metadataUrl}`)
    })

    console.log('\n🎉 Ready to use these URLs in your AchievementNFT contract!')

  } catch (error) {
    console.error('❌ Upload failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { achievements }