const { createCanvas, registerFont } = require('canvas')
const fs = require('fs')
const path = require('path')

// Achievement data from database
const achievements = [
  // Match3 Achievements (IDs 1-20)
  { id: 1, name: 'First Win', description: 'Win your first Match-3 game', requirement: 'Win 1 game', emoji: '🎯', rarity: 'Common', category: 'match3' },
  { id: 2, name: 'Hot Streak', description: 'Win 5 games in a row', requirement: '5 consecutive wins', emoji: '🔥', rarity: 'Rare', category: 'match3' },
  { id: 3, name: 'Gem Master', description: 'Collect 1000 gems', requirement: '1000 total gems', emoji: '💎', rarity: 'Epic', category: 'match3' },
  { id: 4, name: 'Star Player', description: 'Reach level 10', requirement: 'Level 10', emoji: '🌟', rarity: 'Legendary', category: 'match3' },
  { id: 5, name: 'Speed Demon', description: 'Complete a level in under 30 seconds', requirement: 'Fast completion', emoji: '⚡', rarity: 'Mythic', category: 'match3' },
  { id: 6, name: 'Combo King', description: 'Achieve a 10x combo', requirement: '10x combo', emoji: '🎪', rarity: 'Common', category: 'match3' },
  { id: 7, name: 'Champion', description: 'Win 50 games', requirement: '50 wins', emoji: '🏆', rarity: 'Rare', category: 'match3' },
  { id: 8, name: 'Artist', description: 'Create beautiful patterns', requirement: 'Special patterns', emoji: '🎨', rarity: 'Epic', category: 'match3' },
  { id: 9, name: 'Rainbow', description: 'Match all colors in one move', requirement: 'Rainbow match', emoji: '🌈', rarity: 'Legendary', category: 'match3' },
  { id: 10, name: 'Heart Breaker', description: 'Break 10,000 hearts', requirement: '10,000 hearts', emoji: '💖', rarity: 'Mythic', category: 'match3' },
  { id: 11, name: 'Royal', description: 'Reach the top of the leaderboard', requirement: '#1 position', emoji: '👑', rarity: 'Common', category: 'match3' },
  { id: 12, name: 'Mystic', description: 'Unlock all power-ups', requirement: 'All power-ups', emoji: '🔮', rarity: 'Rare', category: 'match3' },
  { id: 13, name: 'Lucky', description: 'Win with lucky bonuses', requirement: 'Lucky wins', emoji: '🍀', rarity: 'Epic', category: 'match3' },
  { id: 14, name: 'Inferno', description: 'Create massive chain reactions', requirement: 'Chain reactions', emoji: '🔥', rarity: 'Legendary', category: 'match3' },
  { id: 15, name: 'Frost', description: 'Freeze time perfectly', requirement: 'Perfect freeze', emoji: '❄️', rarity: 'Mythic', category: 'match3' },
  { id: 16, name: 'Thespian', description: 'Master all game modes', requirement: 'All modes', emoji: '🎭', rarity: 'Common', category: 'match3' },
  { id: 17, name: 'Unicorn', description: 'Achieve the impossible', requirement: 'Impossible feat', emoji: '🦄', rarity: 'Rare', category: 'match3' },
  { id: 18, name: 'Summit', description: 'Reach the highest peaks', requirement: 'Peak performance', emoji: '🏔️', rarity: 'Epic', category: 'match3' },
  { id: 19, name: 'Tempest', description: 'Control the storm', requirement: 'Storm mastery', emoji: '🌪️', rarity: 'Legendary', category: 'match3' },
  { id: 20, name: 'Phantom', description: 'Become untouchable', requirement: 'Phantom moves', emoji: '💀', rarity: 'Mythic', category: 'match3' },

  // Daily Claim Achievements (IDs 21-25)
  { id: 21, name: 'Daily Starter', description: 'Claim your first daily reward', requirement: '1 daily claim', emoji: '📅', rarity: 'Common', category: 'daily' },
  { id: 22, name: 'Streak Master', description: 'Maintain a 7-day claim streak', requirement: '7 consecutive days', emoji: '🔥', rarity: 'Rare', category: 'daily' },
  { id: 23, name: 'Dedicated Player', description: 'Claim rewards for 14 days', requirement: '14 total claims', emoji: '💪', rarity: 'Epic', category: 'daily' },
  { id: 24, name: 'Loyal Supporter', description: 'Claim rewards for 30 days', requirement: '30 total claims', emoji: '👑', rarity: 'Legendary', category: 'daily' },
  { id: 25, name: 'Eternal Claimant', description: 'Claim rewards for 90 days', requirement: '90 total claims', emoji: '♾️', rarity: 'Mythic', category: 'daily' },

  // Card Game Achievements (IDs 26-35)
  { id: 26, name: 'Card Novice', description: 'Play your first card game', requirement: '1 game played', emoji: '🃏', rarity: 'Common', category: 'card' },
  { id: 27, name: 'Card Winner', description: 'Win your first card game', requirement: '1 game won', emoji: '🎯', rarity: 'Rare', category: 'card' },
  { id: 28, name: 'Card Expert', description: 'Win 10 card games', requirement: '10 wins', emoji: '🎪', rarity: 'Epic', category: 'card' },
  { id: 29, name: 'Card Master', description: 'Win 25 card games', requirement: '25 wins', emoji: '🏆', rarity: 'Legendary', category: 'card' },
  { id: 30, name: 'Card God', description: 'Win 100 card games', requirement: '100 wins', emoji: '⚡', rarity: 'Mythic', category: 'card' },
  { id: 31, name: 'Card Legend', description: 'Win 50 card games', requirement: '50 wins', emoji: '👑', rarity: 'Common', category: 'card' },
  { id: 32, name: 'Card Addict', description: 'Play 200 card games', requirement: '200 games played', emoji: '🎰', rarity: 'Rare', category: 'card' },
  { id: 33, name: 'Card Collector', description: 'Collect all card types', requirement: 'All card types', emoji: '🗃️', rarity: 'Epic', category: 'card' },
  { id: 34, name: 'Card Strategist', description: 'Win with perfect strategy', requirement: 'Strategic wins', emoji: '🧠', rarity: 'Legendary', category: 'card' },
  { id: 35, name: 'Card Veteran', description: 'Play 500 card games', requirement: '500 games played', emoji: '🎖️', rarity: 'Mythic', category: 'card' },

  // General Achievements (IDs 36-40)
  { id: 36, name: 'Well Rounded', description: 'Play all game types', requirement: '1 game in each type', emoji: '🎭', rarity: 'Common', category: 'general' },
  { id: 37, name: 'High Scorer', description: 'Reach a high score of 1000', requirement: '1000 points', emoji: '📊', rarity: 'Rare', category: 'general' },
  { id: 38, name: 'Level Climber', description: 'Reach level 5 in Match-3', requirement: 'Level 5', emoji: '🗻', rarity: 'Epic', category: 'general' },
  { id: 39, name: 'Perfectionist', description: 'Achieve perfect scores', requirement: 'Perfect games', emoji: '💎', rarity: 'Legendary', category: 'general' },
  { id: 40, name: 'Marathon Player', description: 'Play for 24 hours total', requirement: '24 hours gameplay', emoji: '🏃', rarity: 'Mythic', category: 'general' }
]

// Rarity colors and gradients - Vibrant Premium NFT style
const rarityStyles = {
  Common: { 
    bg: ['#2D3748', '#1A202C'],
    accent: ['#4FD1C5', '#81E6D9'],
    secondary: ['#4299E1', '#63B3ED'],
    border: '#4FD1C5',
    glow: 'rgba(79, 209, 197, 0.9)',
    shine: 'rgba(129, 230, 217, 0.6)'
  },
  Rare: { 
    bg: ['#0C4A6E', '#075985'],
    accent: ['#0EA5E9', '#38BDF8'],
    secondary: ['#8B5CF6', '#A78BFA'],
    border: '#0EA5E9',
    glow: 'rgba(14, 165, 233, 1)',
    shine: 'rgba(56, 189, 248, 0.7)'
  },
  Epic: { 
    bg: ['#581C87', '#6B21A8'],
    accent: ['#A855F7', '#C084FC'],
    secondary: ['#EC4899', '#F472B6'],
    border: '#A855F7',
    glow: 'rgba(168, 85, 247, 1)',
    shine: 'rgba(192, 132, 252, 0.8)'
  },
  Legendary: { 
    bg: ['#B45309', '#D97706'],
    accent: ['#FBBF24', '#FCD34D'],
    secondary: ['#F59E0B', '#FBBF24'],
    border: '#FBBF24',
    glow: 'rgba(251, 191, 36, 1)',
    shine: 'rgba(252, 211, 77, 0.9)'
  },
  Mythic: { 
    bg: ['#BE123C', '#E11D48'],
    accent: ['#F43F5E', '#FB7185'],
    secondary: ['#F97316', '#FB923C'],
    border: '#F43F5E',
    glow: 'rgba(244, 63, 94, 1)',
    shine: 'rgba(251, 113, 133, 0.9)'
  }
}

function drawParticles(ctx, width, height, style, count = 40) {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * width
    const y = Math.random() * height
    const size = Math.random() * 4 + 1
    const alpha = Math.random() * 0.7 + 0.3
    
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    
    // Color particles based on rarity
    const useColorParticle = Math.random() > 0.5
    if (useColorParticle) {
      ctx.fillStyle = style.accent[0]
      ctx.shadowColor = style.glow
      ctx.shadowBlur = 8
    } else {
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
    }
    ctx.fill()
    ctx.shadowBlur = 0
  }
}

function drawRadialBurst(ctx, width, height, style) {
  const centerX = width / 2
  const centerY = height / 2
  const rayCount = 24
  
  for (let i = 0; i < rayCount; i++) {
    const angle = (Math.PI * 2 / rayCount) * i
    const length = Math.random() * 100 + 150
    const endX = centerX + Math.cos(angle) * length
    const endY = centerY + Math.sin(angle) * length
    
    const gradient = ctx.createLinearGradient(centerX, centerY, endX, endY)
    gradient.addColorStop(0, `${style.accent[0]}40`)
    gradient.addColorStop(0.5, `${style.accent[1]}20`)
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    
    ctx.strokeStyle = gradient
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.lineTo(endX, endY)
    ctx.stroke()
  }
}

function drawHexPattern(ctx, width, height, style) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
  ctx.lineWidth = 1
  
  const hexSize = 40
  for (let y = -hexSize; y < height + hexSize; y += hexSize * 1.5) {
    for (let x = -hexSize; x < width + hexSize; x += hexSize * Math.sqrt(3)) {
      const offsetX = (y / (hexSize * 1.5)) % 2 === 0 ? 0 : (hexSize * Math.sqrt(3)) / 2
      drawHexagon(ctx, x + offsetX, y, hexSize)
    }
  }
}

function drawHexagon(ctx, x, y, size) {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i
    const hx = x + size * Math.cos(angle)
    const hy = y + size * Math.sin(angle)
    if (i === 0) ctx.moveTo(hx, hy)
    else ctx.lineTo(hx, hy)
  }
  ctx.closePath()
  ctx.stroke()
}

function createAchievementCard(achievement) {
  const width = 512
  const height = 512
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')

  const style = rarityStyles[achievement.rarity]

  // Rich gradient background
  const bgGradient = ctx.createLinearGradient(0, 0, width, height)
  bgGradient.addColorStop(0, style.bg[0])
  bgGradient.addColorStop(0.5, style.bg[1])
  bgGradient.addColorStop(1, style.bg[0])
  ctx.fillStyle = bgGradient
  ctx.fillRect(0, 0, width, height)

  // Radial light burst from center
  const centerRadial = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/1.5)
  centerRadial.addColorStop(0, `${style.accent[0]}60`)
  centerRadial.addColorStop(0.3, `${style.accent[1]}30`)
  centerRadial.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = centerRadial
  ctx.fillRect(0, 0, width, height)

  // Radial burst rays
  drawRadialBurst(ctx, width, height, style)

  // Hexagonal pattern
  drawHexPattern(ctx, width, height, style)

  // Diagonal accent gradient
  const diagonalGradient = ctx.createLinearGradient(0, 0, width, height)
  diagonalGradient.addColorStop(0, `${style.secondary[0]}25`)
  diagonalGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)')
  diagonalGradient.addColorStop(1, `${style.secondary[1]}25`)
  ctx.fillStyle = diagonalGradient
  ctx.fillRect(0, 0, width, height)

  // Particles
  drawParticles(ctx, width, height, style, 50)

  // Triple glow border effect
  ctx.shadowColor = style.glow
  ctx.shadowBlur = 50
  ctx.strokeStyle = style.border
  ctx.lineWidth = 8
  ctx.strokeRect(12, 12, width - 24, height - 24)
  
  ctx.shadowBlur = 30
  ctx.lineWidth = 6
  ctx.strokeRect(16, 16, width - 32, height - 32)
  
  ctx.shadowBlur = 15
  ctx.lineWidth = 4
  ctx.strokeRect(20, 20, width - 40, height - 40)
  ctx.shadowBlur = 0

  // Bright inner border
  ctx.strokeStyle = style.accent[1]
  ctx.lineWidth = 3
  ctx.strokeRect(28, 28, width - 56, height - 56)
  
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.lineWidth = 2
  ctx.strokeRect(32, 32, width - 64, height - 64)
  
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
  ctx.lineWidth = 1
  ctx.strokeRect(36, 36, width - 72, height - 72)

  // Top accent bar with glow
  const topGradient = ctx.createLinearGradient(40, 45, width - 40, 45)
  topGradient.addColorStop(0, 'rgba(255, 255, 255, 0)')
  topGradient.addColorStop(0.3, style.secondary[0])
  topGradient.addColorStop(0.5, style.accent[1])
  topGradient.addColorStop(0.7, style.secondary[1])
  topGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.shadowColor = style.glow
  ctx.shadowBlur = 20
  ctx.fillStyle = topGradient
  ctx.fillRect(40, 45, width - 80, 5)
  ctx.shadowBlur = 0

  // Bottom accent bar with glow
  const bottomGradient = ctx.createLinearGradient(40, height - 50, width - 40, height - 50)
  bottomGradient.addColorStop(0, 'rgba(255, 255, 255, 0)')
  bottomGradient.addColorStop(0.3, style.secondary[0])
  bottomGradient.addColorStop(0.5, style.accent[1])
  bottomGradient.addColorStop(0.7, style.secondary[1])
  bottomGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.shadowColor = style.glow
  ctx.shadowBlur = 20
  ctx.fillStyle = bottomGradient
  ctx.fillRect(40, height - 50, width - 80, 5)
  ctx.shadowBlur = 0

  // Emoji outer glow ring
  ctx.beginPath()
  ctx.arc(width / 2, 160, 115, 0, Math.PI * 2)
  ctx.strokeStyle = style.accent[0]
  ctx.lineWidth = 8
  ctx.shadowColor = style.glow
  ctx.shadowBlur = 30
  ctx.stroke()
  ctx.shadowBlur = 0
  
  // Emoji circle background with vibrant gradient
  ctx.beginPath()
  ctx.arc(width / 2, 160, 105, 0, Math.PI * 2)
  const emojiCircleGradient = ctx.createRadialGradient(width/2, 160, 0, width/2, 160, 105)
  emojiCircleGradient.addColorStop(0, `${style.accent[1]}80`)
  emojiCircleGradient.addColorStop(0.5, `${style.accent[0]}50`)
  emojiCircleGradient.addColorStop(1, `${style.secondary[0]}30`)
  ctx.fillStyle = emojiCircleGradient
  ctx.fill()
  
  // Emoji circle bright border
  ctx.strokeStyle = style.accent[1]
  ctx.lineWidth = 4
  ctx.shadowColor = style.shine
  ctx.shadowBlur = 20
  ctx.stroke()
  ctx.shadowBlur = 0
  
  // Inner shine
  ctx.beginPath()
  ctx.arc(width / 2, 160, 95, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.lineWidth = 2
  ctx.stroke()

  // Emoji (large) with strong glow
  ctx.font = 'bold 120px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = style.glow
  ctx.shadowBlur = 30
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText(achievement.emoji, width / 2, 160)
  ctx.shadowBlur = 0

  // Achievement name background with gradient
  const nameBoxGradient = ctx.createLinearGradient(50, 290, 50, 350)
  nameBoxGradient.addColorStop(0, `${style.accent[0]}60`)
  nameBoxGradient.addColorStop(1, `${style.secondary[0]}40`)
  ctx.fillStyle = nameBoxGradient
  ctx.fillRect(50, 290, width - 100, 60)
  
  // Achievement name glowing border
  ctx.strokeStyle = style.accent[1]
  ctx.lineWidth = 3
  ctx.shadowColor = style.glow
  ctx.shadowBlur = 15
  ctx.strokeRect(50, 290, width - 100, 60)
  ctx.shadowBlur = 0
  
  // Inner bright border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
  ctx.lineWidth = 1
  ctx.strokeRect(53, 293, width - 106, 54)

  // Achievement name with powerful glow
  ctx.font = 'bold 38px Arial'
  ctx.fillStyle = '#FFFFFF'
  ctx.shadowColor = style.glow
  ctx.shadowBlur = 20
  ctx.fillText(achievement.name, width / 2, 320)
  ctx.shadowBlur = 0

  // Rarity badge background with vibrant gradient
  const rarityY = 375
  const rarityWidth = 220
  const rarityHeight = 45
  const rarityX = (width - rarityWidth) / 2
  
  const rarityGradient = ctx.createLinearGradient(rarityX, rarityY, rarityX + rarityWidth, rarityY + rarityHeight)
  rarityGradient.addColorStop(0, style.secondary[0])
  rarityGradient.addColorStop(0.5, style.accent[0])
  rarityGradient.addColorStop(1, style.secondary[1])
  ctx.fillStyle = rarityGradient
  ctx.shadowColor = style.glow
  ctx.shadowBlur = 25
  ctx.fillRect(rarityX, rarityY, rarityWidth, rarityHeight)
  ctx.shadowBlur = 0
  
  // Rarity badge glowing border
  ctx.strokeStyle = style.accent[1]
  ctx.lineWidth = 3
  ctx.shadowColor = style.shine
  ctx.shadowBlur = 20
  ctx.strokeRect(rarityX, rarityY, rarityWidth, rarityHeight)
  ctx.shadowBlur = 0
  
  // Inner shine border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
  ctx.lineWidth = 2
  ctx.strokeRect(rarityX + 3, rarityY + 3, rarityWidth - 6, rarityHeight - 6)

  // Rarity text with intense glow
  ctx.font = 'bold 24px Arial'
  ctx.fillStyle = '#FFFFFF'
  ctx.shadowColor = style.glow
  ctx.shadowBlur = 15
  ctx.fillText(achievement.rarity.toUpperCase(), width / 2, rarityY + 25)
  ctx.shadowBlur = 0

  // ID and Category with colored text
  ctx.font = 'bold 20px monospace'
  ctx.fillStyle = style.accent[1]
  ctx.shadowColor = style.glow
  ctx.shadowBlur = 10
  ctx.fillText(`#${achievement.id}`, width / 2 - 60, 445)
  ctx.shadowBlur = 0
  
  ctx.font = 'bold 18px Arial'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
  ctx.fillText(`•`, width / 2, 445)
  
  ctx.fillStyle = style.secondary[1]
  ctx.shadowColor = style.glow
  ctx.shadowBlur = 10
  ctx.fillText(achievement.category.toUpperCase(), width / 2 + 60, 445)
  ctx.shadowBlur = 0

  // Joybit branding with intense glow
  ctx.font = 'bold 24px Arial'
  const brandGradient = ctx.createLinearGradient(width/2 - 50, 480, width/2 + 50, 485)
  brandGradient.addColorStop(0, style.accent[0])
  brandGradient.addColorStop(0.5, style.accent[1])
  brandGradient.addColorStop(1, style.accent[0])
  ctx.fillStyle = brandGradient
  ctx.shadowColor = style.glow
  ctx.shadowBlur = 25
  ctx.fillText('JOYBIT', width / 2, 485)
  ctx.shadowBlur = 0

  return canvas
}

function generateAllCards() {
  const outputDir = path.join(__dirname, '../public/achievement-cards')
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  console.log('🎨 Generating professional achievement cards...\n')

  achievements.forEach(achievement => {
    const canvas = createAchievementCard(achievement)
    const buffer = canvas.toBuffer('image/png')
    const filename = `${achievement.id}.png`
    const filepath = path.join(outputDir, filename)
    
    fs.writeFileSync(filepath, buffer)
    console.log(`✅ Generated: ${filename} - ${achievement.name} (${achievement.rarity})`)
  })

  console.log(`\n✅ All 40 achievement cards generated in ${outputDir}`)
}

// Run the generator
if (require.main === module) {
  generateAllCards()
}

// Export for use in other scripts
module.exports = { achievements }
