import { createClient } from '@libsql/client'
import { ethers } from 'ethers'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

// Achievement type definition
export interface Achievement {
  id: number
  name: string
  description: string
  requirement: string
  emoji: string
  rarity: string
  category: string
  price?: string
  created_at?: string
  // Contract-related fields
  exists?: boolean
  active?: boolean
}

// Helper function to convert BigInts to numbers
function convertBigInts(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'bigint') return Number(obj)
  if (Array.isArray(obj)) return obj.map(convertBigInts)
  if (typeof obj === 'object') {
    const converted: any = {}
    for (const key in obj) {
      converted[key] = convertBigInts(obj[key])
    }
    return converted
  }
  return obj
}

// Initialize database tables
export async function initAchievementTables() {
  try {
    // Create achievements table
    const achievementsCheck = await client.execute(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='achievements'
    `)

    if (achievementsCheck.rows.length === 0) {
      await client.execute(`
        CREATE TABLE achievements (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT NOT NULL,
          requirement TEXT NOT NULL,
          emoji TEXT NOT NULL,
          rarity TEXT NOT NULL,
          category TEXT NOT NULL,
          price TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('✅ Achievements table created')
    }

    // Check if achievements table has data, if not, insert default achievements
    const achievementsCount = await client.execute(`SELECT COUNT(*) as count FROM achievements`)
    if (achievementsCount.rows[0].count === 0) {
      console.log('✅ Inserting default achievements data...')
      
      // Insert all achievements - IDs must match contract (1-40)
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

      for (const achievement of achievements) {
        await client.execute({
          sql: `INSERT INTO achievements (id, name, description, requirement, emoji, rarity, category) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [achievement.id, achievement.name, achievement.description, achievement.requirement, achievement.emoji, achievement.rarity, achievement.category]
        })
      }
      console.log('✅ Achievements data inserted')
    }

    // Create user_stats table
    const userStatsCheck = await client.execute(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='user_stats'
    `)

    if (userStatsCheck.rows.length === 0) {
      await client.execute(`
        CREATE TABLE user_stats (
          user_address TEXT PRIMARY KEY,
          -- Match3 stats
          match3_games_played INTEGER DEFAULT 0,
          match3_games_won INTEGER DEFAULT 0,
          match3_high_score INTEGER DEFAULT 0,
          match3_high_score_level INTEGER DEFAULT 0,
          match3_win_streak INTEGER DEFAULT 0,
          match3_current_streak INTEGER DEFAULT 0,
          match3_total_gems INTEGER DEFAULT 0,
          match3_max_combo INTEGER DEFAULT 0,
          match3_best_time INTEGER DEFAULT 999,
          match3_last_played INTEGER DEFAULT 0,

          -- Card game stats
          card_games_played INTEGER DEFAULT 0,
          card_games_won INTEGER DEFAULT 0,
          card_last_played INTEGER DEFAULT 0,

          -- Daily claim stats
          daily_total_claims INTEGER DEFAULT 0,
          daily_current_streak INTEGER DEFAULT 0,
          daily_longest_streak INTEGER DEFAULT 0,
          daily_last_claim INTEGER DEFAULT 0,

          -- General stats
          total_playtime INTEGER DEFAULT 0,
          login_days INTEGER DEFAULT 0,
          last_login INTEGER DEFAULT 0,
          achievements_shared INTEGER DEFAULT 0,
          perfect_games INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('✅ User stats table created')
    }

    // Create user_achievements table
    const userAchievementsCheck = await client.execute(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='user_achievements'
    `)

    if (userAchievementsCheck.rows.length === 0) {
      await client.execute(`
        CREATE TABLE user_achievements (
          user_address TEXT NOT NULL,
          achievement_id TEXT NOT NULL,
          unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          minted BOOLEAN DEFAULT FALSE,
          minted_at DATETIME,
          transaction_hash TEXT,
          PRIMARY KEY (user_address, achievement_id),
          FOREIGN KEY (achievement_id) REFERENCES achievements(id)
        )
      `)
      console.log('✅ User achievements table created')
    }

    // Create leaderboard_scores table
    const leaderboardScoresCheck = await client.execute(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='leaderboard_scores'
    `)

    if (leaderboardScoresCheck.rows.length === 0) {
      await client.execute(`
        CREATE TABLE leaderboard_scores (
          address TEXT PRIMARY KEY,
          score INTEGER DEFAULT 0,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('✅ Leaderboard scores table created')
    }

    // Create indexes for better performance
    const userAchievementsIndexCheck = await client.execute(`
      SELECT name FROM sqlite_master
      WHERE type='index' AND name='idx_user_achievements_address'
    `)

    if (userAchievementsIndexCheck.rows.length === 0) {
      await client.execute(`
        CREATE INDEX idx_user_achievements_address ON user_achievements(user_address)
      `)
      console.log('✅ User achievements address index created')
    }

    const userAchievementsAchievementIndexCheck = await client.execute(`
      SELECT name FROM sqlite_master
      WHERE type='index' AND name='idx_user_achievements_id'
    `)

    if (userAchievementsAchievementIndexCheck.rows.length === 0) {
      await client.execute(`
        CREATE INDEX idx_user_achievements_id ON user_achievements(achievement_id)
      `)
      console.log('✅ User achievements ID index created')
    }

    const leaderboardScoresIndexCheck = await client.execute(`
      SELECT name FROM sqlite_master
      WHERE type='index' AND name='idx_leaderboard_scores'
    `)

    if (leaderboardScoresIndexCheck.rows.length === 0) {
      await client.execute(`
        CREATE INDEX idx_leaderboard_scores ON leaderboard_scores(score DESC)
      `)
      console.log('✅ Leaderboard scores index created')
    }

  } catch (error) {
    console.error('❌ Error initializing achievement tables:', error)
    throw error
  }
}

// Get user stats
export async function getUserStats(userAddress: string) {
  try {
    const result = await client.execute({
      sql: `SELECT * FROM user_stats WHERE LOWER(user_address) = LOWER(?)`,
      args: [userAddress]
    })

    if (result.rows.length === 0) {
      // Create default stats for new user
      await client.execute({
        sql: `INSERT INTO user_stats (user_address) VALUES (?)`,
        args: [userAddress]
      })
      return {
        user_address: userAddress,
        match3_games_played: 0,
        match3_games_won: 0,
        match3_high_score: 0,
        match3_high_score_level: 0,
        match3_win_streak: 0,
        match3_current_streak: 0,
        match3_total_gems: 0,
        match3_max_combo: 0,
        match3_best_time: 999,
        match3_last_played: 0,
        card_games_played: 0,
        card_games_won: 0,
        card_last_played: 0,
        daily_total_claims: 0,
        daily_current_streak: 0,
        daily_longest_streak: 0,
        daily_last_claim: 0,
        total_playtime: 0,
        login_days: 0,
        last_login: 0,
        achievements_shared: 0,
        perfect_games: 0
      }
    }

    return convertBigInts(result.rows[0])
  } catch (error) {
    console.error('Error getting user stats:', error)
    throw error
  }
}

// Update user stats (SET values - replaces existing)
export async function updateUserStats(userAddress: string, stats: Partial<any>) {
  try {
    // Normalize address to lowercase
    const normalizedAddress = userAddress.toLowerCase()
    
    // Ensure user exists first
    await getUserStats(normalizedAddress)
    
    const fields = Object.keys(stats)
    const values = Object.values(stats)

    if (fields.length === 0) return

    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const sql = `UPDATE user_stats SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE LOWER(user_address) = ?`

    await client.execute({
      sql,
      args: [...values, normalizedAddress]
    })
  } catch (error) {
    console.error('Error updating user stats:', error)
    throw error
  }
}

// Increment user stats (ADD to existing values)
export async function incrementUserStats(userAddress: string, stats: Partial<any>) {
  try {
    // Normalize address to lowercase
    const normalizedAddress = userAddress.toLowerCase()
    
    // Ensure user exists first
    await getUserStats(normalizedAddress)
    
    const fields = Object.keys(stats)
    const values = Object.values(stats)

    if (fields.length === 0) return

    // Build INCREMENT clause: field = field + ?
    const setClause = fields.map(field => `${field} = ${field} + ?`).join(', ')
    const sql = `UPDATE user_stats SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE LOWER(user_address) = ?`

    await client.execute({
      sql,
      args: [...values, normalizedAddress]
    })

    console.log(`✅ Incremented stats for ${normalizedAddress}:`, stats)
  } catch (error) {
    console.error('Error incrementing user stats:', error)
    throw error
  }
}

// Get user achievements (legacy function for backward compatibility)
export async function getUserAchievements(userAddress: string) {
  return getUserAchievementsDetailed(userAddress)
}

// Get user achievements with full details (optimized for profile display)
export async function getUserAchievementsDetailed(userAddress: string) {
  try {
    const result = await client.execute({
      sql: `
        SELECT 
          ua.achievement_id,
          ua.unlocked_at,
          ua.minted,
          ua.minted_at,
          ua.transaction_hash,
          a.name,
          a.description,
          a.requirement,
          a.emoji,
          a.rarity,
          a.category
        FROM user_achievements ua
        JOIN achievements a ON ua.achievement_id = a.id
        WHERE ua.user_address = ?
        ORDER BY ua.unlocked_at DESC
      `,
      args: [userAddress]
    })

    return convertBigInts(result.rows)
  } catch (error) {
    console.error('Error getting detailed user achievements:', error)
    throw error
  }
}

// Get user achievements summary (for faster loading)
export async function getUserAchievementsSummary(userAddress: string) {
  try {
    const result = await client.execute({
      sql: `
        SELECT 
          COUNT(*) as total_unlocked,
          COUNT(CASE WHEN minted = TRUE THEN 1 END) as total_minted,
          GROUP_CONCAT(achievement_id) as achievement_ids
        FROM user_achievements 
        WHERE user_address = ?
      `,
      args: [userAddress]
    })

    const row = result.rows[0]
    return {
      total_unlocked: Number(row.total_unlocked) || 0,
      total_minted: Number(row.total_minted) || 0,
      achievement_ids: row.achievement_ids ? String(row.achievement_ids).split(',') : []
    }
  } catch (error) {
    console.error('Error getting user achievements summary:', error)
    return { total_unlocked: 0, total_minted: 0, achievement_ids: [] }
  }
}

// Unlock achievement
export async function unlockAchievement(userAddress: string, achievementId: number) {
  try {
    // Convert achievementId to string to match database schema
    const achievementIdStr = achievementId.toString()
    
    // Check if already unlocked
    const existing = await client.execute({
      sql: `SELECT * FROM user_achievements WHERE user_address = ? AND achievement_id = ?`,
      args: [userAddress, achievementIdStr]
    })

    if (existing.rows.length > 0) {
      return false // Already unlocked
    }

    // Unlock achievement
    await client.execute({
      sql: `INSERT INTO user_achievements (user_address, achievement_id) VALUES (?, ?)`,
      args: [userAddress, achievementIdStr]
    })

    // Award leaderboard points for unlocking achievement
    try {
      const unlockPoints = SCORING_SYSTEM.UNLOCKED_ACHIEVEMENT // Points for unlocking achievement
      const currentScoreResult = await client.execute({
        sql: 'SELECT score FROM leaderboard_scores WHERE address = ?',
        args: [userAddress]
      })
      const currentScore = currentScoreResult.rows.length > 0 ? currentScoreResult.rows[0].score as number : 0
      const newScore = currentScore + unlockPoints

      await client.execute({
        sql: 'INSERT OR REPLACE INTO leaderboard_scores (address, score) VALUES (?, ?)',
        args: [userAddress, newScore]
      })

      console.log(`✅ Awarded ${unlockPoints} leaderboard points for unlocking achievement: ${achievementId}`)
    } catch (scoreError) {
      console.error('Failed to award leaderboard points for unlocking achievement:', scoreError)
    }

    return true // Newly unlocked
  } catch (error) {
    console.error('Error unlocking achievement:', error)
    throw error
  }
}

// Mark achievement as minted
export async function markAchievementMinted(userAddress: string, achievementId: number, transactionHash: string) {
  try {
    await client.execute({
      sql: `UPDATE user_achievements SET minted = TRUE, minted_at = CURRENT_TIMESTAMP, transaction_hash = ? WHERE user_address = ? AND achievement_id = ?`,
      args: [transactionHash, userAddress, achievementId]
    })

    // Award leaderboard points for minting achievement
    try {
      const mintPoints = SCORING_SYSTEM.MINTED_ACHIEVEMENT // Points for minting achievement
      const currentScoreResult = await client.execute({
        sql: 'SELECT score FROM leaderboard_scores WHERE address = ?',
        args: [userAddress]
      })
      const currentScore = currentScoreResult.rows.length > 0 ? currentScoreResult.rows[0].score as number : 0
      const newScore = currentScore + mintPoints

      await client.execute({
        sql: 'INSERT OR REPLACE INTO leaderboard_scores (address, score) VALUES (?, ?)',
        args: [userAddress, newScore]
      })

      console.log(`✅ Awarded ${mintPoints} leaderboard points for minting achievement: ${achievementId}`)
    } catch (scoreError) {
      console.error('Failed to award leaderboard points for minting achievement:', scoreError)
    }

    return true
  } catch (error) {
    console.error('Error marking achievement as minted:', error)
    return false
  }
}

// Get all achievements
export async function getAllAchievements() {
  try {
    const result = await client.execute(`SELECT * FROM achievements ORDER BY category, rarity DESC`)
    return convertBigInts(result.rows)
  } catch (error) {
    console.error('Database unavailable, falling back to contract data:', error)
    // Fallback to contract data when database is unavailable
    return await getAllAchievementsFromContract()
  }
}

// Fallback function to get achievements from contract when database is unavailable
async function getAllAchievementsFromContract() {
  try {
    const contractAddress = process.env.NEXT_PUBLIC_ACHIEVEMENT_ERC1155_ADDRESS
    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      console.error('Contract address not configured')
      return []
    }

    // Import here to avoid circular dependencies
    const { ACHIEVEMENT_ERC1155_ABI } = await import('@/lib/contracts/abis')

    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org')
    const contract = new ethers.Contract(contractAddress, ACHIEVEMENT_ERC1155_ABI, provider)

    // Get all achievement IDs
    const achievementIds = await contract.getAllAchievementIds()
    console.log('Found achievement IDs from contract:', achievementIds)

    const achievements = []

    // Rarity name mapping
    const rarityNames = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic']

    for (const id of achievementIds) {
      try {
        const result = await contract.getAchievement(Number(id))
        const [rarity, priceWei, active] = result
        const price = ethers.formatEther(priceWei)

        // Create achievement with default metadata since contract doesn't store names/descriptions
        achievements.push({
          id: id.toString(),
          name: `Achievement #${id}`,
          description: `Achievement ${id} - ${rarityNames[Number(rarity)]}`,
          requirement: 'Complete the required tasks',
          emoji: '🏆',
          rarity: rarityNames[Number(rarity)],
          category: 'General',
          price: price,
          active: active
        })
      } catch (error) {
        console.error(`Error fetching achievement ${id}:`, error)
        // Skip this achievement if there's an error
        continue
      }
    }

    console.log('Loaded achievements from contract:', achievements.length)
    return achievements
  } catch (error) {
    console.error('Error loading achievements from contract:', error)
    return []
  }
}

// Check and unlock achievements based on current stats
export async function checkAndUnlockAchievements(userAddress: string) {
  try {
    const stats = await getUserStats(userAddress)
    const unlockedAchievements = []

    console.log('Checking achievements for user stats:', stats)

    // Match3 achievements
    // ID 1: First Win - play any match3 game
    if (stats.match3_games_played > 0 && !(await isAchievementUnlocked(userAddress, 1))) {
      console.log('Unlocking achievement 1: First Win')
      await unlockAchievement(userAddress, 1)
      unlockedAchievements.push(1)
    }

    // ID 2: Hot Streak - 5+ win streak (if tracked)
    if (stats.match3_win_streak >= 5 && !(await isAchievementUnlocked(userAddress, 2))) {
      console.log('Unlocking achievement 2: Hot Streak')
      await unlockAchievement(userAddress, 2)
      unlockedAchievements.push(2)
    }

    // ID 3: Gem Master - 1000+ gems (if tracked)
    if (stats.match3_total_gems >= 1000 && !(await isAchievementUnlocked(userAddress, 3))) {
      console.log('Unlocking achievement 3: Gem Master')
      await unlockAchievement(userAddress, 3)
      unlockedAchievements.push(3)
    }

    // ID 4: Level Climber - reach level 10
    if (stats.match3_high_score_level >= 10 && !(await isAchievementUnlocked(userAddress, 4))) {
      console.log('Unlocking achievement 4: Level Climber')
      await unlockAchievement(userAddress, 4)
      unlockedAchievements.push(4)
    }

    // ID 5: Speed Demon - complete in under 30 seconds
    if (stats.match3_best_time > 0 && stats.match3_best_time < 30 && !(await isAchievementUnlocked(userAddress, 5))) {
      console.log('Unlocking achievement 5: Speed Demon')
      await unlockAchievement(userAddress, 5)
      unlockedAchievements.push(5)
    }

    // ID 6: Combo King - 10+ combo
    if (stats.match3_max_combo >= 10 && !(await isAchievementUnlocked(userAddress, 6))) {
      console.log('Unlocking achievement 6: Combo King')
      await unlockAchievement(userAddress, 6)
      unlockedAchievements.push(6)
    }

    // ID 7: Champion - 50+ games won
    if (stats.match3_games_won >= 50 && !(await isAchievementUnlocked(userAddress, 7))) {
      console.log('Unlocking achievement 7: Champion')
      await unlockAchievement(userAddress, 7)
      unlockedAchievements.push(7)
    }

    // Daily claim achievements
    // ID 21: Daily Starter - first claim
    if (stats.daily_total_claims > 0 && !(await isAchievementUnlocked(userAddress, 21))) {
      console.log('Unlocking achievement 21: Daily Starter')
      await unlockAchievement(userAddress, 21)
      unlockedAchievements.push(21)
    }

    // ID 22: Streak Master - 7 day streak
    if (stats.daily_current_streak >= 7 && !(await isAchievementUnlocked(userAddress, 22))) {
      console.log('Unlocking achievement 22: Streak Master')
      await unlockAchievement(userAddress, 22)
      unlockedAchievements.push(22)
    }

    // ID 23: Dedicated Player - 14 total claims
    if (stats.daily_total_claims >= 14 && !(await isAchievementUnlocked(userAddress, 23))) {
      console.log('Unlocking achievement 23: Dedicated Player')
      await unlockAchievement(userAddress, 23)
      unlockedAchievements.push(23)
    }

    // ID 24: Loyal Supporter - 30 total claims
    if (stats.daily_total_claims >= 30 && !(await isAchievementUnlocked(userAddress, 24))) {
      console.log('Unlocking achievement 24: Loyal Supporter')
      await unlockAchievement(userAddress, 24)
      unlockedAchievements.push(24)
    }

    // ID 25: Eternal Claimant - 90 total claims
    if (stats.daily_total_claims >= 90 && !(await isAchievementUnlocked(userAddress, 25))) {
      console.log('Unlocking achievement 25: Eternal Claimant')
      await unlockAchievement(userAddress, 25)
      unlockedAchievements.push(25)
    }

    // Card game achievements
    // ID 26: Card Novice - first card game
    if (stats.card_games_played > 0 && !(await isAchievementUnlocked(userAddress, 26))) {
      console.log('Unlocking achievement 26: Card Novice')
      await unlockAchievement(userAddress, 26)
      unlockedAchievements.push(26)
    }

    // ID 27: Card Winner - first win
    if (stats.card_games_won > 0 && !(await isAchievementUnlocked(userAddress, 27))) {
      console.log('Unlocking achievement 27: Card Winner')
      await unlockAchievement(userAddress, 27)
      unlockedAchievements.push(27)
    }

    // ID 28: Card Addict - 10 wins
    if (stats.card_games_won >= 10 && !(await isAchievementUnlocked(userAddress, 28))) {
      console.log('Unlocking achievement 28: Card Addict')
      await unlockAchievement(userAddress, 28)
      unlockedAchievements.push(28)
    }

    // ID 29: Card Expert - 25 wins
    if (stats.card_games_won >= 25 && !(await isAchievementUnlocked(userAddress, 29))) {
      console.log('Unlocking achievement 29: Card Expert')
      await unlockAchievement(userAddress, 29)
      unlockedAchievements.push(29)
    }

    // ID 30: Card God - 100 wins
    if (stats.card_games_won >= 100 && !(await isAchievementUnlocked(userAddress, 30))) {
      console.log('Unlocking achievement 30: Card God')
      await unlockAchievement(userAddress, 30)
      unlockedAchievements.push(30)
    }

    // ID 31: Card Master - 50 wins
    if (stats.card_games_won >= 50 && !(await isAchievementUnlocked(userAddress, 31))) {
      console.log('Unlocking achievement 31: Card Master')
      await unlockAchievement(userAddress, 31)
      unlockedAchievements.push(31)
    }

    // ID 32: Card Collector - 200 games played
    if (stats.card_games_played >= 200 && !(await isAchievementUnlocked(userAddress, 32))) {
      console.log('Unlocking achievement 32: Card Collector')
      await unlockAchievement(userAddress, 32)
      unlockedAchievements.push(32)
    }

    // General achievements
    // ID 36: Well Rounded - played all game types
    const hasPlayedAllGames = stats.match3_games_played > 0 && stats.card_games_played > 0 && stats.daily_total_claims > 0
    if (hasPlayedAllGames && !(await isAchievementUnlocked(userAddress, 36))) {
      console.log('Unlocking achievement 36: Well Rounded')
      await unlockAchievement(userAddress, 36)
      unlockedAchievements.push(36)
    }

    console.log('Total achievements unlocked:', unlockedAchievements.length)
    return unlockedAchievements
  } catch (error) {
    console.error('Error checking achievements:', error)
    throw error
  }
}

// Helper function to check if achievement is unlocked
async function isAchievementUnlocked(userAddress: string, achievementId: number): Promise<boolean> {
  try {
    // Convert achievementId to string to match database schema
    const achievementIdStr = achievementId.toString()
    
    const result = await client.execute({
      sql: `SELECT * FROM user_achievements WHERE user_address = ? AND achievement_id = ?`,
      args: [userAddress, achievementIdStr]
    })
    return result.rows.length > 0
  } catch (error) {
    console.error('Error checking achievement status:', error)
    return false
  }
}

// Sync achievement data from contract to database
export async function syncAchievementsFromContract(contractAchievements: any[]) {
  try {
    for (const achievement of contractAchievements) {
      // Check if achievement exists in database
      const existing = await client.execute({
        sql: `SELECT id FROM achievements WHERE id = ?`,
        args: [achievement.id]
      })

      const rarityMap = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic']

      if (existing.rows.length > 0) {
        // Update existing achievement - only update contract-controlled fields
        const updateFields = []
        const updateArgs = []

        // Always update price
        updateFields.push('price = ?')
        updateArgs.push(achievement.price)

        // Update name/description/emoji only if provided (not empty)
        if (achievement.name && achievement.name.trim()) {
          updateFields.push('name = ?')
          updateArgs.push(achievement.name)
        }
        if (achievement.description && achievement.description.trim()) {
          updateFields.push('description = ?')
          updateArgs.push(achievement.description)
        }
        if (achievement.emoji && achievement.emoji.trim()) {
          updateFields.push('emoji = ?')
          updateArgs.push(achievement.emoji)
        }

        // Always update rarity
        updateFields.push('rarity = ?')
        updateArgs.push(rarityMap[achievement.rarity] || 'Common')

        updateArgs.push(achievement.id)

        await client.execute({
          sql: `UPDATE achievements SET ${updateFields.join(', ')} WHERE id = ?`,
          args: updateArgs
        })
      } else {
        // Insert new achievement - use defaults for missing fields
        const name = achievement.name || `Achievement ${achievement.id}`
        const description = achievement.description || `Achievement ${achievement.id} description`
        const emoji = achievement.emoji || '🏆'

        await client.execute({
          sql: `INSERT INTO achievements (id, name, description, requirement, emoji, rarity, category, price) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            achievement.id,
            name,
            description,
            description, // Use description as requirement
            emoji,
            rarityMap[achievement.rarity] || 'Common',
            'achievement', // category
            achievement.price
          ]
        })
      }
    }
    console.log('✅ Achievement data synced to database')
  } catch (error) {
    console.error('Error syncing achievements:', error)
    throw error
  }
}

// Sync achievement prices from contract to database
export async function syncAchievementPricesFromContract(contractPrices: Record<string, string>) {
  try {
    for (const [achievementId, price] of Object.entries(contractPrices)) {
      await client.execute({
        sql: `UPDATE achievements SET price = ? WHERE id = ?`,
        args: [price, achievementId]
      })
    }
    console.log('✅ Achievement prices synced to database')
  } catch (error) {
    console.error('Error syncing achievement prices:', error)
    throw error
  }
}

// Get achievement price from database
export async function getAchievementPrice(achievementId: number): Promise<string | null> {
  try {
    const result = await client.execute({
      sql: `SELECT price FROM achievements WHERE id = ?`,
      args: [achievementId]
    })
    return result.rows.length > 0 ? result.rows[0].price as string : null
  } catch (error) {
    console.error('Database unavailable for price lookup, falling back to contract:', error)
    // Fallback to contract data
    return await getAchievementPriceFromContract(achievementId)
  }
}

// Scoring system constants
const SCORING_SYSTEM = {
  MATCH3_WIN: 100,
  MATCH3_GAME: 50,
  MATCH3_LEVEL_COMPLETE: 150, // Per level completed
  CARD_WIN: 150,
  CARD_GAME: 30,
  DAILY_CLAIM: 80,
  STREAK_DAY: 20,
  MINTED_ACHIEVEMENT: 20,
  UNLOCKED_ACHIEVEMENT: 10,
  TOKEN_HOLDER_BONUS: 500 // For holding 5M+ of Joybit or adrijan tokens
}

// Token contract addresses
const TOKEN_ADDRESSES = {
  JOYBIT: '0x3DDfe21080b8852496414535DA65AC2C3005f5DE', // Joybit token
  ADRIJAN: '0xf348930442f3afB04F1f1bbE473C5F57De7b26eb'  // adrijan token
}

// Calculate comprehensive score for a user
export async function calculateUserScore(userAddress: string): Promise<number> {
  try {
    const stats = await getUserStats(userAddress)
    let totalScore = 0

    // Match-3 scoring
    totalScore += stats.match3_games_won * SCORING_SYSTEM.MATCH3_WIN
    totalScore += stats.match3_games_played * SCORING_SYSTEM.MATCH3_GAME
    totalScore += stats.match3_high_score_level * SCORING_SYSTEM.MATCH3_LEVEL_COMPLETE // Level completion bonus

    // Card game scoring
    totalScore += stats.card_games_won * SCORING_SYSTEM.CARD_WIN
    totalScore += stats.card_games_played * SCORING_SYSTEM.CARD_GAME

    // Daily claim scoring - ensure daily_total_claims is a reasonable number
    // If it's a huge number (wei value), convert it or use 0
    const dailyClaims = stats.daily_total_claims > 1000 ? 0 : stats.daily_total_claims
    totalScore += dailyClaims * SCORING_SYSTEM.DAILY_CLAIM
    totalScore += stats.daily_current_streak * SCORING_SYSTEM.STREAK_DAY

    // Achievement scoring
    const userAchievements = await client.execute({
      sql: 'SELECT COUNT(*) as unlocked_count FROM user_achievements WHERE LOWER(user_address) = LOWER(?)',
      args: [userAddress]
    })
    const unlockedCount = userAchievements.rows[0]?.unlocked_count as number || 0
    totalScore += unlockedCount * SCORING_SYSTEM.UNLOCKED_ACHIEVEMENT

    const mintedAchievements = await client.execute({
      sql: 'SELECT COUNT(*) as minted_count FROM user_achievements WHERE LOWER(user_address) = LOWER(?) AND minted = TRUE',
      args: [userAddress]
    })
    const mintedCount = mintedAchievements.rows[0]?.minted_count as number || 0
    totalScore += mintedCount * SCORING_SYSTEM.MINTED_ACHIEVEMENT

    // Token holder bonuses
    const tokenBonuses = await calculateTokenHolderBonuses(userAddress)
    totalScore += tokenBonuses

    return totalScore
  } catch (error) {
    console.error('Error calculating user score:', error)
    return 0
  }
}

// Check if user holds minimum token amounts for bonuses
export async function calculateTokenHolderBonuses(userAddress: string): Promise<number> {
  let bonuses = 0

  try {
    // Check Joybit token holdings
    const joybitBalance = await checkTokenBalance(userAddress, TOKEN_ADDRESSES.JOYBIT)
    if (joybitBalance >= 5000000) { // 5M tokens
      bonuses += SCORING_SYSTEM.TOKEN_HOLDER_BONUS
      console.log(`✅ ${userAddress} qualifies for Joybit token bonus (+${SCORING_SYSTEM.TOKEN_HOLDER_BONUS})`)
    }

    // Check adrijan token holdings
    const adrijanBalance = await checkTokenBalance(userAddress, TOKEN_ADDRESSES.ADRIJAN)
    if (adrijanBalance >= 5000000) { // 5M tokens
      bonuses += SCORING_SYSTEM.TOKEN_HOLDER_BONUS
      console.log(`✅ ${userAddress} qualifies for adrijan token bonus (+${SCORING_SYSTEM.TOKEN_HOLDER_BONUS})`)
    }

  } catch (error) {
    console.error('Error checking token holdings:', error)
  }

  return bonuses
}

// Check token balance using ethers
async function checkTokenBalance(userAddress: string, tokenAddress: string): Promise<number> {
  try {
    const { ethers } = await import('ethers')

    // Use Alchemy RPC
    const rpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
      ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
      : 'https://mainnet.base.org'

    const provider = new ethers.JsonRpcProvider(rpcUrl)

    // ERC20 ABI for balanceOf
    const erc20Abi = [
      "function balanceOf(address owner) view returns (uint256)",
      "function decimals() view returns (uint8)"
    ]

    const contract = new ethers.Contract(tokenAddress, erc20Abi, provider)

    // Get balance and decimals
    const [balance, decimals] = await Promise.all([
      contract.balanceOf(userAddress),
      contract.decimals()
    ])

    // Convert to readable number
    const readableBalance = Number(ethers.formatUnits(balance, decimals))
    console.log(`Token balance for ${userAddress} (${tokenAddress}): ${readableBalance}`)

    return readableBalance
  } catch (error) {
    console.error(`Error checking token balance for ${tokenAddress}:`, error)
    return 0
  }
}

// Update user score in leaderboard
export async function updateUserScore(userAddress: string): Promise<number> {
  try {
    const totalScore = await calculateUserScore(userAddress)

    await client.execute({
      sql: 'INSERT OR REPLACE INTO leaderboard_scores (address, score) VALUES (?, ?)',
      args: [userAddress, totalScore]
    })

    console.log(`✅ Updated score for ${userAddress}: ${totalScore}`)
    return totalScore
  } catch (error) {
    console.error('Error updating user score:', error)
    return 0
  }
}

// Award points for specific actions
export async function awardPoints(userAddress: string, action: keyof typeof SCORING_SYSTEM, multiplier: number = 1): Promise<number> {
  try {
    const points = SCORING_SYSTEM[action] * multiplier

    const currentScoreResult = await client.execute({
      sql: 'SELECT score FROM leaderboard_scores WHERE address = ?',
      args: [userAddress]
    })
    const currentScore = currentScoreResult.rows.length > 0 ? currentScoreResult.rows[0].score as number : 0
    const newScore = currentScore + points

    await client.execute({
      sql: 'INSERT OR REPLACE INTO leaderboard_scores (address, score) VALUES (?, ?)',
      args: [userAddress, newScore]
    })

    console.log(`✅ Awarded ${points} points for ${action} to ${userAddress}`)
    return newScore
  } catch (error) {
    console.error('Error awarding points:', error)
    return 0
  }
}

// Fallback function to get achievement price from contract
async function getAchievementPriceFromContract(achievementId: number): Promise<string | null> {
  try {
    const contractAddress = process.env.NEXT_PUBLIC_ACHIEVEMENT_ERC1155_ADDRESS
    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      return null
    }

    // Import here to avoid circular dependencies
    const { ACHIEVEMENT_ERC1155_ABI } = await import('@/lib/contracts/abis')

    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org')
    const contract = new ethers.Contract(contractAddress, ACHIEVEMENT_ERC1155_ABI, provider)

    const result = await contract.getAchievement(Number(achievementId))
    const [rarity, priceWei, active] = result

    if (!active) return null

    return ethers.formatEther(priceWei)
  } catch (error) {
    console.error('Error getting achievement price from contract:', error)
    return null
  }
}

export { client, convertBigInts }