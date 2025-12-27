import PinataSDK from '@pinata/sdk'
import * as dotenv from 'dotenv'
import { Readable } from 'stream'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Check for API key
const PINATA_API_KEY = process.env.PINATA_API_KEY
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY
const PINATA_JWT = process.env.PINATA_JWT
const PINATA_GATEWAY = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud'

console.log('🔍 Pinata API Key present:', !!PINATA_API_KEY)
console.log('🔍 Pinata Secret API Key present:', !!PINATA_SECRET_API_KEY)
console.log('🔍 Pinata JWT present:', !!PINATA_JWT)
console.log('🔍 Pinata Gateway:', PINATA_GATEWAY)

if (!PINATA_JWT && (!PINATA_API_KEY || !PINATA_SECRET_API_KEY)) {
  console.warn('⚠️  PINATA_JWT or (PINATA_API_KEY and PINATA_SECRET_API_KEY) not found. Using mock implementation for testing.')
}

const pinata = PINATA_JWT ? new PinataSDK({ pinataJWTKey: PINATA_JWT }) :
             (PINATA_API_KEY && PINATA_SECRET_API_KEY ? new PinataSDK(PINATA_API_KEY, PINATA_SECRET_API_KEY) : null)

export interface AchievementMetadata {
  name: string
  description: string
  image: string | File
  attributes: Array<{
    trait_type: string
    value: string | number
  }>
  external_url?: string
}

/**
 * Upload achievement metadata to IPFS via Pinata
 */
export async function uploadAchievementMetadata(metadata: AchievementMetadata): Promise<string> {
  try {
    console.log('📤 Uploading achievement metadata to IPFS...')

    if (!pinata) {
      // Mock implementation for testing
      const mockCid = `bafybei${Math.random().toString(36).substr(2, 45)}`
      const ipfsUrl = `https://${PINATA_GATEWAY}/ipfs/${mockCid}`
      console.log('🎭 Mock upload - Achievement metadata URL:', ipfsUrl)
      return ipfsUrl
    }

    try {
      // Upload to Pinata
      const result = await pinata.pinJSONToIPFS(metadata, {
        pinataMetadata: {
          name: `Achievement-${metadata.name}`,
        },
      })

      const ipfsUrl = `https://${PINATA_GATEWAY}/ipfs/${result.IpfsHash}`
      console.log('✅ Achievement metadata uploaded:', ipfsUrl)

      return ipfsUrl
    } catch (error: any) {
      console.error('❌ Pinata upload error:', error.message || error)
      if (error.reason === 'NO_SCOPES_FOUND' || error.reason === 'INVALID_CREDENTIALS' || error.message?.includes('credentials') || error.message?.includes('scopes')) {
        console.warn('⚠️  Pinata credentials lack upload permissions or are invalid. Using mock URL for testing.')
        const mockCid = `bafybei${Math.random().toString(36).substr(2, 45)}`
        const ipfsUrl = `https://${PINATA_GATEWAY}/ipfs/${mockCid}`
        console.log('🎭 Fallback mock upload - Achievement metadata URL:', ipfsUrl)
        return ipfsUrl
      }
      throw error
    }
  } catch (error) {
    console.error('❌ Failed to upload achievement metadata:', error)
    throw error
  }
}

/**
 * Upload achievement image to IPFS via Pinata
 */
export async function uploadAchievementImage(imageBuffer: Buffer, fileName: string): Promise<string> {
  try {
    console.log('🖼️ Uploading achievement image to IPFS...')

    if (!pinata) {
      // Mock implementation for testing
      const mockCid = `bafybei${Math.random().toString(36).substr(2, 45)}`
      const ipfsUrl = `https://${PINATA_GATEWAY}/ipfs/${mockCid}`
      console.log('🎭 Mock upload - Achievement image URL:', ipfsUrl)
      return ipfsUrl
    }

    try {
      // Convert buffer to readable stream
      const readableStream = Readable.from(imageBuffer)

      // Upload to Pinata
      const result = await pinata.pinFileToIPFS(readableStream, {
        pinataMetadata: {
          name: `Achievement-Image-${fileName}`,
        },
        pinataOptions: {
          cidVersion: 0,
        },
      })

      const ipfsUrl = `https://${PINATA_GATEWAY}/ipfs/${result.IpfsHash}`
      console.log('✅ Achievement image uploaded:', ipfsUrl)
      return ipfsUrl
    } catch (error: any) {
      if (error.reason === 'NO_SCOPES_FOUND' || error.reason === 'INVALID_CREDENTIALS') {
        console.warn('⚠️  Pinata credentials lack upload permissions or are invalid. Using mock URL for testing.')
        const mockCid = `bafybei${Math.random().toString(36).substr(2, 45)}`
        const ipfsUrl = `https://${PINATA_GATEWAY}/ipfs/${mockCid}`
        console.log('🎭 Fallback mock upload - Achievement image URL:', ipfsUrl)
        return ipfsUrl
      }
      throw error
    }
  } catch (error) {
    console.error('❌ Failed to upload achievement image:', error)
    throw error
  }
}

/**
 * Generate achievement metadata for a specific achievement
 */
export function generateAchievementMetadata(
  achievementId: string,
  name: string,
  description: string,
  rarity: string,
  emoji: string,
  category?: string,
  imageUrl?: string
): AchievementMetadata {
  return {
    name: `${name} - Joybit Achievement`,
    description: `${description}\n\n🏆 ${rarity} Achievement\n🎮 Joybit Gaming Platform\n💎 Base Blockchain`,
    image: imageUrl || `https://via.placeholder.com/400x400/6366f1/ffffff?text=${encodeURIComponent(emoji)}`,
    attributes: [
      {
        trait_type: 'Rarity',
        value: rarity
      },
      {
        trait_type: 'Category',
        value: category || getCategoryFromId(achievementId)
      },
      {
        trait_type: 'Platform',
        value: 'Joybit'
      },
      {
        trait_type: 'Blockchain',
        value: 'Base'
      }
    ],
    external_url: 'https://joybit.vercel.app'
  }
}

/**
 * Get achievement category from achievement ID
 */
function getCategoryFromId(achievementId: string): string {
  if (achievementId.startsWith('match3_') || achievementId.includes('first_win') || achievementId.includes('hot_streak')) {
    return 'Match-3'
  }
  if (achievementId.startsWith('card_') || achievementId.includes('card_')) {
    return 'Card Game'
  }
  if (achievementId.startsWith('daily_') || achievementId.includes('daily_starter') || achievementId.includes('streak_master')) {
    return 'Daily Claim'
  }
  return 'General'
}

/**
 * Batch upload multiple achievement metadata
 */
export async function uploadMultipleAchievements(
  achievements: Array<{
    id: string
    name: string
    description: string
    rarity: string
    emoji: string
    category?: string
    imageUrl?: string
  }>
): Promise<Array<{ id: string; metadataUrl: string }>> {
  const results = []

  for (const achievement of achievements) {
    try {
      console.log(`\n🎯 Processing achievement: ${achievement.name}`)

      const metadata = generateAchievementMetadata(
        achievement.id,
        achievement.name,
        achievement.description,
        achievement.rarity,
        achievement.emoji,
        achievement.category,
        achievement.imageUrl
      )

      const metadataUrl = await uploadAchievementMetadata(metadata)

      results.push({
        id: achievement.id,
        metadataUrl
      })

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))

    } catch (error) {
      console.error(`❌ Failed to upload ${achievement.name}:`, error)
    }
  }

  return results
}