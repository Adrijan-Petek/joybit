require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@libsql/client');
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrateAchievements() {
  try {
    console.log('🗑️ Clearing old achievement data...');

    // Clear old data
    await client.execute('DELETE FROM user_achievements');
    await client.execute('DELETE FROM achievements');

    console.log('✅ Old data cleared');

    // Insert new achievements with numeric IDs
    const achievements = [
      // Match3 Achievements (IDs 1-20)
      { id: 1, name: 'First Win', description: 'Win your first Match-3 game', requirement: 'Win 1 game', emoji: '🎯', rarity: 'Common', category: 'match3', price: '0.000034' },
      { id: 2, name: 'Hot Streak', description: 'Win 5 games in a row', requirement: '5 consecutive wins', emoji: '🔥', rarity: 'Rare', category: 'match3', price: '0.0001' },
      { id: 3, name: 'Gem Master', description: 'Collect 1000 gems', requirement: '1000 total gems', emoji: '💎', rarity: 'Epic', category: 'match3', price: '0.0005' },
      { id: 4, name: 'Star Player', description: 'Reach level 10', requirement: 'Level 10', emoji: '🌟', rarity: 'Legendary', category: 'match3', price: '0.0001' },
      { id: 5, name: 'Speed Demon', description: 'Complete a level in under 30 seconds', requirement: 'Fast completion', emoji: '⚡', rarity: 'Mythic', category: 'match3', price: '0.0005' },
      { id: 6, name: 'Combo King', description: 'Achieve a 10x combo', requirement: '10x combo', emoji: '🎪', rarity: 'Common', category: 'match3', price: '0.000034' },
      { id: 7, name: 'Champion', description: 'Win 50 games', requirement: '50 wins', emoji: '🏆', rarity: 'Rare', category: 'match3', price: '0.0001' },
      { id: 8, name: 'Artist', description: 'Create beautiful patterns', requirement: 'Special patterns', emoji: '🎨', rarity: 'Epic', category: 'match3', price: '0.0005' },
      { id: 9, name: 'Rainbow', description: 'Match all colors in one move', requirement: 'Rainbow match', emoji: '🌈', rarity: 'Legendary', category: 'match3', price: '0.0001' },
      { id: 10, name: 'Heart Breaker', description: 'Break 10,000 hearts', requirement: '10,000 hearts', emoji: '💖', rarity: 'Mythic', category: 'match3', price: '0.0005' },
      { id: 11, name: 'Royal', description: 'Reach the top of the leaderboard', requirement: '#1 position', emoji: '👑', rarity: 'Common', category: 'match3', price: '0.000034' },
      { id: 12, name: 'Mystic', description: 'Unlock all power-ups', requirement: 'All power-ups', emoji: '🔮', rarity: 'Rare', category: 'match3', price: '0.0001' },
      { id: 13, name: 'Lucky', description: 'Win with lucky bonuses', requirement: 'Lucky wins', emoji: '🍀', rarity: 'Epic', category: 'match3', price: '0.0005' },
      { id: 14, name: 'Inferno', description: 'Create massive chain reactions', requirement: 'Chain reactions', emoji: '🔥', rarity: 'Legendary', category: 'match3', price: '0.0001' },
      { id: 15, name: 'Frost', description: 'Freeze time perfectly', requirement: 'Perfect freeze', emoji: '❄️', rarity: 'Mythic', category: 'match3', price: '0.0005' },
      { id: 16, name: 'Thespian', description: 'Master all game modes', requirement: 'All modes', emoji: '🎭', rarity: 'Common', category: 'match3', price: '0.000034' },
      { id: 17, name: 'Unicorn', description: 'Achieve the impossible', requirement: 'Impossible feat', emoji: '🦄', rarity: 'Rare', category: 'match3', price: '0.0001' },
      { id: 18, name: 'Summit', description: 'Reach the highest peaks', requirement: 'Peak performance', emoji: '🏔️', rarity: 'Epic', category: 'match3', price: '0.0005' },
      { id: 19, name: 'Tempest', description: 'Control the storm', requirement: 'Storm mastery', emoji: '🌪️', rarity: 'Legendary', category: 'match3', price: '0.0001' },
      { id: 20, name: 'Phantom', description: 'Become untouchable', requirement: 'Phantom moves', emoji: '💀', rarity: 'Mythic', category: 'match3', price: '0.0005' },

      // Daily Claim Achievements (IDs 21-25)
      { id: 21, name: 'Daily Starter', description: 'Claim your first daily reward', requirement: '1 daily claim', emoji: '📅', rarity: 'Common', category: 'daily', price: '0.000034' },
      { id: 22, name: 'Streak Master', description: 'Maintain a 7-day claim streak', requirement: '7 consecutive days', emoji: '🔥', rarity: 'Rare', category: 'daily', price: '0.0001' },
      { id: 23, name: 'Dedicated Player', description: 'Claim rewards for 14 days', requirement: '14 total claims', emoji: '💪', rarity: 'Epic', category: 'daily', price: '0.0005' },
      { id: 24, name: 'Loyal Supporter', description: 'Claim rewards for 30 days', requirement: '30 total claims', emoji: '👑', rarity: 'Legendary', category: 'daily', price: '0.0001' },
      { id: 25, name: 'Eternal Claimant', description: 'Claim rewards for 90 days', requirement: '90 total claims', emoji: '♾️', rarity: 'Mythic', category: 'daily', price: '0.0005' },

      // Card Game Achievements (IDs 26-35)
      { id: 26, name: 'Card Novice', description: 'Play your first card game', requirement: '1 game played', emoji: '🃏', rarity: 'Common', category: 'card', price: '0.000034' },
      { id: 27, name: 'Card Winner', description: 'Win your first card game', requirement: '1 game won', emoji: '🎯', rarity: 'Rare', category: 'card', price: '0.0001' },
      { id: 28, name: 'Card Expert', description: 'Win 10 card games', requirement: '10 wins', emoji: '🎪', rarity: 'Epic', category: 'card', price: '0.0005' },
      { id: 29, name: 'Card Master', description: 'Win 25 card games', requirement: '25 wins', emoji: '🏆', rarity: 'Legendary', category: 'card', price: '0.0001' },
      { id: 30, name: 'Card God', description: 'Win 100 card games', requirement: '100 wins', emoji: '⚡', rarity: 'Mythic', category: 'card', price: '0.0005' },
      { id: 31, name: 'Card Legend', description: 'Win 50 card games', requirement: '50 wins', emoji: '👑', rarity: 'Common', category: 'card', price: '0.000034' },
      { id: 32, name: 'Card Addict', description: 'Play 200 card games', requirement: '200 games played', emoji: '🎰', rarity: 'Rare', category: 'card', price: '0.0001' },
      { id: 33, name: 'Card Collector', description: 'Collect all card types', requirement: 'All types', emoji: '🃏', rarity: 'Epic', category: 'card', price: '0.0005' },
      { id: 34, name: 'Card Strategist', description: 'Win with strategy', requirement: 'Strategic wins', emoji: '🧠', rarity: 'Legendary', category: 'card', price: '0.0001' },
      { id: 35, name: 'Card Champion', description: 'Win 500 card games', requirement: '500 wins', emoji: '🏅', rarity: 'Mythic', category: 'card', price: '0.0005' },

      // General Achievements (IDs 36-40)
      { id: 36, name: 'Well Rounded', description: 'Play all game types', requirement: '1 game in each type', emoji: '🎭', rarity: 'Common', category: 'general', price: '0.000034' },
      { id: 37, name: 'High Scorer', description: 'Reach a high score of 1000', requirement: '1000 points', emoji: '📊', rarity: 'Rare', category: 'general', price: '0.0001' },
      { id: 38, name: 'Level Climber', description: 'Reach level 5 in Match-3', requirement: 'Level 5', emoji: '🗻', rarity: 'Epic', category: 'general', price: '0.0005' },
      { id: 39, name: 'Perfectionist', description: 'Achieve perfect scores', requirement: 'Perfect games', emoji: '💎', rarity: 'Legendary', category: 'general', price: '0.0001' },
      { id: 40, name: 'Marathon Player', description: 'Play for 24 hours total', requirement: '24 hours gameplay', emoji: '🏃', rarity: 'Mythic', category: 'general', price: '0.0005' }
    ];

    console.log('📝 Inserting new achievements...');
    for (const achievement of achievements) {
      await client.execute({
        sql: `INSERT INTO achievements (id, name, description, requirement, emoji, rarity, category, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [achievement.id, achievement.name, achievement.description, achievement.requirement, achievement.emoji, achievement.rarity, achievement.category, achievement.price]
      });
    }

    console.log('✅ Migration complete! Database now uses numeric achievement IDs matching the contract.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

migrateAchievements();