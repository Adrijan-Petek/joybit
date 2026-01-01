const { ethers } = require('ethers')
const readline = require('readline')
require('dotenv').config({ path: '.env.local' })

// Contract ABI - only the functions we need
const ACHIEVEMENT_ABI = [
  {
    "inputs": [
      {"internalType": "uint256", "name": "id", "type": "uint256"},
      {"internalType": "uint8", "name": "rarity", "type": "uint8"},
      {"internalType": "uint256", "name": "price", "type": "uint256"}
    ],
    "name": "addAchievement",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "id", "type": "uint256"}],
    "name": "getAchievement",
    "outputs": [
      {"internalType": "uint8", "name": "rarity", "type": "uint8"},
      {"internalType": "uint240", "name": "price", "type": "uint240"},
      {"internalType": "bool", "name": "active", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

// Achievement definitions from database
const achievements = [
  // Match3 Achievements (IDs 1-20)
  { id: 1, rarity: 0, price: '0.000034' }, // Common - Already exists
  { id: 2, rarity: 1, price: '0.0001' },   // Rare - Already exists
  { id: 3, rarity: 2, price: '0.0005' },   // Epic - Already exists
  { id: 4, rarity: 3, price: '0.0001' },   // Legendary - Already exists
  { id: 5, rarity: 4, price: '0.002' },    // Mythic
  { id: 6, rarity: 0, price: '0.000034' }, // Common
  { id: 7, rarity: 1, price: '0.0001' },   // Rare
  { id: 8, rarity: 2, price: '0.0005' },   // Epic
  { id: 9, rarity: 3, price: '0.001' },    // Legendary
  { id: 10, rarity: 4, price: '0.002' },   // Mythic
  { id: 11, rarity: 0, price: '0.000034' }, // Common
  { id: 12, rarity: 1, price: '0.0001' },   // Rare
  { id: 13, rarity: 2, price: '0.0005' },   // Epic
  { id: 14, rarity: 3, price: '0.001' },    // Legendary
  { id: 15, rarity: 4, price: '0.002' },    // Mythic
  { id: 16, rarity: 0, price: '0.000034' }, // Common
  { id: 17, rarity: 1, price: '0.0001' },   // Rare
  { id: 18, rarity: 2, price: '0.0005' },   // Epic
  { id: 19, rarity: 3, price: '0.001' },    // Legendary
  { id: 20, rarity: 4, price: '0.002' },    // Mythic
  
  // Daily Claim Achievements (IDs 21-25)
  { id: 21, rarity: 0, price: '0.000034' }, // Common
  { id: 22, rarity: 1, price: '0.0001' },   // Rare
  { id: 23, rarity: 2, price: '0.0005' },   // Epic
  { id: 24, rarity: 3, price: '0.001' },    // Legendary
  { id: 25, rarity: 4, price: '0.002' },    // Mythic
  
  // Card Game Achievements (IDs 26-35)
  { id: 26, rarity: 0, price: '0.000034' }, // Common
  { id: 27, rarity: 1, price: '0.0001' },   // Rare
  { id: 28, rarity: 2, price: '0.0005' },   // Epic
  { id: 29, rarity: 3, price: '0.001' },    // Legendary
  { id: 30, rarity: 4, price: '0.002' },    // Mythic
  { id: 31, rarity: 0, price: '0.000034' }, // Common
  { id: 32, rarity: 1, price: '0.0001' },   // Rare
  { id: 33, rarity: 2, price: '0.0005' },   // Epic
  { id: 34, rarity: 3, price: '0.001' },    // Legendary
  { id: 35, rarity: 4, price: '0.002' },    // Mythic
  
  // General Achievements (IDs 36-40)
  { id: 36, rarity: 0, price: '0.000034' }, // Common
  { id: 37, rarity: 1, price: '0.0001' },   // Rare
  { id: 38, rarity: 2, price: '0.0005' },   // Epic
  { id: 39, rarity: 3, price: '0.001' },    // Legendary
  { id: 40, rarity: 4, price: '0.002' }     // Mythic
]

async function main() {
  const contractAddress = process.env.NEXT_PUBLIC_ACHIEVEMENT_ERC1155_ADDRESS
  const privateKey = process.env.PRIVATE_KEY

  if (!contractAddress) {
    console.error('❌ NEXT_PUBLIC_ACHIEVEMENT_ERC1155_ADDRESS not set in .env.local')
    process.exit(1)
  }

  if (!privateKey) {
    console.error('❌ PRIVATE_KEY not set in .env.local')
    console.log('⚠️  You need to set your private key to add achievements')
    process.exit(1)
  }

  console.log('🚀 Adding achievements to contract...')
  console.log('📝 Contract:', contractAddress)

  const provider = new ethers.JsonRpcProvider('https://mainnet.base.org')
  const wallet = new ethers.Wallet(privateKey, provider)
  const contract = new ethers.Contract(contractAddress, ACHIEVEMENT_ABI, wallet)

  console.log('💰 Wallet:', wallet.address)
  const balance = await provider.getBalance(wallet.address)
  console.log('💵 Balance:', ethers.formatEther(balance), 'ETH')

  // First, check which achievements already exist
  console.log('\n📊 Checking existing achievements...')
  const existingAchievements = []
  const missingAchievements = []

  for (const achievement of achievements) {
    try {
      const [rarity, price, active] = await contract.getAchievement(achievement.id)
      console.log(`✅ Achievement ${achievement.id} exists: Rarity=${rarity}, Price=${ethers.formatEther(price)} ETH, Active=${active}`)
      existingAchievements.push(achievement.id)
    } catch (error) {
      console.log(`⚠️  Achievement ${achievement.id} missing`)
      missingAchievements.push(achievement)
    }
  }

  if (missingAchievements.length === 0) {
    console.log('\n✅ All achievements already exist in the contract!')
    return
  }

  console.log(`\n📝 Found ${missingAchievements.length} achievements to add`)
  console.log('Missing IDs:', missingAchievements.map(a => a.id).join(', '))

  // Ask for confirmation
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const answer = await new Promise(resolve => {
    rl.question(`\n⚠️  This will add ${missingAchievements.length} achievements. Each transaction costs gas. Continue? (yes/no): `, resolve)
  })
  rl.close()

  if (answer.toLowerCase() !== 'yes') {
    console.log('❌ Cancelled')
    return
  }

  // Add missing achievements one by one
  console.log('\n🚀 Adding achievements to contract...')
  let successCount = 0
  let failCount = 0

  for (const achievement of missingAchievements) {
    try {
      console.log(`\n📤 Adding achievement ${achievement.id}...`)
      console.log(`   Rarity: ${achievement.rarity}, Price: ${achievement.price} ETH`)
      
      const priceInWei = ethers.parseEther(achievement.price)
      const tx = await contract.addAchievement(
        achievement.id,
        achievement.rarity,
        priceInWei,
        {
          gasLimit: 150000n
        }
      )
      
      console.log(`   TX Hash: ${tx.hash}`)
      console.log('   ⏳ Waiting for confirmation...')
      
      const receipt = await tx.wait()
      console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`)
      successCount++
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (error) {
      console.error(`   ❌ Failed to add achievement ${achievement.id}:`, error.message)
      failCount++
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`   ✅ Successfully added: ${successCount}`)
  console.log(`   ❌ Failed: ${failCount}`)
  console.log(`   📝 Total in contract: ${existingAchievements.length + successCount}/40`)

  if (successCount > 0) {
    console.log('\n✅ Achievements added successfully!')
    console.log('🔄 Please sync the admin panel to see updated data')
  }
}

main().catch(console.error)
