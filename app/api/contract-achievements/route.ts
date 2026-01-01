import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'

const AchievementABI = require('@/lib/contracts/extracted-abis/AchievementERC1155.json')

export async function GET(request: NextRequest) {
  try {
    const contractAddress = process.env.NEXT_PUBLIC_ACHIEVEMENT_ERC1155_ADDRESS
    if (!contractAddress) {
      return NextResponse.json({ error: 'Contract address not configured' }, { status: 500 })
    }

    console.log('Fetching from contract:', contractAddress)

    // Use Alchemy RPC if available, otherwise use public RPC
    const rpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY 
      ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
      : 'https://mainnet.base.org'
    
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const contract = new ethers.Contract(contractAddress, AchievementABI, provider)

    // Get all achievement IDs
    const achievementIds = await contract.getAllAchievementIds()
    const ids = achievementIds.map((id: any) => Number(id))
    console.log('Total IDs in contract:', ids.length)

    if (ids.length === 0) {
      return NextResponse.json({ achievements: [] })
    }

    // Fetch achievements one at a time with retries
    const contractAchievements: any[] = []
    
    for (const id of ids) {
      let retries = 3
      while (retries > 0) {
        try {
          // Use direct mapping access - returns (rarity, active, price)
          const result = await contract.achievements(id)
          
          const achievement = {
            id: String(id),
            contractId: id,
            rarity: Number(result[0]),
            price: ethers.formatEther(result[2]), // price is index 2
            rawPrice: result[2].toString(),
            active: result[1], // active is index 1
            exists: true
          }
          
          contractAchievements.push(achievement)
          break // Success, exit retry loop
          
        } catch (error: any) {
          retries--
          if (retries === 0) {
            console.error(`Failed ID ${id} after 3 retries`)
          } else {
            await new Promise(resolve => setTimeout(resolve, 300))
          }
        }
      }
      
      // Small delay between IDs
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log(`Successfully loaded ${contractAchievements.length}/${ids.length} achievements`)
    
    return NextResponse.json({
      achievements: contractAchievements
    })
  } catch (error) {
    console.error('Failed to fetch contract achievements:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch contract data', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}
