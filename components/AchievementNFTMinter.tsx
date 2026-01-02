'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { ethers } from 'ethers'
import { ACHIEVEMENT_ERC1155_ABI as AchievementABI } from '@/lib/contracts/abis'
const AchievementNFTABI = require('@/lib/contracts/extracted-abis/AchievementERC1155.json')
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

// AchievementERC1155 contract ABI imported from extracted ABIs
const ACHIEVEMENT_ERC1155_ABI = AchievementNFTABI

export default function AchievementNFTMinter({ achievement, hasAchievement, onMintSuccess }: AchievementNFTMinterProps) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [isMinted, setIsMinted] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [contractData, setContractData] = useState<{rarity: number, active: boolean, price: string} | null>(null)
  const [isLoadingContractData, setIsLoadingContractData] = useState(true)
  const [price, setPrice] = useState<string>('Loading...')

  // Contract address - this should come from environment or deployment config
  const contractAddress = process.env.NEXT_PUBLIC_ACHIEVEMENT_ERC1155_ADDRESS || '0x0000000000000000000000000000000000000000'

  // Load contract data on mount - check if already provided in achievement prop
  useEffect(() => {
    const loadPrice = async () => {
      console.log('🔄 Loading price for achievement:', achievement.id)
      
      // Check if achievement already has contract data (from profile page)
      if (achievement.exists !== undefined && achievement.price && achievement.price !== '0') {
        console.log('✅ Using pre-loaded contract data from achievement:', {
          exists: achievement.exists,
          active: achievement.active,
          price: achievement.price
        })
        setPrice(achievement.price)
        setContractData({
          rarity: 0, // Not used if we have price
          active: achievement.active || false,
          price: achievement.price
        })
        setIsLoadingContractData(false)
        return
      }
      
      // Otherwise fetch from database or contract
      try {
        // First try to get price from database
        console.log('📡 Fetching price from database...')
        const dbResponse = await fetch(`/api/achievements?action=price&id=${achievement.id}`)
        if (dbResponse.ok) {
          const dbData = await dbResponse.json()
          if (dbData.price) {
            console.log('✅ Price from database:', dbData.price)
            setPrice(dbData.price)
            setIsLoadingContractData(false)
            return
          } else {
            console.log('⚠️ No price in database, trying contract...')
          }
        } else {
          console.log('❌ Database request failed:', dbResponse.status)
        }
      } catch (error) {
        console.error('❌ Error fetching price from database:', error)
      }

      // Fallback to contract if database doesn't have price
      await loadContractData()
    }

    const loadContractData = async () => {
      console.log('🔗 Loading contract data from blockchain...')
      if (contractAddress === '0x0000000000000000000000000000000000000000') {
        console.log('⚠️ Contract address not set, using default price')
        setPrice('0.0001')
        setIsLoadingContractData(false)
        return
      }

      try {
        setIsLoadingContractData(true)
        
        // Use appropriate RPC based on chain ID
        const rpcUrl = chainId === 84532 
          ? 'https://sepolia.base.org'  // Base Sepolia
          : 'https://mainnet.base.org' // Base Mainnet
        console.log('🌐 Using RPC:', rpcUrl)
        
        const provider = new ethers.JsonRpcProvider(rpcUrl)
        
        const contract = new ethers.Contract(contractAddress, ACHIEVEMENT_ERC1155_ABI, provider)
        
        console.log('📞 Calling contract.getAchievement()...')
        const result = await contract.getAchievement(Number(achievement.id))
        const [rarity, priceWei, active] = result
        const formattedPrice = ethers.formatEther(priceWei)

        console.log('✅ Contract data:', { rarity: Number(rarity), active, price: formattedPrice })

        setContractData({
          rarity: Number(rarity),
          active: active,
          price: formattedPrice
        })
        
        // Set price immediately
        setPrice(formattedPrice)
      } catch (error) {
        console.error('❌ Achievement not in contract or error loading:', error)
        // Achievement doesn't exist in contract yet - set as not available for minting
        setContractData({
          rarity: 0,
          active: false,
          price: '0'
        })
        setPrice('Not Available')
      } finally {
        setIsLoadingContractData(false)
      }
    }

    loadPrice()
  }, [achievement.id, contractAddress])

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
        // Use appropriate RPC based on chain ID
        const rpcUrl = chainId === 84532 
          ? 'https://sepolia.base.org'  // Base Sepolia
          : 'https://mainnet.base.org' // Base Mainnet
        
        const provider = new ethers.JsonRpcProvider(rpcUrl)
        const contract = new ethers.Contract(contractAddress, ACHIEVEMENT_ERC1155_ABI, provider)
        
        console.log('📞 Calling contract.balanceOf()...')
        const balance = await contract.balanceOf(address, Number(achievement.id))
        const minted = balance > 0
        setIsMinted(minted)
      } catch (error) {
        console.log('⚠️ Achievement not mintable yet (not in contract)')
        setIsMinted(false)
        console.error('Error checking mint status:', error)
      } finally {
        setIsChecking(false)
      }
    }

    checkMintedStatus()
  }, [address, achievement.id, hasAchievement, isConnected, contractAddress])

  // Handle successful transaction
  useEffect(() => {
    if (isSuccess && hash) {
      console.log('✅ Transaction successful! Hash:', hash)
      // Mark achievement as minted in database
      const markMinted = async () => {
        try {
          console.log('📝 Marking achievement as minted in database...')
          await fetch('/api/achievements', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'mint_achievement',
              userAddress: address,
              achievementId: achievement.id,
              transactionHash: hash
            })
          })
          console.log('✅ Achievement marked as minted in database')
        } catch (error) {
          console.error('❌ Failed to mark achievement as minted:', error)
        }
      }
      
      markMinted()
      setIsMinted(true)
      toast.success(`🎉 ${achievement.name} NFT minted successfully!`)
      onMintSuccess?.()
    }
  }, [isSuccess, hash, address, achievement.id, achievement.name, onMintSuccess])

  const handleMint = () => {
    console.log('🎯 Starting mint process for:', achievement.id)
    console.log('Network check - chainId:', chainId, 'isSupported:', isOnSupportedNetwork)
    console.log('Contract address:', contractAddress)
    
    if (contractAddress === '0x0000000000000000000000000000000000000000') {
      console.log('❌ Contract address not set')
      toast.error('Contract address not configured')
      return
    }
    
    if (!isOnSupportedNetwork) {
      console.log('❌ Not on supported network')
      toast.error('Please switch to Base network to mint NFTs')
      return
    }

    console.log('Contract data:', contractData)
    console.log('Price:', price)
    console.log('Write contract available:', !!writeContract)
    
    if (!writeContract || !contractData || price === 'Loading...') {
      console.log('❌ Missing required data for minting')
      toast.error('Unable to prepare minting transaction')
      return
    }

    if (!contractData.active) {
      console.log('❌ Achievement not active')
      toast.error('This achievement is not available for minting')
      return
    }

    const priceInWei = ethers.parseEther(price)
    console.log('Price in wei:', priceInWei.toString())
    console.log('Contract address:', contractAddress)

    console.log('🚀 Calling writeContract...')
    writeContract({
      address: contractAddress as `0x${string}`,
      abi: ACHIEVEMENT_ERC1155_ABI,
      functionName: 'mintAchievement',
      args: [Number(achievement.id)], // Convert string ID to number for uint256
      value: priceInWei,
      gas: 150000n, // Fixed gas limit to prevent over-estimation
    })
  }

  const isLoading = isWriteLoading || isTxLoading || isChecking || isLoadingContractData
  const isOnSupportedNetwork = chainId === 8453 || chainId === 84532 // Base mainnet or Base Sepolia
  const canMint = isConnected && hasAchievement && !isMinted && !isLoading && contractData?.active && isOnSupportedNetwork && price !== 'Loading...' && price !== 'Not Available'

  const isActive = contractData?.active ?? true

  return (
    <div className="mt-3 p-2 bg-white rounded-lg border shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{achievement.emoji}</span>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{achievement.name}</h3>
            <p className="text-xs text-gray-600">{achievement.description}</p>
          </div>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${RARITY_COLORS[achievement.rarity as keyof typeof RARITY_COLORS]}`}>
          {achievement.rarity}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-600">
          <span className="font-medium">Price: {price === 'Not Available' ? 'N/A' : price + ' ETH'}</span>
          {price === 'Loading...' && <span className="ml-2 animate-pulse">⏳</span>}
          {!isActive && <span className="text-red-500 ml-2">(Disabled)</span>}
          {price === 'Not Available' && <span className="text-orange-500 ml-2">(Not in contract)</span>}
        </div>

        <div className="flex items-center gap-2">
          {isMinted ? (
            <div className="flex items-center gap-2 text-green-600">
              <span className="text-xs font-medium">✅ NFT Minted</span>
            </div>
          ) : hasAchievement ? (
            !isConnected ? (
              <span className="text-xs text-red-500">Connect wallet to mint</span>
            ) : !isOnSupportedNetwork ? (
              <span className="text-xs text-red-500">Please switch to Base network</span>
            ) : price === 'Not Available' ? (
              <span className="text-xs text-orange-500">⚠️ Not mintable yet</span>
            ) : !contractData?.active ? (
              <span className="text-xs text-red-500">Achievement not available</span>
            ) : price === 'Loading...' ? (
              <span className="text-xs text-gray-500">Loading price...</span>
            ) : isActive ? (
              <button
                onClick={handleMint}
                disabled={!canMint}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  canMint
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isLoading ? 'Processing...' : `Mint (${price} ETH)`}
              </button>
            ) : (
              <span className="text-xs text-red-500">Achievement disabled</span>
            )
          ) : (
            <span className="text-xs text-gray-500">Achievement not unlocked</span>
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