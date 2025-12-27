import { uploadMultipleAchievements, uploadAchievementImage } from '../lib/nft-storage'
import * as fs from 'fs'
import * as path from 'path'

interface Achievement {
  id: string
  name: string
  description: string
  rarity: string
  emoji: string
  category: string
  color: string
}

/**
 * Load achievements from the metadata file
 */
function loadAchievements(): Achievement[] {
  const metadataPath = path.join(__dirname, '..', 'public', 'achievement-metadata.json')

  if (!fs.existsSync(metadataPath)) {
    throw new Error('Achievement metadata file not found. Please run generate-achievement-cards.ts first.')
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
  return metadata
}

/**
 * Load existing upload results to continue from where we left off
 */
function loadExistingResults(): Array<{ id: string; metadataUrl: string; imageUrl?: string }> {
  const resultsPath = path.join(__dirname, '..', 'public', 'achievement-upload-results.json')

  if (fs.existsSync(resultsPath)) {
    try {
      return JSON.parse(fs.readFileSync(resultsPath, 'utf-8'))
    } catch (error) {
      console.warn('⚠️  Could not parse existing results file, starting fresh')
      return []
    }
  }

  return []
}

/**
 * Upload all achievement images and metadata to Pinata
 */
async function uploadAchievementsToPinata() {
  console.log('🚀 Starting achievement upload to Pinata...\n')

  try {
    // Load achievements
    const allAchievements = loadAchievements()
    console.log(`📊 Found ${allAchievements.length} achievements to upload`)

    // Load existing results
    const existingResults = loadExistingResults()
    const uploadedIds = new Set(existingResults.filter(r => r.imageUrl).map(r => r.id))
    console.log(`📊 Found ${existingResults.length} achievements with metadata, ${uploadedIds.size} with images`)

    // Filter out achievements that don't have images uploaded
    const achievementsToUpload = allAchievements.filter(achievement => !uploadedIds.has(achievement.id))
    console.log(`📤 Need to upload images for ${achievementsToUpload.length} remaining achievements`)

    if (achievementsToUpload.length === 0) {
      console.log('✅ All achievements already uploaded!')
      return
    }

    // First upload all images
    console.log('\n🖼️ Uploading achievement images...')
    const imageUploadPromises = achievementsToUpload.map(async (achievement) => {
      try {
        const imagePath = path.join(__dirname, '..', 'public', 'achievement-badges', `${achievement.id}.png`)

        if (!fs.existsSync(imagePath)) {
          console.warn(`⚠️  Image not found: ${imagePath}`)
          return { id: achievement.id, imageUrl: null }
        }

        // Read image file as buffer
        const imageBuffer = fs.readFileSync(imagePath)

        const imageUrl = await uploadAchievementImage(imageBuffer, `${achievement.id}.png`)
        return { id: achievement.id, imageUrl }
      } catch (error) {
        console.error(`❌ Failed to upload image for ${achievement.id}:`, error)
        return { id: achievement.id, imageUrl: null }
      }
    })

    const imageResults = await Promise.all(imageUploadPromises)
    const imageMap = new Map(imageResults.map(r => [r.id, r.imageUrl]))

    console.log(`✅ Uploaded ${imageResults.filter(r => r.imageUrl).length} images`)

    // Prepare achievements for metadata upload with actual image URLs
    const achievementsWithImages = achievementsToUpload.map(achievement => ({
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      rarity: achievement.rarity,
      emoji: achievement.emoji,
      category: achievement.category,
      imageUrl: imageMap.get(achievement.id) || undefined,
    }))

    // Upload remaining metadata
    console.log('\n📤 Uploading achievement metadata...')
    const newUploadResults = await uploadMultipleAchievements(achievementsWithImages)

    // Combine with existing results
    const allResults = [...existingResults, ...newUploadResults]

    console.log('\n✅ Upload complete!')
    console.log(`📊 Total uploaded achievements: ${allResults.length}/${allAchievements.length}`)

    // Save upload results
    const resultsPath = path.join(__dirname, '..', 'public', 'achievement-upload-results.json')
    fs.writeFileSync(resultsPath, JSON.stringify(allResults, null, 2))
    console.log(`💾 Upload results saved to: ${resultsPath}`)

    // Display results
    console.log('\n📋 Upload Results:')
    allResults.forEach((result: any) => {
      console.log(`  ${result.id}:`)
      console.log(`    📄 Metadata: ${result.metadataUrl}`)
      if (result.imageUrl) {
        console.log(`    🖼️  Image: ${result.imageUrl}`)
      }
    })

    console.log('\n🎉 Achievement upload to Pinata completed successfully!')
    console.log('📝 Next step: Update your NFT contract with these metadata URLs')

  } catch (error) {
    console.error('❌ Failed to upload achievements:', error)
    process.exit(1)
  }
}

// Run the upload script
uploadAchievementsToPinata()