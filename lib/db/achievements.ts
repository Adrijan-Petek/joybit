import { createClient } from '@libsql/client'
import { ethers } from 'ethers'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

// Achievement type definition
export interface Achievement {
  id: string
  name: string
  description: string
  requirement: string
  emoji: string
  rarity: string
  category: string
  price?: string
  created_at?: string
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

      // Insert all achievements
      const achievements = [
        // Match3 Achievements
        { id: 'first_win', name: 'First Win', description: 'Win your first Match-3 game', requirement: 'Win 1 game', emoji: '🎯', rarity: 'Common', category: 'match3' },
        { id: 'hot_streak', name: 'Hot Streak', description: 'Win 5 games in a row', requirement: '5 consecutive wins', emoji: '🔥', rarity: 'Rare', category: 'match3' },
        { id: 'gem_master', name: 'Gem Master', description: 'Collect 1000 gems', requirement: '1000 total gems', emoji: '💎', rarity: 'Epic', category: 'match3' },
        { id: 'star_player', name: 'Star Player', description: 'Reach level 10', requirement: 'Level 10', emoji: '🌟', rarity: 'Rare', category: 'match3' },
        { id: 'speed_demon', name: 'Speed Demon', description: 'Complete a level in under 30 seconds', requirement: 'Fast completion', emoji: '⚡', rarity: 'Epic', category: 'match3' },
        { id: 'combo_king', name: 'Combo King', description: 'Achieve a 10x combo', requirement: '10x combo', emoji: '🎪', rarity: 'Legendary', category: 'match3' },
        { id: 'champion', name: 'Champion', description: 'Win 50 games', requirement: '50 wins', emoji: '🏆', rarity: 'Legendary', category: 'match3' },
        { id: 'artist', name: 'Artist', description: 'Create beautiful patterns', requirement: 'Special patterns', emoji: '🎨', rarity: 'Rare', category: 'match3' },
        { id: 'rainbow', name: 'Rainbow', description: 'Match all colors in one move', requirement: 'Rainbow match', emoji: '🌈', rarity: 'Epic', category: 'match3' },
        { id: 'heart_breaker', name: 'Heart Breaker', description: 'Break 10,000 hearts', requirement: '10,000 hearts', emoji: '💖', rarity: 'Rare', category: 'match3' },
        { id: 'royal', name: 'Royal', description: 'Reach the top of the leaderboard', requirement: '#1 position', emoji: '👑', rarity: 'Legendary', category: 'match3' },
        { id: 'mystic', name: 'Mystic', description: 'Unlock all power-ups', requirement: 'All power-ups', emoji: '🔮', rarity: 'Epic', category: 'match3' },
        { id: 'lucky', name: 'Lucky', description: 'Win with lucky bonuses', requirement: 'Lucky wins', emoji: '🍀', rarity: 'Rare', category: 'match3' },
        { id: 'inferno', name: 'Inferno', description: 'Create massive chain reactions', requirement: 'Chain reactions', emoji: '🔥', rarity: 'Epic', category: 'match3' },
        { id: 'frost', name: 'Frost', description: 'Freeze time perfectly', requirement: 'Perfect freeze', emoji: '❄️', rarity: 'Rare', category: 'match3' },
        { id: 'thespian', name: 'Thespian', description: 'Master all game modes', requirement: 'All modes', emoji: '🎭', rarity: 'Legendary', category: 'match3' },
        { id: 'unicorn', name: 'Unicorn', description: 'Achieve the impossible', requirement: 'Impossible feat', emoji: '🦄', rarity: 'Mythic', category: 'match3' },
        { id: 'summit', name: 'Summit', description: 'Reach the highest peaks', requirement: 'Peak performance', emoji: '🏔️', rarity: 'Epic', category: 'match3' },
        { id: 'tempest', name: 'Tempest', description: 'Control the storm', requirement: 'Storm mastery', emoji: '🌪️', rarity: 'Legendary', category: 'match3' },
        { id: 'phantom', name: 'Phantom', description: 'Become untouchable', requirement: 'Phantom moves', emoji: '💀', rarity: 'Mythic', category: 'match3' },

        // Daily Claim Achievements
        { id: 'daily_starter', name: 'Daily Starter', description: 'Claim your first daily reward', requirement: '1 daily claim', emoji: '📅', rarity: 'Common', category: 'daily' },
        { id: 'streak_master', name: 'Streak Master', description: 'Maintain a 7-day claim streak', requirement: '7 consecutive days', emoji: '🔥', rarity: 'Rare', category: 'daily' },
        { id: 'dedicated_player', name: 'Dedicated Player', description: 'Claim rewards for 14 days', requirement: '14 total claims', emoji: '💪', rarity: 'Epic', category: 'daily' },
        { id: 'loyal_supporter', name: 'Loyal Supporter', description: 'Claim rewards for 30 days', requirement: '30 total claims', emoji: '👑', rarity: 'Legendary', category: 'daily' },
        { id: 'eternal_claimant', name: 'Eternal Claimant', description: 'Claim rewards for 90 days', requirement: '90 total claims', emoji: '♾️', rarity: 'Mythic', category: 'daily' },

        // Card Game Achievements
        { id: 'card_novice', name: 'Card Novice', description: 'Play your first card game', requirement: '1 game played', emoji: '🃏', rarity: 'Common', category: 'card' },
        { id: 'card_winner', name: 'Card Winner', description: 'Win your first card game', requirement: '1 game won', emoji: '🎯', rarity: 'Common', category: 'card' },
        { id: 'card_expert', name: 'Card Expert', description: 'Win 10 card games', requirement: '10 wins', emoji: '🎪', rarity: 'Rare', category: 'card' },
        { id: 'card_master', name: 'Card Master', description: 'Win 25 card games', requirement: '25 wins', emoji: '🏆', rarity: 'Epic', category: 'card' },
        { id: 'card_legend', name: 'Card Legend', description: 'Win 50 card games', requirement: '50 wins', emoji: '👑', rarity: 'Legendary', category: 'card' },
        { id: 'card_god', name: 'Card God', description: 'Win 100 card games', requirement: '100 wins', emoji: '⚡', rarity: 'Mythic', category: 'card' },
        { id: 'card_addict', name: 'Card Addict', description: 'Play 200 card games', requirement: '200 games played', emoji: '🎰', rarity: 'Epic', category: 'card' },

        // General Achievements
        { id: 'well_rounded', name: 'Well Rounded', description: 'Play all game types', requirement: '1 game in each type', emoji: '🎭', rarity: 'Rare', category: 'general' },
        { id: 'high_scorer', name: 'High Scorer', description: 'Reach a high score of 1000', requirement: '1000 points', emoji: '📊', rarity: 'Rare', category: 'general' },
        { id: 'level_climber', name: 'Level Climber', description: 'Reach level 5 in Match-3', requirement: 'Level 5', emoji: '🗻', rarity: 'Rare', category: 'general' },
        { id: 'consistent_player', name: 'Consistent Player', description: 'Play games for 7 days', requirement: '7 days active', emoji: '📅', rarity: 'Rare', category: 'general' },
        { id: 'early_adopter', name: 'Early Adopter', description: 'Join during beta phase', requirement: 'Beta participant', emoji: '🚀', rarity: 'Epic', category: 'general' },
        { id: 'social_butterfly', name: 'Social Butterfly', description: 'Share your achievements', requirement: 'Share 5 times', emoji: '🦋', rarity: 'Rare', category: 'general' },
        { id: 'perfectionist', name: 'Perfectionist', description: 'Achieve perfect scores', requirement: 'Perfect games', emoji: '💎', rarity: 'Legendary', category: 'general' },
        { id: 'marathon_player', name: 'Marathon Player', description: 'Play for 24 hours total', requirement: '24 hours gameplay', emoji: '🏃', rarity: 'Epic', category: 'general' }
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

  } catch (error) {
    console.error('❌ Error initializing achievement tables:', error)
    throw error
  }
}

// Get user stats
export async function getUserStats(userAddress: string) {
  try {
    const result = await client.execute({
      sql: `SELECT * FROM user_stats WHERE user_address = ?`,
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

// Update user stats
export async function updateUserStats(userAddress: string, stats: Partial<any>) {
  try {
    const fields = Object.keys(stats)
    const values = Object.values(stats)

    if (fields.length === 0) return

    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const sql = `UPDATE user_stats SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE user_address = ?`

    await client.execute({
      sql,
      args: [...values, userAddress]
    })
  } catch (error) {
    console.error('Error updating user stats:', error)
    throw error
  }
}

// Get user achievements
export async function getUserAchievements(userAddress: string) {
  try {
    const result = await client.execute({
      sql: `
        SELECT ua.*, a.name, a.description, a.requirement, a.emoji, a.rarity, a.category
        FROM user_achievements ua
        JOIN achievements a ON ua.achievement_id = a.id
        WHERE ua.user_address = ?
        ORDER BY ua.unlocked_at DESC
      `,
      args: [userAddress]
    })

    return convertBigInts(result.rows)
  } catch (error) {
    console.error('Error getting user achievements:', error)
    throw error
  }
}

// Unlock achievement
export async function unlockAchievement(userAddress: string, achievementId: string) {
  try {
    // Check if already unlocked
    const existing = await client.execute({
      sql: `SELECT * FROM user_achievements WHERE user_address = ? AND achievement_id = ?`,
      args: [userAddress, achievementId]
    })

    if (existing.rows.length > 0) {
      return false // Already unlocked
    }

    // Unlock achievement
    await client.execute({
      sql: `INSERT INTO user_achievements (user_address, achievement_id) VALUES (?, ?)`,
      args: [userAddress, achievementId]
    })

    // Award leaderboard points for unlocking achievement
    try {
      const unlockPoints = 10 // Points for unlocking achievement
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
export async function markAchievementMinted(userAddress: string, achievementId: string, transactionHash: string) {
  try {
    await client.execute({
      sql: `UPDATE user_achievements SET minted = TRUE, minted_at = CURRENT_TIMESTAMP, transaction_hash = ? WHERE user_address = ? AND achievement_id = ?`,
      args: [transactionHash, userAddress, achievementId]
    })

    // Award leaderboard points for minting achievement
    try {
      const mintPoints = 20 // Points for minting achievement
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
  } catch (error) {
    console.error('Error marking achievement as minted:', error)
    throw error
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

    // Match3 achievements
    if (stats.match3_games_played > 0 && !(await isAchievementUnlocked(userAddress, 'first_win'))) {
      await unlockAchievement(userAddress, 'first_win')
      unlockedAchievements.push('first_win')
    }

    if (stats.match3_win_streak >= 5 && !(await isAchievementUnlocked(userAddress, 'hot_streak'))) {
      await unlockAchievement(userAddress, 'hot_streak')
      unlockedAchievements.push('hot_streak')
    }

    if (stats.match3_total_gems >= 1000 && !(await isAchievementUnlocked(userAddress, 'gem_master'))) {
      await unlockAchievement(userAddress, 'gem_master')
      unlockedAchievements.push('gem_master')
    }

    if (stats.match3_high_score_level >= 10 && !(await isAchievementUnlocked(userAddress, 'star_player'))) {
      await unlockAchievement(userAddress, 'star_player')
      unlockedAchievements.push('star_player')
    }

    if (stats.match3_best_time < 30 && !(await isAchievementUnlocked(userAddress, 'speed_demon'))) {
      await unlockAchievement(userAddress, 'speed_demon')
      unlockedAchievements.push('speed_demon')
    }

    if (stats.match3_max_combo >= 10 && !(await isAchievementUnlocked(userAddress, 'combo_king'))) {
      await unlockAchievement(userAddress, 'combo_king')
      unlockedAchievements.push('combo_king')
    }

    if (stats.match3_games_won >= 50 && !(await isAchievementUnlocked(userAddress, 'champion'))) {
      await unlockAchievement(userAddress, 'champion')
      unlockedAchievements.push('champion')
    }

    // Daily claim achievements
    if (stats.daily_total_claims > 0 && !(await isAchievementUnlocked(userAddress, 'daily_starter'))) {
      await unlockAchievement(userAddress, 'daily_starter')
      unlockedAchievements.push('daily_starter')
    }

    if (stats.daily_current_streak >= 7 && !(await isAchievementUnlocked(userAddress, 'streak_master'))) {
      await unlockAchievement(userAddress, 'streak_master')
      unlockedAchievements.push('streak_master')
    }

    if (stats.daily_total_claims >= 14 && !(await isAchievementUnlocked(userAddress, 'dedicated_player'))) {
      await unlockAchievement(userAddress, 'dedicated_player')
      unlockedAchievements.push('dedicated_player')
    }

    if (stats.daily_total_claims >= 30 && !(await isAchievementUnlocked(userAddress, 'loyal_supporter'))) {
      await unlockAchievement(userAddress, 'loyal_supporter')
      unlockedAchievements.push('loyal_supporter')
    }

    if (stats.daily_total_claims >= 90 && !(await isAchievementUnlocked(userAddress, 'eternal_claimant'))) {
      await unlockAchievement(userAddress, 'eternal_claimant')
      unlockedAchievements.push('eternal_claimant')
    }

    // Card game achievements
    if (stats.card_games_played > 0 && !(await isAchievementUnlocked(userAddress, 'card_novice'))) {
      await unlockAchievement(userAddress, 'card_novice')
      unlockedAchievements.push('card_novice')
    }

    if (stats.card_games_won > 0 && !(await isAchievementUnlocked(userAddress, 'card_winner'))) {
      await unlockAchievement(userAddress, 'card_winner')
      unlockedAchievements.push('card_winner')
    }

    if (stats.card_games_won >= 10 && !(await isAchievementUnlocked(userAddress, 'card_expert'))) {
      await unlockAchievement(userAddress, 'card_expert')
      unlockedAchievements.push('card_expert')
    }

    if (stats.card_games_won >= 25 && !(await isAchievementUnlocked(userAddress, 'card_master'))) {
      await unlockAchievement(userAddress, 'card_master')
      unlockedAchievements.push('card_master')
    }

    if (stats.card_games_won >= 50 && !(await isAchievementUnlocked(userAddress, 'card_legend'))) {
      await unlockAchievement(userAddress, 'card_legend')
      unlockedAchievements.push('card_legend')
    }

    if (stats.card_games_won >= 100 && !(await isAchievementUnlocked(userAddress, 'card_god'))) {
      await unlockAchievement(userAddress, 'card_god')
      unlockedAchievements.push('card_god')
    }

    if (stats.card_games_played >= 200 && !(await isAchievementUnlocked(userAddress, 'card_addict'))) {
      await unlockAchievement(userAddress, 'card_addict')
      unlockedAchievements.push('card_addict')
    }

    // General achievements
    const hasPlayedAllGames = stats.match3_games_played > 0 && stats.card_games_played > 0 && stats.daily_total_claims > 0
    if (hasPlayedAllGames && !(await isAchievementUnlocked(userAddress, 'well_rounded'))) {
      await unlockAchievement(userAddress, 'well_rounded')
      unlockedAchievements.push('well_rounded')
    }

    if (stats.match3_high_score >= 1000 && !(await isAchievementUnlocked(userAddress, 'high_scorer'))) {
      await unlockAchievement(userAddress, 'high_scorer')
      unlockedAchievements.push('high_scorer')
    }

    if (stats.match3_high_score_level >= 5 && !(await isAchievementUnlocked(userAddress, 'level_climber'))) {
      await unlockAchievement(userAddress, 'level_climber')
      unlockedAchievements.push('level_climber')
    }

    return unlockedAchievements
  } catch (error) {
    console.error('Error checking achievements:', error)
    throw error
  }
}

// Helper function to check if achievement is unlocked
async function isAchievementUnlocked(userAddress: string, achievementId: string): Promise<boolean> {
  try {
    const result = await client.execute({
      sql: `SELECT * FROM user_achievements WHERE user_address = ? AND achievement_id = ?`,
      args: [userAddress, achievementId]
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
        updateArgs.push(ethers.formatEther(achievement.price))

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
            ethers.formatEther(achievement.price)
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
export async function getAchievementPrice(achievementId: string): Promise<string | null> {
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

// Fallback function to get achievement price from contract
async function getAchievementPriceFromContract(achievementId: string): Promise<string | null> {
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