#!/usr/bin/env node

/**
 * Achievement Badge Image Generator and Uploader
 *
 * This script generates badge images for all achievements and uploads them
 * with metadata to IPFS via Pinata.
 */

import sharp from 'sharp'
import * as fs from 'fs'
import * as path from 'path'
import { uploadAchievementMetadata } from '../lib/nft-storage'

// Achievement data with enhanced styling
const achievements = [
  // Match-3 Achievements
  { id: 'first_win', name: 'First Win', description: 'Win your first Match-3 game', rarity: 'Common', emoji: '🎯', category: 'match3', color: '#6B7280' },
  { id: 'hot_streak', name: 'Hot Streak', description: 'Win 5 games in a row', rarity: 'Rare', emoji: '🔥', category: 'match3', color: '#3B82F6' },
  { id: 'gem_master', name: 'Gem Master', description: 'Collect 1000 gems', rarity: 'Epic', emoji: '💎', category: 'match3', color: '#8B5CF6' },
  { id: 'star_player', name: 'Star Player', description: 'Reach level 10', rarity: 'Rare', emoji: '🌟', category: 'match3', color: '#3B82F6' },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Complete a level in under 30 seconds', rarity: 'Epic', emoji: '⚡', category: 'match3', color: '#8B5CF6' },
  { id: 'combo_king', name: 'Combo King', description: 'Achieve a 10x combo', rarity: 'Legendary', emoji: '🎪', category: 'match3', color: '#F59E0B' },
  { id: 'champion', name: 'Champion', description: 'Win 100 games', rarity: 'Legendary', emoji: '🏆', category: 'match3', color: '#F59E0B' },
  { id: 'artist', name: 'Artist', description: 'Create beautiful patterns', rarity: 'Rare', emoji: '🎨', category: 'match3', color: '#3B82F6' },
  { id: 'rainbow', name: 'Rainbow', description: 'Match all colors in one move', rarity: 'Epic', emoji: '🌈', category: 'match3', color: '#8B5CF6' },
  { id: 'heart_breaker', name: 'Heart Breaker', description: 'Break 10,000 hearts', rarity: 'Rare', emoji: '💖', category: 'match3', color: '#3B82F6' },
  { id: 'royal', name: 'Royal', description: 'Reach the top of the leaderboard', rarity: 'Legendary', emoji: '👑', category: 'match3', color: '#F59E0B' },
  { id: 'mystic', name: 'Mystic', description: 'Unlock all power-ups', rarity: 'Epic', emoji: '🔮', category: 'match3', color: '#8B5CF6' },
  { id: 'lucky', name: 'Lucky', description: 'Win with lucky bonuses', rarity: 'Rare', emoji: '🍀', category: 'match3', color: '#3B82F6' },
  { id: 'inferno', name: 'Inferno', description: 'Create massive chain reactions', rarity: 'Epic', emoji: '🔥', category: 'match3', color: '#8B5CF6' },
  { id: 'frost', name: 'Frost', description: 'Freeze time perfectly', rarity: 'Rare', emoji: '❄️', category: 'match3', color: '#3B82F6' },
  { id: 'thespian', name: 'Thespian', description: 'Master all game modes', rarity: 'Legendary', emoji: '🎭', category: 'match3', color: '#F59E0B' },
  { id: 'unicorn', name: 'Unicorn', description: 'Achieve the impossible', rarity: 'Mythic', emoji: '🦄', category: 'match3', color: '#DC2626' },
  { id: 'summit', name: 'Summit', description: 'Reach the highest peaks', rarity: 'Epic', emoji: '🏔️', category: 'match3', color: '#8B5CF6' },
  { id: 'tempest', name: 'Tempest', description: 'Control the storm', rarity: 'Legendary', emoji: '🌪️', category: 'match3', color: '#F59E0B' },
  { id: 'phantom', name: 'Phantom', description: 'Become untouchable', rarity: 'Mythic', emoji: '💀', category: 'match3', color: '#DC2626' },

  // Daily Claim Achievements
  { id: 'daily_starter', name: 'Daily Starter', description: 'Claim your first daily reward', rarity: 'Common', emoji: '📅', category: 'daily', color: '#6B7280' },
  { id: 'streak_master', name: 'Streak Master', description: 'Maintain a 7-day claim streak', rarity: 'Rare', emoji: '🔥', category: 'daily', color: '#3B82F6' },
  { id: 'dedicated_player', name: 'Dedicated Player', description: 'Claim rewards for 30 days', rarity: 'Epic', emoji: '💪', category: 'daily', color: '#8B5CF6' },
  { id: 'loyal_supporter', name: 'Loyal Supporter', description: 'Claim rewards for 100 days', rarity: 'Legendary', emoji: '👑', category: 'daily', color: '#F59E0B' },
  { id: 'eternal_claimant', name: 'Eternal Claimant', description: 'Claim rewards for 365 days', rarity: 'Mythic', emoji: '♾️', category: 'daily', color: '#DC2626' },

  // Card Game Achievements
  { id: 'card_novice', name: 'Card Novice', description: 'Play your first card game', rarity: 'Common', emoji: '🃏', category: 'card', color: '#6B7280' },
  { id: 'card_winner', name: 'Card Winner', description: 'Win your first card game', rarity: 'Common', emoji: '🎯', category: 'card', color: '#6B7280' },
  { id: 'card_expert', name: 'Card Expert', description: 'Win 10 card games', rarity: 'Rare', emoji: '🎪', category: 'card', color: '#3B82F6' },
  { id: 'card_master', name: 'Card Master', description: 'Win 50 card games', rarity: 'Epic', emoji: '🏆', category: 'card', color: '#8B5CF6' },
  { id: 'card_legend', name: 'Card Legend', description: 'Win 100 card games', rarity: 'Legendary', emoji: '👑', category: 'card', color: '#F59E0B' },
  { id: 'card_god', name: 'Card God', description: 'Win 500 card games', rarity: 'Mythic', emoji: '🗿', category: 'card', color: '#DC2626' },
  { id: 'card_addict', name: 'Card Addict', description: 'Play 1000 card games', rarity: 'Epic', emoji: '🎰', category: 'card', color: '#8B5CF6' },

  // General Achievements
  { id: 'well_rounded', name: 'Well Rounded', description: 'Play all game types', rarity: 'Rare', emoji: '🎭', category: 'general', color: '#3B82F6' },
  { id: 'high_scorer', name: 'High Scorer', description: 'Score over 1 million points', rarity: 'Epic', emoji: '📊', category: 'general', color: '#8B5CF6' },
  { id: 'level_climber', name: 'Level Climber', description: 'Reach level 50', rarity: 'Legendary', emoji: '🪜', category: 'general', color: '#F59E0B' },
  { id: 'consistent_player', name: 'Consistent Player', description: 'Play every day for a month', rarity: 'Rare', emoji: '📅', category: 'general', color: '#3B82F6' },
  { id: 'early_adopter', name: 'Early Adopter', description: 'Join during beta', rarity: 'Rare', emoji: '🚀', category: 'general', color: '#3B82F6' },
  { id: 'social_butterfly', name: 'Social Butterfly', description: 'Share achievements 10 times', rarity: 'Common', emoji: '🦋', category: 'general', color: '#6B7280' },
  { id: 'perfectionist', name: 'Perfectionist', description: 'Complete a level with 100% score', rarity: 'Legendary', emoji: '💯', category: 'general', color: '#F59E0B' },
  { id: 'marathon_player', name: 'Marathon Player', description: 'Play for 5 hours straight', rarity: 'Epic', emoji: '🏃', category: 'general', color: '#8B5CF6' }
]

/**
 * Generate SVG badge image for an achievement
 */
function generateBadgeSVG(achievement: typeof achievements[0]): string {
  const { name, emoji, rarity, color, category } = achievement

  // Category icons
  const categoryIcons = {
    match3: '🎮',
    daily: '📅',
    card: '🃏',
    general: '🏆'
  }

  const categoryIcon = categoryIcons[category as keyof typeof categoryIcons] || '🏆'

  return `
<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:0.1" />
      <stop offset="100%" style="stop-color:${color};stop-opacity:0.3" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="400" height="400" fill="url(#bg)" rx="20"/>

  <!-- Border -->
  <rect width="400" height="400" fill="none" stroke="${color}" stroke-width="4" rx="20"/>

  <!-- Category icon (top left) -->
  <text x="30" y="40" font-size="24" font-family="Arial, sans-serif">${categoryIcon}</text>

  <!-- Rarity badge (top right) -->
  <rect x="280" y="15" width="100" height="30" fill="${color}" rx="15"/>
  <text x="330" y="35" font-size="14" font-family="Arial, sans-serif" fill="white" text-anchor="middle" font-weight="bold">${rarity.toUpperCase()}</text>

  <!-- Main emoji -->
  <text x="200" y="160" font-size="80" text-anchor="middle" font-family="Arial, sans-serif">${emoji}</text>

  <!-- Achievement name -->
  <text x="200" y="240" font-size="28" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" fill="#1F2937">${name}</text>

  <!-- Decorative elements -->
  <circle cx="200" cy="200" r="120" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="5,5" opacity="0.3"/>

  <!-- Corner decorations -->
  <circle cx="50" cy="50" r="8" fill="${color}" opacity="0.6"/>
  <circle cx="350" cy="50" r="8" fill="${color}" opacity="0.6"/>
  <circle cx="50" cy="350" r="8" fill="${color}" opacity="0.6"/>
  <circle cx="350" cy="350" r="8" fill="${color}" opacity="0.6"/>
</svg>
  `.trim()
}

/**
 * Generate PNG badge image from SVG
 */
async function generateBadgeImage(achievement: typeof achievements[0]): Promise<Buffer> {
  const svg = generateBadgeSVG(achievement)

  return await sharp(Buffer.from(svg))
    .png()
    .toBuffer()
}

/**
 * Upload badge image and metadata to Pinata
 */
async function uploadBadgeWithMetadata(achievement: typeof achievements[0]): Promise<string> {
  console.log(`🎨 Generating badge for: ${achievement.name}`)

  // Generate the badge image
  const imageBuffer = await generateBadgeImage(achievement)

  // Create metadata
  const metadata = {
    name: `${achievement.name} - Joybit Achievement`,
    description: achievement.description,
    image: new File([imageBuffer], `${achievement.id}.png`, { type: 'image/png' }),
    attributes: [
      {
        trait_type: 'Rarity',
        value: achievement.rarity
      },
      {
        trait_type: 'Category',
        value: achievement.category
      },
      {
        trait_type: 'Emoji',
        value: achievement.emoji
      }
    ],
    external_url: 'https://joybit.fun'
  }

  // Upload to Pinata
  const metadataUrl = await uploadAchievementMetadata(metadata)
  console.log(`✅ Uploaded ${achievement.name}: ${metadataUrl}`)

  return metadataUrl
}

/**
 * Main function to generate and upload all badges
 */
async function main() {
  console.log('🎨 Starting badge generation and upload process...\n')

  const results: Record<string, string> = {}

  for (const achievement of achievements) {
    try {
      const metadataUrl = await uploadBadgeWithMetadata(achievement)
      results[achievement.id] = metadataUrl

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error(`❌ Failed to upload ${achievement.name}:`, error)
      results[achievement.id] = 'ERROR'
    }
  }

  // Save results to file
  const outputPath = path.join(__dirname, '..', 'achievement-badge-metadata-urls.json')
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))

  console.log('\n🎉 Badge generation and upload complete!')
  console.log(`📁 Results saved to: ${outputPath}`)
  console.log(`📊 Total badges processed: ${achievements.length}`)
  console.log(`✅ Successfully uploaded: ${Object.values(results).filter(url => url !== 'ERROR').length}`)
  console.log(`❌ Failed uploads: ${Object.values(results).filter(url => url === 'ERROR').length}`)
}

// Run the script
main().catch(console.error)