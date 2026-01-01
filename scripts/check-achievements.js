const { ethers } = require('ethers')
const ACHIEVEMENT_ABI = require('../lib/contracts/extracted-abis/AchievementERC1155.json')
require('dotenv').config({ path: '.env.local' })

async function main() {
  const contractAddress = process.env.NEXT_PUBLIC_ACHIEVEMENT_ERC1155_ADDRESS
  if (!contractAddress) {
    throw new Error('NEXT_PUBLIC_ACHIEVEMENT_ERC1155_ADDRESS not set in .env.local')
  }
  
  const provider = new ethers.JsonRpcProvider('https://mainnet.base.org')
  const contract = new ethers.Contract(
    contractAddress,
    ACHIEVEMENT_ABI,
    provider
  )
  
  console.log(`Checking achievements in contract: ${contractAddress}`)
  console.log(`BaseScan: https://basescan.org/address/${contractAddress}#readContract`)

  console.log(`Checking achievements in contract: ${contractAddress}`)
  console.log(`BaseScan: https://basescan.org/address/${contractAddress}#readContract`)
  
  console.log('Checking achievements in contract...')
  
  try {
    const count = await contract.getAchievementCount()
    console.log(`Total achievements: ${count}`)
    
    for (let i = 1; i <= Number(count); i++) {
      try {
        const [rarity, price, active] = await contract.getAchievement(i)
        console.log(`Achievement ${i}: Rarity=${rarity}, Price=${ethers.formatEther(price)} ETH, Active=${active}`)
      } catch (error) {
        console.log(`Achievement ${i}: ERROR - ${error.message}`)
      }
    }
  } catch (error) {
    console.error('Error:', error.message)
  }
}

main()
