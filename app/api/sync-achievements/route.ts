import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { ACHIEVEMENT_ERC1155_ABI } from '@/lib/contracts/abis'
import { syncAchievementsFromContract } from '@/lib/db/achievements'

export async function POST(request: NextRequest) {
  try {
    // Contract address
    const contractAddress = process.env.NEXT_PUBLIC_ACHIEVEMENT_ERC1155_ADDRESS
    if (!contractAddress) {
      return NextResponse.json({ error: 'Contract address not configured' }, { status: 500 })
    }

    // Connect to contract using read-only provider
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org')
    const contract = new ethers.Contract(contractAddress, ACHIEVEMENT_ERC1155_ABI, provider)

    // Get achievement count from contract
    const achievementCount = await contract.getAchievementCount()
    console.log('Achievement count from contract:', Number(achievementCount))

    // Create array of IDs from 1 to achievementCount
    const allIds = Array.from({ length: Number(achievementCount) }, (_, i) => BigInt(i + 1))
    console.log('Achievement IDs to sync:', allIds)

    // Fetch full achievement data for all achievements
    const contractAchievements: any[] = []

    for (const achievementId of allIds) {
      try {
        const result = await contract.getAchievement(achievementId)
        const [rarity, price, active] = result

        // Get base metadata URI and construct full URL
        const baseURI = await contract.baseMetadataURI()
        const metadataUrl = `${baseURI}${achievementId}.json`

        // Convert uint256 ID to string for database
        const stringId = String(achievementId)

        contractAchievements.push({
          id: stringId,
          name: '', // Will be filled from metadata or database
          description: '', // Will be filled from metadata or database
          rarity: Number(rarity),
          emoji: '', // Will be filled from metadata or database
          metadataUrl,
          price: ethers.formatEther(price),
          active
        })
      } catch (error) {
        console.error(`Failed to get achievement data for ${achievementId}:`, error instanceof Error ? error.message : String(error))
        // Skip achievements that don't exist in contract
        continue
      }
    }

    // Sync to database
    await syncAchievementsFromContract(contractAchievements)

    return NextResponse.json({
      success: true,
      synced: contractAchievements.length,
      achievements: contractAchievements
    })

  } catch (error) {
    console.error('Error syncing achievements:', error)
    return NextResponse.json({ error: 'Failed to sync achievements' }, { status: 500 })
  }
}