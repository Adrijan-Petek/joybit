'use client'

import { useAccount, useDisconnect, useConnect } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { sdk } from '@farcaster/miniapp-sdk'
import { useEffect, useState } from 'react'
import { Avatar } from '@coinbase/onchainkit/identity'

interface UserData {
  username: string | null
  avatar: string | null
}

interface BaseIdentityData {
  username: string | null
  avatar: string | null
}

interface MiniAppUser {
  username: string | null
  displayName: string | null
  fid: number | null
  pfpUrl: string | null
}

const parseMiniAppUser = (rawContext: any): MiniAppUser | null => {
  const user = rawContext?.user
  if (!user) return null

  const fidValue = user.fid ?? user.userFid ?? user.id
  const parsedFid = Number(fidValue)
  const fid = Number.isFinite(parsedFid) && parsedFid > 0 ? parsedFid : null

  const pfpUrl =
    user.pfpUrl ||
    user.pfp ||
    user?.pfp?.url ||
    user.avatar ||
    user.avatarUrl ||
    null

  return {
    username: user.username || user.userName || null,
    displayName: user.displayName || user.display_name || null,
    fid,
    pfpUrl,
  }
}

export function WalletButton() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { openConnectModal } = useConnectModal()
  const { connectAsync, connectors, isPending: isConnectPending } = useConnect()
  const [context, setContext] = useState<{ user?: MiniAppUser } | null>(null)
  const [isInMiniApp, setIsInMiniApp] = useState(false)
  const [ready, setReady] = useState(false)
  const [basename, setBasename] = useState<string | null>(null)
  const [baseAvatar, setBaseAvatar] = useState<string | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false)
  const [autoConnectRetried, setAutoConnectRetried] = useState(false)

  // Initialize SDK context and check if in MiniApp
  useEffect(() => {
    const init = async () => {
      try {
        const [ctxResult, inMiniAppResult] = await Promise.allSettled([sdk.context, sdk.isInMiniApp()])
        const rawCtx = ctxResult.status === 'fulfilled' ? ctxResult.value : null
        const inMiniApp = inMiniAppResult.status === 'fulfilled' ? inMiniAppResult.value : false

        setContext({ user: parseMiniAppUser(rawCtx) || undefined })
        setIsInMiniApp(inMiniApp)

        // Retry once in Mini App because context user fields can hydrate slightly later.
        if (inMiniApp && !parseMiniAppUser(rawCtx)) {
          setTimeout(async () => {
            try {
              const retriedCtx = await sdk.context
              setContext({ user: parseMiniAppUser(retriedCtx) || undefined })
            } catch {
              // Ignore retry failures.
            }
          }, 700)
        }
        
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

  // Fetch Base identity (name + avatar) as fallback when Mini App profile data is absent.
  useEffect(() => {
    if (!address || basename) return

    const fetchBaseIdentity = async () => {
      try {
        const cacheKey = `identity:${address.toLowerCase()}`
        const cached = sessionStorage.getItem(cacheKey)
        if (cached) {
          const { name, avatar } = JSON.parse(cached)
          if (name) setBasename(name)
          if (avatar) setBaseAvatar(avatar)
          return
        }
        const response = await fetch(`/api/get-basename?address=${address}`)
        if (!response.ok) return
        const data = (await response.json()) as BaseIdentityData & { basename?: string | null }
        
        const resolvedName = data.username || data.basename || null
        if (resolvedName) setBasename(resolvedName)
        if (data.avatar) {
          setBaseAvatar(data.avatar)
        }
        sessionStorage.setItem(cacheKey, JSON.stringify({ name: resolvedName, avatar: data.avatar || null }))
      } catch (error) {
        console.log('Could not fetch Base identity:', error)
      }
    }

    fetchBaseIdentity()
  }, [address, basename])

  // Fetch persisted user profile (username/pfp) as additional fallback.
  useEffect(() => {
    if (!address || userData) return

    const fetchUserData = async () => {
      try {
        const cacheKey = `userprofile:${address.toLowerCase()}`
        const cached = sessionStorage.getItem(cacheKey)
        if (cached) {
          setUserData(JSON.parse(cached))
          return
        }
        const response = await fetch(`/api/user-profile?address=${address}`)
        if (response.ok) {
          const data = await response.json()
          setUserData(data)
          sessionStorage.setItem(cacheKey, JSON.stringify(data))
        }
      } catch (error) {
        console.log('Could not fetch user profile:', error)
      }
    }

    fetchUserData()
  }, [address, userData])

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
    if (isConnectPending) return
    if (autoConnectAttempted && autoConnectRetried) return

    const farcasterConnector = connectors.find(c => c.name === 'Farcaster Wallet')
    if (!farcasterConnector || isConnected) return

    // Small delay to ensure wagmi is fully initialized
    const timer = setTimeout(async () => {
      try {
        setAutoConnectAttempted(true)
        await connectAsync({ connector: farcasterConnector })
        await sdk.actions.ready()
        setReady(true)
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()

        // Some clients occasionally reset the request once; retry once silently.
        if (message.includes('connection request reset') && !autoConnectRetried) {
          setAutoConnectRetried(true)
          return
        }

        console.log('Auto-connect skipped:', error)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [isInMiniApp, isConnected, connectors, connectAsync, ready, isConnectPending, autoConnectAttempted, autoConnectRetried])

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (isConnected && address) {
    const farcasterName = context?.user?.displayName || context?.user?.username || (context?.user?.fid ? `fid:${context.user.fid}` : null)
    const displayName = farcasterName || basename || userData?.username || formatAddress(address)
    const displayAvatar = context?.user?.pfpUrl || baseAvatar || userData?.avatar || null
    
    return (
      <div className="relative group">
        <button className="bg-[#1652F0] hover:bg-[#1652F0]/90 text-white font-bold py-2 px-3 md:px-6 rounded-lg md:rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-xs md:text-base flex items-center gap-2">
          {displayAvatar ? (
            <img 
              src={displayAvatar} 
              alt="PFP"
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <Avatar address={address} className="w-6 h-6 rounded-full" />
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
              <p className="text-xs text-gray-400">Mini App User</p>
              <p className="text-sm text-white">@{context.user.username || context.user.displayName || 'Unknown'}</p>
              <p className="text-xs text-gray-400">FID: {context.user.fid}</p>
            </div>
          )}
          {basename && !context?.user && (
            <div className="p-4 border-b border-gray-700">
              <p className="text-xs text-gray-400">Wallet Name</p>
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
      className="bg-[#1652F0] hover:bg-[#1652F0]/90 text-white font-bold py-2 px-3 md:px-6 rounded-lg md:rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-xs md:text-base"
    >
      <span className="hidden sm:inline">Connect Wallet</span>
      <span className="sm:hidden">Connect</span>
    </button>
  )
}
