import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { ACHIEVEMENT_ERC1155_ABI } from '@/lib/contracts/abis'
import { syncAchievementPricesFromContract } from '@/lib/db/achievements'

export async function POST(request: NextRequest) {
  try {
    // Contract address
    const contractAddress = process.env.NEXT_PUBLIC_ACHIEVEMENT_ERC1155_ADDRESS
    if (!contractAddress) {
      return NextResponse.json({ error: 'Contract address not configured' }, { status: 500 })
    }

    // Connect to contract
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org')
    const contract = new ethers.Contract(contractAddress, ACHIEVEMENT_ERC1155_ABI, provider)

    // Get achievement count from contract
    const achievementCount = await contract.getAchievementCount()
    console.log('Achievement count from contract:', Number(achievementCount))

    // Create array of IDs from 1 to achievementCount
    const allIds = Array.from({ length: Number(achievementCount) }, (_, i) => BigInt(i + 1))
    console.log('Achievement IDs to sync prices for:', allIds)

    // Fetch prices for all achievements
    const contractPrices: Record<string, string> = {}

    for (const achievementId of allIds) {
      try {
        const result = await contract.getAchievement(achievementId)
        const [, price] = result
        contractPrices[String(achievementId)] = ethers.formatEther(price)
      } catch (error) {
        console.error(`Failed to get price for ${achievementId}:`, error instanceof Error ? error.message : String(error))
        // Skip achievements that don't exist in contract
        continue
      }
    }

    // Sync to database
    await syncAchievementPricesFromContract(contractPrices)

    return NextResponse.json({
      success: true,
      synced: Object.keys(contractPrices).length,
      prices: contractPrices
    })

  } catch (error) {
    console.error('Error syncing achievement prices:', error)
    return NextResponse.json({ error: 'Failed to sync prices' }, { status: 500 })
  }
}