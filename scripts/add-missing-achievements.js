const hre = require('hardhat')
const { ethers } = require('ethers')
require('dotenv').config({ path: '.env.local' })

const achievements = [
  { id: 1, name: "First Steps", description: "Welcome to Joybit! Complete your first action.", emoji: "👋", rarity: 0, price: "0.000034" },
  { id: 2, name: "Early Bird", description: "Log in for the first time.", emoji: "🌅", rarity: 0, price: "0.000034" },
  { id: 3, name: "Game Explorer", description: "Try your first game.", emoji: "🎮", rarity: 0, price: "0.000034" },
  { id: 4, name: "Card Collector", description: "Play the card game for the first time.", emoji: "🃏", rarity: 0, price: "0.000034" },
  { id: 5, name: "Lucky Draw", description: "Win a card game round.", emoji: "🍀", rarity: 0, price: "0.000034" },
  { id: 6, name: "Match Master", description: "Play the match-3 game for the first time.", emoji: "💎", rarity: 0, price: "0.000034" },
  { id: 7, name: "Combo King", description: "Create a combo in match-3.", emoji: "⚡", rarity: 1, price: "0.0001" },
  { id: 8, name: "Daily Diligence", description: "Claim your daily reward.", emoji: "📅", rarity: 0, price: "0.000034" },
  { id: 9, name: "Streak Starter", description: "Maintain a 3-day login streak.", emoji: "🔥", rarity: 1, price: "0.0001" },
  { id: 10, name: "Dedicated Player", description: "Maintain a 7-day login streak.", emoji: "💪", rarity: 2, price: "0.0003" },
  { id: 11, name: "Unstoppable", description: "Maintain a 30-day login streak.", emoji: "🏆", rarity: 3, price: "0.0006" },
  { id: 12, name: "Legendary Streak", description: "Maintain a 100-day login streak.", emoji: "🌟", rarity: 4, price: "0.001" },
  { id: 13, name: "Token Holder", description: "Hold at least 100 JOY tokens.", emoji: "💰", rarity: 1, price: "0.0001" },
  { id: 14, name: "Whale Spotter", description: "Hold at least 1,000 JOY tokens.", emoji: "🐋", rarity: 2, price: "0.0003" },
  { id: 15, name: "Token Baron", description: "Hold at least 10,000 JOY tokens.", emoji: "👑", rarity: 3, price: "0.0006" },
  { id: 16, name: "Game Champion", description: "Win 10 games.", emoji: "🥇", rarity: 1, price: "0.0001" },
  { id: 17, name: "Victory Master", description: "Win 50 games.", emoji: "🎖️", rarity: 2, price: "0.0003" },
  { id: 18, name: "Undefeated Legend", description: "Win 100 games.", emoji: "🏅", rarity: 3, price: "0.0006" },
  { id: 19, name: "Perfect Play", description: "Achieve a perfect score in any game.", emoji: "💯", rarity: 2, price: "0.0003" },
  { id: 20, name: "Speed Demon", description: "Complete a game in under 60 seconds.", emoji: "⚡", rarity: 2, price: "0.0003" },
  { id: 21, name: "High Scorer", description: "Reach 10,000 points in total.", emoji: "📈", rarity: 1, price: "0.0001" },
  { id: 22, name: "Point Master", description: "Reach 100,000 points in total.", emoji: "💎", rarity: 3, price: "0.0006" },
  { id: 23, name: "Social Butterfly", description: "Share your achievement on social media.", emoji: "🦋", rarity: 0, price: "0.000034" },
  { id: 24, name: "Community Member", description: "Join the Joybit community.", emoji: "👥", rarity: 0, price: "0.000034" },
  { id: 25, name: "Friendly Invite", description: "Invite a friend to Joybit.", emoji: "✉️", rarity: 1, price: "0.0001" },
  { id: 26, name: "Influencer", description: "Invite 10 friends to Joybit.", emoji: "📢", rarity: 3, price: "0.0006" },
  { id: 27, name: "NFT Pioneer", description: "Purchase your first achievement NFT.", emoji: "🖼️", rarity: 1, price: "0.0001" },
  { id: 28, name: "Collection Started", description: "Own 5 achievement NFTs.", emoji: "🎨", rarity: 2, price: "0.0003" },
  { id: 29, name: "Collector", description: "Own 15 achievement NFTs.", emoji: "🏛️", rarity: 3, price: "0.0006" },
  { id: 30, name: "Master Collector", description: "Own all 40 achievement NFTs.", emoji: "👑", rarity: 4, price: "0.001" },
  { id: 31, name: "Beta Tester", description: "Participate in the beta testing phase.", emoji: "🧪", rarity: 2, price: "0.0003" },
  { id: 32, name: "Bug Hunter", description: "Report a bug that gets fixed.", emoji: "🐛", rarity: 2, price: "0.0003" },
  { id: 33, name: "Feature Suggester", description: "Suggest a feature that gets implemented.", emoji: "💡", rarity: 3, price: "0.0006" },
  { id: 34, name: "Early Adopter", description: "Join Joybit in its first month.", emoji: "🚀", rarity: 3, price: "0.0006" },
  { id: 35, name: "Loyal Player", description: "Play Joybit for 6 months.", emoji: "❤️", rarity: 3, price: "0.0006" },
  { id: 36, name: "Veteran", description: "Play Joybit for 1 year.", emoji: "🎂", rarity: 4, price: "0.001" },
  { id: 37, name: "Leaderboard Star", description: "Enter the top 100 leaderboard.", emoji: "⭐", rarity: 2, price: "0.0003" },
  { id: 38, name: "Top Player", description: "Enter the top 10 leaderboard.", emoji: "🌟", rarity: 3, price: "0.0006" },
  { id: 39, name: "Number One", description: "Reach #1 on the leaderboard.", emoji: "🥇", rarity: 4, price: "0.001" },
  { id: 40, name: "Joybit Legend", description: "Unlock all achievements and become a legend.", emoji: "🏆", rarity: 4, price: "0.001" }
]

async function main() {
  const contractAddress = process.env.NEXT_PUBLIC_ACHIEVEMENT_ERC1155_ADDRESS
  if (!contractAddress) {
    throw new Error('NEXT_PUBLIC_ACHIEVEMENT_ERC1155_ADDRESS not set in .env.local')
  }

  const [signer] = await hre.ethers.getSigners()
  const contract = await hre.ethers.getContractAt('AchievementERC1155', contractAddress, signer)
  
  console.log(`Adding achievements to: ${contractAddress}`)
  console.log(`Signer: ${signer.address}\n`)
  
  let successCount = 0
  let skipCount = 0
  let failCount = 0
  
  for (const achievement of achievements) {
    try {
      // Check if already exists
      try {
        const [rarity] = await contract.getAchievement(achievement.id)
        console.log(`✓ Achievement ${achievement.id} already exists (rarity: ${rarity})`)
        skipCount++
        continue
      } catch (e) {
        // Doesn't exist, add it
      }
      
      const priceWei = hre.ethers.parseEther(achievement.price)
      console.log(`Adding ${achievement.id}. ${achievement.name} (${achievement.emoji}) - Rarity: ${achievement.rarity}, Price: ${achievement.price} ETH`)
      
      const tx = await contract.addAchievement(achievement.id, achievement.rarity, priceWei, true)
      await tx.wait()
      
      console.log(`  ✅ Success - Hash: ${tx.hash}`)
      successCount++
      
      // Wait 2 seconds between transactions to avoid nonce issues
      await new Promise(resolve => setTimeout(resolve, 2000))
      
    } catch (error) {
      console.log(`  ❌ Failed: ${error.message.split('\n')[0]}`)
      failCount++
    }
  }
  
  console.log(`\n=== Summary ===`)
  console.log(`✅ Successfully added: ${successCount}`)
  console.log(`✓ Already existed: ${skipCount}`)
  console.log(`❌ Failed: ${failCount}`)
  console.log(`Total: ${successCount + skipCount + failCount}/40`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
