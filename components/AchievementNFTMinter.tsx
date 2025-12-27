'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { ethers } from 'ethers'
import { ACHIEVEMENT_N_F_T_ABI } from '@/lib/contracts/abis'
import { toast } from 'react-hot-toast'
import { Achievement } from '@/lib/db/achievements'

interface AchievementNFTMinterProps {
  achievement: Achievement
  hasAchievement: boolean
  onMintSuccess?: () => void
}

const RARITY_COLORS = {
  Common: 'bg-gray-100 text-gray-800 border-gray-300',
  Rare: 'bg-blue-100 text-blue-800 border-blue-300',
  Epic: 'bg-purple-100 text-purple-800 border-purple-300',
  Legendary: 'bg-orange-100 text-orange-800 border-orange-300',
  Mythic: 'bg-red-100 text-red-800 border-red-300'
}

const RARITY_PRICES = {
  Common: '0.001',
  Rare: '0.005',
  Epic: '0.01',
  Legendary: '0.05',
  Mythic: '0.1'
}

// AchievementNFT contract ABI imported from extracted ABIs
const ACHIEVEMENT_NFT_ABI = ACHIEVEMENT_N_F_T_ABI

export default function AchievementNFTMinter({ achievement, hasAchievement, onMintSuccess }: AchievementNFTMinterProps) {
  const { address, isConnected } = useAccount()
  const [isMinted, setIsMinted] = useState(false)
  const [isChecking, setIsChecking] = useState(false)

  // Contract address - this should come from environment or deployment config
  const contractAddress = process.env.NEXT_PUBLIC_ACHIEVEMENT_NFT_ADDRESS || '0x0000000000000000000000000000000000000000'

  // Prepare contract write
  const { data: hash, writeContract, isPending: isWriteLoading } = useWriteContract()
  const { isLoading: isTxLoading, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Check if NFT is already minted
  useEffect(() => {
    const checkMintedStatus = async () => {
      if (!isConnected || !hasAchievement || contractAddress === '0x0000000000000000000000000000000000000000') {
        return
      }

      setIsChecking(true)
      try {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const contract = new ethers.Contract(contractAddress, ACHIEVEMENT_NFT_ABI, provider)
        const minted = await contract.hasAchievement(address, achievement.id)
        setIsMinted(minted)
      } catch (error) {
        console.error('Error checking mint status:', error)
      } finally {
        setIsChecking(false)
      }
    }

    checkMintedStatus()
  }, [address, achievement.id, hasAchievement, isConnected, contractAddress])

  // Handle successful transaction
  useEffect(() => {
    if (isSuccess) {
      setIsMinted(true)
      toast.success(`🎉 ${achievement.name} NFT minted successfully!`)
      onMintSuccess?.()
    }
  }, [isSuccess, achievement.name, onMintSuccess])

  const handleMint = () => {
    if (!writeContract) {
      toast.error('Unable to prepare minting transaction')
      return
    }

    writeContract({
      address: contractAddress as `0x${string}`,
      abi: ACHIEVEMENT_NFT_ABI,
      functionName: 'mintAchievement',
      args: [achievement.id],
      value: ethers.parseEther(RARITY_PRICES[achievement.rarity as keyof typeof RARITY_PRICES]),
    })
  }

  const isLoading = isWriteLoading || isTxLoading || isChecking
  const canMint = isConnected && hasAchievement && !isMinted && !isLoading
  const price = RARITY_PRICES[achievement.rarity as keyof typeof RARITY_PRICES]

  return (
    <div className="mt-4 p-4 bg-white rounded-lg border shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{achievement.emoji}</span>
          <div>
            <h3 className="font-semibold text-gray-900">{achievement.name}</h3>
            <p className="text-sm text-gray-600">{achievement.description}</p>
          </div>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${RARITY_COLORS[achievement.rarity as keyof typeof RARITY_COLORS]}`}>
          {achievement.rarity}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <span className="font-medium">Price: {price} ETH</span>
        </div>

        <div className="flex items-center gap-2">
          {isMinted ? (
            <div className="flex items-center gap-2 text-green-600">
              <span className="text-sm font-medium">✅ NFT Minted</span>
            </div>
          ) : hasAchievement ? (
            <button
              onClick={handleMint}
              disabled={!canMint}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                canMint
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Processing...' : 'Mint NFT'}
            </button>
          ) : (
            <span className="text-sm text-gray-500">Achievement not unlocked</span>
          )}
        </div>
      </div>

      {hash && (
        <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
          <p className="text-gray-600">Transaction: </p>
          <a
            href={`https://basescan.org/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 break-all"
          >
            {hash}
          </a>
        </div>
      )}
    </div>
  )
}