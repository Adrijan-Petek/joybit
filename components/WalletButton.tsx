'use client'

import { useAccount, useDisconnect, useConnect } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { sdk } from '@farcaster/miniapp-sdk'
import { useEffect, useState } from 'react'
import { Avatar } from '@coinbase/onchainkit/identity'

export function WalletButton() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { openConnectModal } = useConnectModal()
  const { connect, connectors } = useConnect()
  const [context, setContext] = useState<{ user?: { username?: string; fid?: number; pfpUrl?: string } } | null>(null)
  const [isInMiniApp, setIsInMiniApp] = useState(false)
  const [ready, setReady] = useState(false)
  const [basename, setBasename] = useState<string | null>(null)

  // Initialize SDK context and check if in MiniApp
  useEffect(() => {
    const init = async () => {
      try {
        const ctx = await sdk.context
        setContext(ctx)
        const inMiniApp = await sdk.isInMiniApp()
        setIsInMiniApp(inMiniApp)
        
        if (inMiniApp) {
          console.log('Running in Farcaster MiniApp context')
        }
      } catch (error) {
        console.log('Not in Farcaster MiniApp:', error)
        setIsInMiniApp(false)
      }
    }
    init()
  }, [])

  // Fetch Basename for external wallets
  useEffect(() => {
    if (!address || isInMiniApp || context?.user?.username) return

    const fetchBasename = async () => {
      try {
        console.log('🔍 Fetching Basename for external wallet...')
        const response = await fetch(`/api/get-basename?address=${address}`)
        const data = await response.json()
        
        if (data.username) {
          console.log(`✅ Found Basename: ${data.username}`)
          setBasename(data.username)
        }
      } catch (error) {
        console.log('❌ Could not fetch Basename:', error)
      }
    }

    fetchBasename()
  }, [address, isInMiniApp, context])

  // Auto-connect to Farcaster Wallet when in MiniApp
  useEffect(() => {
    if (!isInMiniApp) return
    if (isConnected) {
      // Already connected, signal ready
      if (!ready) {
        sdk.actions.ready()
        setReady(true)
      }
      return
    }
    
    // Wait for connectors to be available
    if (connectors.length === 0) return

    const farcasterConnector = connectors.find(c => c.name === 'Farcaster Wallet')
    if (farcasterConnector && !isConnected) {
      console.log('Auto-connecting to Farcaster Wallet...')
      
      // Small delay to ensure wagmi is fully initialized
      const timer = setTimeout(async () => {
        try {
          await connect({ connector: farcasterConnector })
          // Signal ready after connection
          await sdk.actions.ready()
          setReady(true)
        } catch (error) {
          console.error('Failed to auto-connect:', error)
        }
      }, 150)
      
      return () => clearTimeout(timer)
    }
  }, [isInMiniApp, isConnected, connectors, connect, ready])

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (isConnected && address) {
    const displayName = context?.user?.username || basename || formatAddress(address)
    
    return (
      <div className="relative group">
        <button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-2 px-3 md:px-6 rounded-lg md:rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-xs md:text-base flex items-center gap-2">
          {context?.user?.pfpUrl ? (
            <img 
              src={context.user.pfpUrl} 
              alt="PFP"
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : !isInMiniApp ? (
            <Avatar address={address} className="w-6 h-6 rounded-full" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          {displayName}
        </button>
        
        {/* Dropdown on hover */}
        <div className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
          <div className="p-4 border-b border-gray-700">
            <p className="text-xs text-gray-400">Connected Wallet</p>
            <p className="text-sm font-mono text-white break-all">{formatAddress(address)}</p>
          </div>
          {context?.user && (
            <div className="p-4 border-b border-gray-700">
              <p className="text-xs text-gray-400">Farcaster User</p>
              <p className="text-sm text-white">@{context.user.username || 'Unknown'}</p>
              <p className="text-xs text-gray-400">FID: {context.user.fid}</p>
            </div>
          )}
          {basename && !context?.user && (
            <div className="p-4 border-b border-gray-700">
              <p className="text-xs text-gray-400">Basename</p>
              <p className="text-sm text-white">{basename}</p>
            </div>
          )}
          <button
            onClick={() => disconnect()}
            className="w-full text-left px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-b-xl transition-all text-sm"
          >
            Disconnect
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={openConnectModal}
      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-2 px-3 md:px-6 rounded-lg md:rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-xs md:text-base"
    >
      <span className="hidden sm:inline">Connect Wallet</span>
      <span className="sm:hidden">Connect</span>
    </button>
  )
}
