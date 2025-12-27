#!/usr/bin/env node

/**
 * Achievement Badge Image Generator and Card Creator
 *
 * This script generates badge images, saves them locally, and creates
 * achievement cards for mini app display.
 */

import sharp from 'sharp'
import * as fs from 'fs'
import * as path from 'path'

// Define the achievement type
interface Achievement {
  id: string
  name: string
  description: string
  rarity: string
  emoji: string
  category: string
  color: string
}

// Achievement data with enhanced styling
const achievements: Achievement[] = [
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
 * Generate achievement card HTML
 */
function generateAchievementCard(achievement: Achievement, imagePath: string): string {
  const { name, description, rarity, emoji, category, color } = achievement

  const categoryIcons = {
    match3: '🎮',
    daily: '📅',
    card: '🃏',
    general: '🏆'
  }

  const categoryIcon = categoryIcons[category as keyof typeof categoryIcons] || '🏆'
  const rarityClass = `rarity-${rarity.toLowerCase()}`

  return `
<div class="achievement-card ${rarityClass}" data-category="${category}">
  <div class="badge-image">
    <img src="${imagePath}" alt="${name}" class="w-full h-48 object-cover">
    <div class="absolute top-2 left-2 category-badge px-2 py-1 rounded-full text-xs font-medium">
      ${categoryIcon} ${category}
    </div>
    <div class="absolute top-2 right-2 rarity-badge px-2 py-1 rounded-full text-xs font-bold">
      ${rarity.toUpperCase()}
    </div>
  </div>

  <div class="card-content p-4">
    <div class="flex items-center gap-2 mb-2">
      <span class="text-2xl">${emoji}</span>
      <h3 class="text-lg font-bold text-white font-mono">${name}</h3>
    </div>

    <p class="text-sm text-gray-300 mb-3 font-mono leading-relaxed">${description}</p>

    <div class="flex items-center justify-between">
      <span class="text-xs text-cyan-400 uppercase tracking-wide font-mono">${category}</span>
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 rounded-full" style="background-color: ${color}; box-shadow: 0 0 8px ${color}80;"></div>
        <span class="text-xs text-purple-400 font-mono">${rarity}</span>
      </div>
    </div>
  </div>
</div>
  `.trim()
}

/**
 * Generate HTML page with all achievement cards
 */
function generateAchievementGallery(achievements: Achievement[], imageDir: string): string {
  const cards = achievements.map(achievement =>
    generateAchievementCard(achievement, `${imageDir}/${achievement.id}.png`)
  ).join('\n')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Joybit Achievement Gallery</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      background:
        radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
        radial-gradient(circle at 40% 80%, rgba(120, 219, 255, 0.3) 0%, transparent 50%),
        linear-gradient(135deg, #0f0f23 0%, #1a1a2e 25%, #16213e 50%, #0f3460 75%, #1a1a2e 100%);
      min-height: 100vh;
      position: relative;
      overflow-x: hidden;
    }

    body::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background:
        radial-gradient(circle at 30% 20%, rgba(138, 43, 226, 0.1) 0%, transparent 40%),
        radial-gradient(circle at 70% 80%, rgba(255, 20, 147, 0.1) 0%, transparent 40%),
        radial-gradient(circle at 50% 50%, rgba(0, 191, 255, 0.1) 0%, transparent 40%);
      animation: float 20s ease-in-out infinite;
      pointer-events: none;
    }

    /* Grid Background Pattern */
    body::after {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image:
        linear-gradient(rgba(138, 43, 226, 0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(138, 43, 226, 0.1) 1px, transparent 1px);
      background-size: 50px 50px;
      animation: gridMove 30s linear infinite;
      pointer-events: none;
      opacity: 0.3;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      33% { transform: translateY(-20px) rotate(1deg); }
      66% { transform: translateY(10px) rotate(-1deg); }
    }

    @keyframes gridMove {
      0% { background-position: 0 0; }
      100% { background-position: 50px 50px; }
    }

    .achievement-card {
      background:
        linear-gradient(145deg,
          rgba(255, 255, 255, 0.95) 0%,
          rgba(255, 255, 255, 0.98) 50%,
          rgba(248, 250, 252, 0.95) 100%
        ),
        linear-gradient(135deg,
          rgba(59, 130, 246, 0.05) 0%,
          rgba(147, 51, 234, 0.05) 50%,
          rgba(236, 72, 153, 0.05) 100%
        );
      backdrop-filter: blur(25px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 16px;
      box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.12),
        0 0 0 1px rgba(255, 255, 255, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.6),
        inset 0 -1px 0 rgba(0, 0, 0, 0.05);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }

    .achievement-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background:
        linear-gradient(rgba(138, 43, 226, 0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(138, 43, 226, 0.1) 1px, transparent 1px);
      background-size: 20px 20px;
      opacity: 0;
      transition: opacity 0.4s ease;
      border-radius: 16px;
      pointer-events: none;
    }

    .achievement-card::after {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: conic-gradient(
        from 0deg,
        transparent 0deg,
        rgba(255, 255, 255, 0.1) 60deg,
        transparent 120deg,
        rgba(255, 255, 255, 0.05) 180deg,
        transparent 240deg,
        rgba(255, 255, 255, 0.1) 300deg,
        transparent 360deg
      );
      animation: shimmer 3s linear infinite;
      opacity: 0;
      transition: opacity 0.4s ease;
      pointer-events: none;
    }

    @keyframes shimmer {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .achievement-card:hover {
      transform: translateY(-8px) scale(1.02);
      box-shadow:
        0 20px 60px rgba(0, 0, 0, 0.2),
        0 0 0 1px rgba(255, 255, 255, 0.3),
        0 0 40px rgba(138, 43, 226, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.8),
        inset 0 -1px 0 rgba(0, 0, 0, 0.1);
    }

    .achievement-card:hover::before {
      opacity: 0.3;
    }

    .achievement-card:hover::after {
      opacity: 1;
    }

    .rarity-common {
      border-color: rgba(156, 163, 175, 0.6);
      box-shadow:
        0 0 30px rgba(156, 163, 175, 0.2),
        inset 0 0 20px rgba(156, 163, 175, 0.1);
    }

    .rarity-common:hover {
      box-shadow:
        0 0 50px rgba(156, 163, 175, 0.4),
        0 0 80px rgba(156, 163, 175, 0.2),
        inset 0 0 30px rgba(156, 163, 175, 0.15);
    }

    .rarity-rare {
      border-color: rgba(59, 130, 246, 0.7);
      box-shadow:
        0 0 30px rgba(59, 130, 246, 0.3),
        inset 0 0 20px rgba(59, 130, 246, 0.1);
    }

    .rarity-rare:hover {
      box-shadow:
        0 0 50px rgba(59, 130, 246, 0.5),
        0 0 80px rgba(59, 130, 246, 0.3),
        inset 0 0 30px rgba(59, 130, 246, 0.15);
    }

    .rarity-epic {
      border-color: rgba(147, 51, 234, 0.8);
      box-shadow:
        0 0 30px rgba(147, 51, 234, 0.4),
        inset 0 0 20px rgba(147, 51, 234, 0.1);
    }

    .rarity-epic:hover {
      box-shadow:
        0 0 50px rgba(147, 51, 234, 0.6),
        0 0 80px rgba(147, 51, 234, 0.4),
        inset 0 0 30px rgba(147, 51, 234, 0.15);
    }

    .rarity-legendary {
      border-color: rgba(245, 158, 11, 0.9);
      box-shadow:
        0 0 30px rgba(245, 158, 11, 0.5),
        inset 0 0 20px rgba(245, 158, 11, 0.1);
    }

    .rarity-legendary:hover {
      box-shadow:
        0 0 50px rgba(245, 158, 11, 0.7),
        0 0 80px rgba(245, 158, 11, 0.5),
        inset 0 0 30px rgba(245, 158, 11, 0.15);
    }

    .rarity-mythic {
      border-color: rgba(239, 68, 68, 0.9);
      box-shadow:
        0 0 30px rgba(239, 68, 68, 0.5),
        inset 0 0 20px rgba(239, 68, 68, 0.1);
    }

    .rarity-mythic:hover {
      box-shadow:
        0 0 50px rgba(239, 68, 68, 0.7),
        0 0 80px rgba(239, 68, 68, 0.5),
        inset 0 0 30px rgba(239, 68, 68, 0.15);
    }

    .badge-image {
      border-radius: 12px 12px 0 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      position: relative;
    }

    .badge-image::after {
      content: '';
      position: absolute;
      top: 8px;
      right: 8px;
      width: 8px;
      height: 8px;
      background: rgba(138, 43, 226, 0.8);
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(138, 43, 226, 0.6);
      animation: dataPoint 2s ease-in-out infinite;
    }

    @keyframes dataPoint {
      0%, 100% { opacity: 0.6; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.2); }
    }

    .category-badge {
      backdrop-filter: blur(15px);
      background: rgba(0, 0, 0, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    }

    .rarity-badge {
      backdrop-filter: blur(15px);
      background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.9)),
        linear-gradient(45deg, rgba(138, 43, 226, 0.1), rgba(255, 20, 147, 0.1));
      border: 1px solid rgba(255, 255, 255, 0.4);
      font-weight: 800;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      box-shadow:
        0 2px 10px rgba(0, 0, 0, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.5);
      font-family: 'Courier New', monospace;
      letter-spacing: 1px;
    }

    .rarity-badge::before {
      content: '<';
      color: rgba(138, 43, 226, 0.8);
      font-weight: bold;
      margin-right: 2px;
    }

    .rarity-badge::after {
      content: '>';
      color: rgba(138, 43, 226, 0.8);
      font-weight: bold;
      margin-left: 2px;
    }

    .filter-btn {
      backdrop-filter: blur(20px);
      background:
        linear-gradient(135deg,
          rgba(255, 255, 255, 0.1) 0%,
          rgba(255, 255, 255, 0.05) 100%
        ),
        linear-gradient(45deg,
          rgba(138, 43, 226, 0.1) 0%,
          rgba(255, 20, 147, 0.1) 50%,
          rgba(0, 191, 255, 0.1) 100%
        );
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: rgba(255, 255, 255, 0.9);
      font-weight: 600;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
      font-family: 'Courier New', monospace;
      letter-spacing: 0.5px;
    }

    .filter-btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg,
        transparent,
        rgba(255, 255, 255, 0.2),
        transparent
      );
      transition: left 0.5s ease;
    }

    .filter-btn::after {
      content: '[';
      position: absolute;
      left: 8px;
      top: 50%;
      transform: translateY(-50%);
      color: rgba(138, 43, 226, 0.8);
      font-weight: bold;
      opacity: 0.7;
    }

    .filter-btn span:last-child::after {
      content: ']';
      color: rgba(138, 43, 226, 0.8);
      font-weight: bold;
      opacity: 0.7;
    }

    .filter-btn:hover {
      background:
        linear-gradient(135deg,
          rgba(255, 255, 255, 0.2) 0%,
          rgba(255, 255, 255, 0.1) 100%
        ),
        linear-gradient(45deg,
          rgba(138, 43, 226, 0.2) 0%,
          rgba(255, 20, 147, 0.2) 50%,
          rgba(0, 191, 255, 0.2) 100%
        );
      transform: translateY(-3px) scale(1.05);
      box-shadow:
        0 8px 25px rgba(138, 43, 226, 0.3),
        0 0 0 1px rgba(255, 255, 255, 0.4);
      color: rgba(255, 255, 255, 1);
    }

    .filter-btn:hover::before {
      left: 100%;
    }

    .filter-btn.active {
      background:
        linear-gradient(135deg,
          rgba(255, 255, 255, 0.25) 0%,
          rgba(255, 255, 255, 0.15) 100%
        ),
        linear-gradient(45deg,
          rgba(138, 43, 226, 0.3) 0%,
          rgba(255, 20, 147, 0.3) 50%,
          rgba(0, 191, 255, 0.3) 100%
        );
      box-shadow:
        0 0 30px rgba(138, 43, 226, 0.4),
        0 0 60px rgba(255, 20, 147, 0.2),
        0 0 0 1px rgba(255, 255, 255, 0.5);
      color: rgba(255, 255, 255, 1);
      transform: translateY(-2px);
    }

    .title-glow {
      background: linear-gradient(45deg, #ff6b6b, #ffa500, #ffff00, #32cd32, #1e90ff, #9370db);
      background-size: 400% 400%;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: gradientShift 3s ease-in-out infinite;
      text-shadow: 0 0 30px rgba(255, 107, 107, 0.5);
    }

    @keyframes gradientShift {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }

    .subtitle-glow {
      background: linear-gradient(135deg,
        rgba(255, 255, 255, 0.9) 0%,
        rgba(255, 255, 255, 0.7) 50%,
        rgba(255, 255, 255, 0.9) 100%
      );
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
    }

    .achievement-grid-container {
      position: relative;
      padding: 2rem;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      margin: 2rem auto;
      max-width: 1400px;
      box-shadow:
        0 0 40px rgba(138, 43, 226, 0.1),
        inset 0 0 40px rgba(0, 0, 0, 0.1);
    }

    .achievement-grid-container::before {
      content: '';
      position: absolute;
      top: -1px;
      left: -1px;
      right: -1px;
      bottom: -1px;
      background: linear-gradient(45deg,
        rgba(138, 43, 226, 0.2),
        rgba(255, 20, 147, 0.2),
        rgba(0, 191, 255, 0.2),
        rgba(138, 43, 226, 0.2)
      );
      border-radius: 21px;
      z-index: -1;
      animation: borderGlow 4s ease-in-out infinite;
    }

    @keyframes borderGlow {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 0.8; }
    }

    .grid-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image:
        linear-gradient(rgba(138, 43, 226, 0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(138, 43, 226, 0.1) 1px, transparent 1px);
      background-size: 40px 40px;
      border-radius: 20px;
      pointer-events: none;
      opacity: 0.5;
      animation: gridPulse 3s ease-in-out infinite;
    }

    @keyframes gridPulse {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 0.6; }
    }

    .achievement-grid {
      position: relative;
      z-index: 2;
    }

    /* Corner decorations */
    .achievement-grid-container::after {
      content: '';
      position: absolute;
      top: 10px;
      right: 10px;
      width: 20px;
      height: 20px;
      border-top: 2px solid rgba(138, 43, 226, 0.6);
      border-right: 2px solid rgba(138, 43, 226, 0.6);
      border-radius: 0 4px 0 0;
    }

    .card-content {
      position: relative;
      z-index: 2;
      background: linear-gradient(180deg,
        rgba(255, 255, 255, 0.05) 0%,
        rgba(255, 255, 255, 0.02) 100%
      );
      border-radius: 0 0 16px 16px;
    }

    .card-content::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg,
        transparent 0%,
        rgba(138, 43, 226, 0.3) 20%,
        rgba(138, 43, 226, 0.3) 80%,
        transparent 100%
      );
    }
  </style>
</head>
<body class="py-8 px-4">
  <div class="max-w-7xl mx-auto">
    <div class="text-center mb-12">
      <h1 class="text-4xl md:text-6xl font-bold title-glow mb-4 font-mono">
        <span class="text-purple-400">[</span>
        JOYBIT ACHIEVEMENT GRID
        <span class="text-purple-400">]</span>
      </h1>
      <p class="text-xl subtitle-glow max-w-2xl mx-auto font-mono">
        <span class="text-cyan-400">&gt;</span> DATA MATRIX ACCESS GRANTED
      </p>
    </div>

    <!-- Filter Buttons -->
    <div class="flex flex-wrap justify-center gap-4 mb-8">
      <button class="filter-btn active px-6 py-3 rounded-full font-medium" data-category="all">
        All Achievements
      </button>
      <button class="filter-btn px-6 py-3 rounded-full font-medium" data-category="match3">
        🎮 Match-3
      </button>
      <button class="filter-btn px-6 py-3 rounded-full font-medium" data-category="daily">
        📅 Daily
      </button>
      <button class="filter-btn px-6 py-3 rounded-full font-medium" data-category="card">
        🃏 Card Games
      </button>
      <button class="filter-btn px-6 py-3 rounded-full font-medium" data-category="general">
        🏆 General
      </button>
    </div>

    <!-- Achievement Grid -->
    <div class="achievement-grid-container">
      <div class="grid-overlay"></div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 achievement-grid">
        ${cards}
      </div>
    </div>

    <!-- Stats -->
    <div class="text-center mt-12">
      <div class="bg-white/10 backdrop-blur-sm rounded-xl p-6 max-w-md mx-auto border border-white/20">
        <h3 class="text-2xl font-bold text-white mb-4 font-mono">
          <span class="text-green-400">&gt;</span> Achievement Stats
        </h3>
        <div class="grid grid-cols-2 gap-4 text-white">
          <div class="bg-black/20 rounded-lg p-4 border border-white/10">
            <div class="text-3xl font-bold text-cyan-400">${achievements.length}</div>
            <div class="text-sm opacity-80 font-mono">Total Achievements</div>
          </div>
          <div class="bg-black/20 rounded-lg p-4 border border-white/10">
            <div class="text-3xl font-bold text-purple-400">${new Set(achievements.map(a => a.category)).size}</div>
            <div class="text-sm opacity-80 font-mono">Categories</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Status Bar -->
  <div class="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-md border border-purple-500/30 rounded-full px-6 py-2 text-green-400 font-mono text-sm">
    <span class="animate-pulse">●</span> SYSTEM ONLINE | GRID LOCKED | ${achievements.length} ACHIEVEMENTS LOADED | MATRIX STABLE
  </div>

  <script>
    // Filter functionality
    const filterButtons = document.querySelectorAll('.filter-btn')
    const achievementCards = document.querySelectorAll('.achievement-card')

    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        const category = button.dataset.category

        // Update active button
        filterButtons.forEach(btn => btn.classList.remove('active', 'bg-white/30'))
        filterButtons.forEach(btn => btn.classList.add('bg-white/20'))
        button.classList.add('active', 'bg-white/30')

        // Filter cards
        achievementCards.forEach(card => {
          if (category === 'all') {
            card.style.display = 'block'
          } else {
            const cardCategory = card.querySelector('[data-category]')?.dataset.category ||
                               card.textContent.toLowerCase().includes(category) ? category : 'other'
            card.style.display = cardCategory === category ? 'block' : 'none'
          }
        })
      })
    })

    // Add category data attributes for filtering
    achievementCards.forEach(card => {
      const categoryText = card.querySelector('.text-xs.text-gray-500.uppercase')?.textContent.toLowerCase()
      card.setAttribute('data-category', categoryText || 'general')
    })
  </script>
</body>
</html>
  `.trim()
}

/**
 * Main function to generate images and cards
 */
async function main() {
  console.log('🎨 Starting badge image generation and card creation...\n')

  // Create images directory
  const imagesDir = path.join(__dirname, '..', 'public', 'achievement-badges')
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true })
  }

  console.log(`📁 Images will be saved to: ${imagesDir}`)

  // Generate and save all badge images
  for (const achievement of achievements) {
    try {
      console.log(`🎨 Generating badge for: ${achievement.name}`)

      const imageBuffer = await generateBadgeImage(achievement)
      const imagePath = path.join(imagesDir, `${achievement.id}.png`)

      fs.writeFileSync(imagePath, imageBuffer)
      console.log(`✅ Saved: ${achievement.id}.png`)

    } catch (error) {
      console.error(`❌ Failed to generate ${achievement.name}:`, error)
    }
  }

  // Generate HTML gallery
  console.log('\n📄 Generating achievement gallery HTML...')
  const galleryHtml = generateAchievementGallery(achievements, '/achievement-badges')
  const galleryPath = path.join(__dirname, '..', 'public', 'achievement-gallery.html')

  fs.writeFileSync(galleryPath, galleryHtml)
  console.log(`✅ Gallery saved to: ${galleryPath}`)

  // Generate JSON metadata for local use
  const localMetadata = achievements.map(achievement => ({
    id: achievement.id,
    name: achievement.name,
    description: achievement.description,
    rarity: achievement.rarity,
    emoji: achievement.emoji,
    category: achievement.category,
    color: achievement.color,
    imagePath: `/achievement-badges/${achievement.id}.png`
  }))

  const metadataPath = path.join(__dirname, '..', 'public', 'achievement-metadata.json')
  fs.writeFileSync(metadataPath, JSON.stringify(localMetadata, null, 2))
  console.log(`✅ Metadata saved to: ${metadataPath}`)

  console.log('\n🎉 Badge generation and card creation complete!')
  console.log(`📊 Generated ${achievements.length} badge images`)
  console.log(`🌐 Open achievement-gallery.html in your browser to view the gallery`)
  console.log(`📄 Gallery available at: http://localhost:3000/achievement-gallery.html`)
}

// Run the script
main().catch(console.error)