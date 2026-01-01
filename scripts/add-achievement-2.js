const hre = require('hardhat')
require('dotenv').config({ path: '.env.local' })

async function main() {
  const contractAddress = process.env.NEXT_PUBLIC_ACHIEVEMENT_ERC1155_ADDRESS
  const [signer] = await hre.ethers.getSigners()
  const contract = await hre.ethers.getContractAt('AchievementERC1155', contractAddress, signer)
  
  const achievement = {
    id: 2,
    name: "Early Bird",
    rarity: 0,
    price: "0.000034"
  }
  
  console.log(`Adding Achievement ${achievement.id}: ${achievement.name}`)
  console.log(`Rarity: ${achievement.rarity}, Price: ${achievement.price} ETH`)
  
  const priceWei = hre.ethers.parseEther(achievement.price)
  const tx = await contract.addAchievement(achievement.id, achievement.rarity, priceWei)
  
  console.log(`Transaction: ${tx.hash}`)
  await tx.wait()
  
  console.log(`✅ Successfully added Achievement 2!`)
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error)
  process.exit(1)
})
