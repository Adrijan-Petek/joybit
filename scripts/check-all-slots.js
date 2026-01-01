const { ethers } = require('ethers')
require('dotenv').config({ path: '.env.local' })

const ACHIEVEMENT_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "name": "achievements",
    "outputs": [
      {"internalType": "uint8", "name": "rarity", "type": "uint8"},
      {"internalType": "bool", "name": "active", "type": "bool"},
      {"internalType": "uint240", "name": "price", "type": "uint240"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

async function main() {
  const contractAddress = process.env.NEXT_PUBLIC_ACHIEVEMENT_ERC1155_ADDRESS
  const provider = new ethers.JsonRpcProvider('https://mainnet.base.org')
  const contract = new ethers.Contract(contractAddress, ACHIEVEMENT_ABI, provider)

  console.log('Checking raw contract storage for all 40 achievements...\n')

  for (let i = 1; i <= 40; i++) {
    try {
      const [rarity, active, price] = await contract.achievements(i)
      if (price > 0 || active) {
        console.log(`ID ${i}: ✅ EXISTS - Rarity=${rarity}, Active=${active}, Price=${ethers.formatEther(price)} ETH`)
      } else {
        console.log(`ID ${i}: ❌ EMPTY SLOT - Rarity=${rarity}, Active=${active}, Price=${ethers.formatEther(price)} ETH`)
      }
    } catch (error) {
      console.log(`ID ${i}: ⚠️  ERROR - ${error.message}`)
    }
  }
}

main().catch(console.error)
