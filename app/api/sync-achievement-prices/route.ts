import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { ACHIEVEMENT_N_F_T_ABI } from '@/lib/contracts/abis'
import { syncAchievementPricesFromContract } from '@/lib/db/achievements'

export async function POST(request: NextRequest) {
  try {
    // Contract address
    const contractAddress = process.env.NEXT_PUBLIC_ACHIEVEMENT_NFT_ADDRESS
    if (!contractAddress) {
      return NextResponse.json({ error: 'Contract address not configured' }, { status: 500 })
    }

    // Connect to contract
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org')
    const contract = new ethers.Contract(contractAddress, ACHIEVEMENT_N_F_T_ABI, provider)

    // Get all achievement IDs from contract
    const allIds = await contract.getAllAchievementIds()

    // Fetch prices for all achievements
    const contractPrices: Record<string, string> = {}

    for (const achievementId of allIds) {
      try {
        const result = await contract.achievements(achievementId)
        const [, , price] = result
        contractPrices[achievementId] = ethers.formatEther(price)
      } catch (error) {
        console.error(`Failed to get price for ${achievementId}:`, error)
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