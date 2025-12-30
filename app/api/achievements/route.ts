import { NextRequest, NextResponse } from 'next/server'
import {
  initAchievementTables,
  getUserStats,
  updateUserStats,
  getUserAchievements,
  unlockAchievement,
  markAchievementMinted,
  getAllAchievements,
  checkAndUnlockAchievements,
  getAchievementPrice
} from '@/lib/db/achievements'

// Initialize tables on first request
let tablesInitialized = false

async function ensureTables() {
  if (!tablesInitialized) {
    await initAchievementTables()
    tablesInitialized = true
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureTables()

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const userAddress = searchParams.get('address')
    const achievementId = searchParams.get('id')

    if (action === 'all') {
      const allAchievements = await getAllAchievements()
      return NextResponse.json(allAchievements)
    }

    if (action === 'price' && achievementId) {
      const price = await getAchievementPrice(Number(achievementId))
      return NextResponse.json({ price })
    }

    if (!userAddress) {
      return NextResponse.json({ error: 'User address required' }, { status: 400 })
    }

    switch (action) {
      case 'stats':
        const stats = await getUserStats(userAddress)
        return NextResponse.json(stats)

      case 'achievements':
        const achievements = await getUserAchievements(userAddress)
        return NextResponse.json(achievements)

      case 'all':
        const allAchievements = await getAllAchievements()
        return NextResponse.json(allAchievements)

      case 'check':
        const unlocked = await checkAndUnlockAchievements(userAddress)
        return NextResponse.json({ unlocked })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Achievements API GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureTables()

    const body = await request.json()
    const { action, userAddress, stats, achievementId, transactionHash } = body

    if (!userAddress) {
      return NextResponse.json({ error: 'User address required' }, { status: 400 })
    }

    switch (action) {
      case 'update_stats':
        if (!stats) {
          return NextResponse.json({ error: 'Stats data required' }, { status: 400 })
        }
        await updateUserStats(userAddress, stats)

        // Check for new achievements after stats update
        const unlockedAchievements = await checkAndUnlockAchievements(userAddress)

        return NextResponse.json({
          success: true,
          unlockedAchievements
        })

      case 'unlock_achievement':
        if (!achievementId) {
          return NextResponse.json({ error: 'Achievement ID required' }, { status: 400 })
        }
        const newlyUnlocked = await unlockAchievement(userAddress, Number(achievementId))
        return NextResponse.json({
          success: true,
          newlyUnlocked
        })

      case 'mint_achievement':
        if (!achievementId || !transactionHash) {
          return NextResponse.json({ error: 'Achievement ID and transaction hash required' }, { status: 400 })
        }
        await markAchievementMinted(userAddress, achievementId, transactionHash)
        return NextResponse.json({ success: true })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Achievements API POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}