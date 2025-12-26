'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { WalletButton } from '@/components/WalletButton'
import { AudioButtons } from '@/components/AudioButtons'
import { useAudio } from '@/components/audio/AudioContext'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { 
  TREASURY_ABI, 
  MATCH3_GAME_ABI, 
  CARD_GAME_ABI,
  DAILY_CLAIM_ABI
} from '@/lib/contracts/abis'
import { notifyAdminReward } from '@/lib/utils/farcasterNotifications'
import { formatTokenBalance } from '@/lib/utils/tokenFormatting'

// Professional Tab Button Component
function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-0 px-2 py-2 md:px-4 md:py-3 rounded-lg font-medium text-xs md:text-sm transition-all duration-200 flex items-center justify-center gap-1 md:gap-2 ${
        active
          ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25 transform scale-[0.98]'
          : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
      }`}
    >
      <span className="text-sm md:text-base">{icon}</span>
      <span className="hidden sm:inline truncate">{label}</span>
      <span className="sm:hidden">{label.slice(0, 3)}</span>
    </button>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { playMusic } = useAudio()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    setMounted(true)
    playMusic('main-menu')
    
    // Initialize Farcaster SDK
    const initSDK = async () => {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk')
        await sdk.actions.ready()
      } catch (error) {
        console.log('Not in Farcaster Mini App context')
      }
    }
    
    initSDK()
  }, [playMusic])

  useEffect(() => {
    const adminAddresses = [process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS?.toLowerCase()]
    if (address && adminAddresses.includes(address.toLowerCase())) {
      setIsAuthorized(true)
    } else {
      setIsAuthorized(false)
    }
  }, [address])

  if (!mounted) return null

  if (!isConnected || !isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-4">
        <div className="fixed top-4 right-4 z-50">
          <WalletButton />
        </div>
        <div className="container mx-auto max-w-2xl">
          <div className="flex flex-col items-center justify-center min-h-screen">
            <h1 className="text-3xl font-bold mb-4">🔒 Access Denied</h1>
            <p className="text-orange-300 mb-6 text-center">
              You need owner privileges to access this panel
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-cyan-500 hover:bg-cyan-600 px-6 py-3 rounded-lg transition-all"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-2 md:p-4">
      <div className="fixed top-2 right-2 md:top-4 md:right-4 z-50 flex items-center gap-2">
        <AudioButtons />
        <WalletButton />
      </div>
      
      <div className="container mx-auto max-w-4xl pt-14 md:pt-16 pb-8 px-2">
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <button
            onClick={() => router.push('/')}
            className="bg-cyan-500 hover:bg-cyan-600 px-3 py-2 md:px-4 md:py-2 rounded-lg transition-all text-sm"
          >
            ← Back
          </button>
          <h1 className="text-xl md:text-3xl font-bold">🛠️ Admin</h1>
          <div className="bg-green-500/30 border border-green-500 px-2 py-1 md:px-4 md:py-2 rounded-lg text-xs md:text-base">
            Owner
          </div>
        </div>

        {/* Professional Tab Navigation */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-wrap gap-1 md:gap-2 p-1 bg-gray-800/50 rounded-xl border border-gray-700/50 backdrop-blur-sm">
            <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon="📊" label="Overview" />
            <TabButton active={activeTab === 'content'} onClick={() => setActiveTab('content')} icon="📢" label="Content" />
            <TabButton active={activeTab === 'games'} onClick={() => setActiveTab('games')} icon="🎮" label="Games" />
            <TabButton active={activeTab === 'rewards'} onClick={() => setActiveTab('rewards')} icon="💰" label="Rewards" />
            <TabButton active={activeTab === 'system'} onClick={() => setActiveTab('system')} icon="⚙️" label="System" />
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-4 md:space-y-6">
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SettingsOverview />
            </motion.div>
          )}

          {activeTab === 'content' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 md:space-y-6"
            >
              <AnnouncementManager />
              <NotificationsManager />
              <ScheduledNotificationsManager />
            </motion.div>
          )}

          {activeTab === 'games' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 md:space-y-6"
            >
              <LevelRewardsManager />
              <Match3GameSection />
              <CardGameSection />
              <DailyClaimSection />
            </motion.div>
          )}

          {activeTab === 'rewards' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 md:space-y-6"
            >
              <TreasurySection />
              <MultiTokenManagement />
              <LeaderboardRewardsSection />
              <MultiTokenLeaderboardRewardsSection />
            </motion.div>
          )}

          {activeTab === 'system' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 md:space-y-6"
            >
              <LeaderboardSyncSection />
              <ContractAddresses />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

// Announcement Manager Section
function AnnouncementManager() {
  const [message1, setMessage1] = useState('')
  const [message2, setMessage2] = useState('')
  const [message3, setMessage3] = useState('')
  const [message4, setMessage4] = useState('')
  const [message5, setMessage5] = useState('')
  const [currentMessages, setCurrentMessages] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load current announcements from database
    const loadAnnouncements = async () => {
      try {
        const response = await fetch('/api/announcements')
        if (response.ok) {
          const messages = await response.json()
          setCurrentMessages(messages)
          setMessage1(messages[0] || '')
          setMessage2(messages[1] || '')
          setMessage3(messages[2] || '')
          setMessage4(messages[3] || '')
          setMessage5(messages[4] || '')
        }
      } catch (error) {
        console.error('Failed to load announcements:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAnnouncements()
  }, [])

  const handleSave = async () => {
    try {
      const messages = [message1, message2, message3, message4, message5].filter(m => m.trim())

      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      })

      if (response.ok) {
        setCurrentMessages(messages)
        alert('✅ Announcements saved to database!')
      } else {
        alert('❌ Failed to save announcements')
      }
    } catch (error) {
      console.error('Error saving announcements:', error)
      alert('❌ Failed to save announcements')
    }
  }

  const handleClear = async () => {
    try {
      const response = await fetch('/api/announcements', {
        method: 'DELETE',
      })

      if (response.ok) {
        setMessage1('')
        setMessage2('')
        setMessage3('')
        setMessage4('')
        setMessage5('')
        setCurrentMessages([])
        alert('✅ Announcements cleared from database!')
      } else {
        alert('❌ Failed to clear announcements')
      }
    } catch (error) {
      console.error('Error clearing announcements:', error)
      alert('❌ Failed to clear announcements')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-4 md:p-6"
    >
      <h2 className="text-lg md:text-2xl font-bold mb-4">📢 Announcement Manager</h2>
      
      {/* Current Messages Display */}
      <div className="mb-6">
        <label className="block text-sm font-bold text-yellow-200 mb-3">📋 Current Active Messages</label>
        {currentMessages.length > 0 ? (
          <div className="space-y-2">
            {currentMessages.map((msg, i) => (
              <div key={i} className="bg-black/40 border border-yellow-500/30 rounded-lg px-4 py-2 flex items-start gap-3">
                <span className="text-yellow-400 font-bold text-sm">{i + 1}.</span>
                <span className="text-yellow-300 font-mono text-sm flex-1" style={{ textShadow: '0 0 10px rgba(234, 179, 8, 0.3)' }}>
                  {msg}
                </span>
                <span className="text-xs text-gray-500">{msg.length} chars</span>
              </div>
            ))}
            <div className="text-xs text-gray-400 text-center mt-2">
              ✨ These messages are scrolling on the main page
            </div>
          </div>
        ) : (
          <div className="bg-black/40 border border-yellow-500/30 rounded-lg px-4 py-3 text-center text-gray-400 text-sm">
            No announcements set. Add messages below to display them on the main page.
          </div>
        )}
      </div>

      {/* Live Preview */}
      {(message1 || message2 || message3 || message4 || message5) && (
        <div className="mb-4">
          <label className="block text-xs text-yellow-200 mb-2">👁️ Live Preview (before saving)</label>
          <div className="bg-black border-2 border-yellow-500 rounded-lg px-4 py-3 shadow-lg shadow-yellow-500/20 overflow-hidden">
            <div className="flex items-center gap-8 text-yellow-400 font-mono text-sm">
              {[message1, message2, message3, message4, message5].filter(m => m.trim()).map((msg, i) => (
                <div key={i} className="flex items-center gap-8 whitespace-nowrap">
                  <span style={{ textShadow: '0 0 10px rgba(234, 179, 8, 0.5)' }}>
                    📢 {msg}
                  </span>
                  <span>•</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Message Inputs */}
      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-xs text-yellow-200 mb-1">Announcement 1</label>
          <input
            type="text"
            value={message1}
            onChange={(e) => setMessage1(e.target.value)}
            placeholder="Enter first announcement..."
            maxLength={150}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">{message1.length}/150 characters</p>
        </div>

        <div>
          <label className="block text-xs text-yellow-200 mb-1">Announcement 2</label>
          <input
            type="text"
            value={message2}
            onChange={(e) => setMessage2(e.target.value)}
            placeholder="Enter second announcement..."
            maxLength={150}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">{message2.length}/150 characters</p>
        </div>

        <div>
          <label className="block text-xs text-yellow-200 mb-1">Announcement 3</label>
          <input
            type="text"
            value={message3}
            onChange={(e) => setMessage3(e.target.value)}
            placeholder="Enter third announcement..."
            maxLength={150}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">{message3.length}/150 characters</p>
        </div>

        <div>
          <label className="block text-xs text-yellow-200 mb-1">Announcement 4</label>
          <input
            type="text"
            value={message4}
            onChange={(e) => setMessage4(e.target.value)}
            placeholder="Enter fourth announcement..."
            maxLength={150}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">{message4.length}/150 characters</p>
        </div>

        <div>
          <label className="block text-xs text-yellow-200 mb-1">Announcement 5</label>
          <input
            type="text"
            value={message5}
            onChange={(e) => setMessage5(e.target.value)}
            placeholder="Enter fifth announcement..."
            maxLength={150}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">{message5.length}/150 characters</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 md:gap-4">
        <button 
          onClick={handleSave}
          className="bg-green-600 hover:bg-green-700 px-4 py-3 rounded-lg font-bold transition-all"
        >
          💾 Save & Publish
        </button>
        <button 
          onClick={handleClear}
          className="bg-red-600 hover:bg-red-700 px-4 py-3 rounded-lg font-bold transition-all"
        >
          🗑️ Clear All
        </button>
      </div>

      <p className="text-xs text-green-300 mt-4">
        💡 Up to 5 messages scroll continuously in a seamless loop with spacing (•) between them. Leave blank to skip.
      </p>
    </motion.div>
  )
}

// Notifications Manager Section
function NotificationsManager() {
  const [notificationTokens, setNotificationTokens] = useState<any[]>([])
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)
  const [testFid, setTestFid] = useState('')
  const [testTitle, setTestTitle] = useState('Test Notification')
  const [testBody, setTestBody] = useState('This is a test notification from the admin panel')
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [sendToAll, setSendToAll] = useState(false)
  const [stats, setStats] = useState({ total: 0, enabled: 0 })
  
  // Manual token addition
  const [manualFid, setManualFid] = useState('')
  const [manualToken, setManualToken] = useState('')
  const [manualUrl, setManualUrl] = useState('')
  const [isAddingToken, setIsAddingToken] = useState(false)

  const loadNotificationTokens = async () => {
    setIsLoadingTokens(true)
    try {
      const response = await fetch('/api/admin/notification-tokens')
      if (response.ok) {
        const data = await response.json()
        setNotificationTokens(data.tokens || [])
        setStats(data.stats || { total: 0, enabled: 0 })
      } else {
        console.error('Failed to load notification tokens')
        setNotificationTokens([])
        setStats({ total: 0, enabled: 0 })
      }
    } catch (error) {
      console.error('Failed to load notification tokens:', error)
      setNotificationTokens([])
      setStats({ total: 0, enabled: 0 })
    } finally {
      setIsLoadingTokens(false)
    }
  }

  const sendTestNotification = async () => {
    if (!sendToAll && (!testFid || !testTitle || !testBody)) {
      alert('Please fill in all test notification fields')
      return
    }

    if (sendToAll && (!testTitle || !testBody)) {
      alert('Please fill in title and body for sending to all users')
      return
    }

    setIsSendingTest(true)
    try {
      const requestBody: any = {
        title: testTitle,
        body: testBody,
        targetUrl: window.location.origin
      }

      if (sendToAll) {
        requestBody.sendToAll = true
      } else {
        requestBody.fid = parseInt(testFid)
      }

      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        const result = await response.json()
        if (sendToAll) {
          alert(`✅ Notifications sent! ${result.successCount}/${result.totalUsers} successful`)
        } else {
          alert('✅ Test notification sent successfully!')
        }
      } else {
        const error = await response.json()
        alert(`❌ Failed to send notification: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to send test notification:', error)
      alert('❌ Failed to send test notification')
    } finally {
      setIsSendingTest(false)
    }
  }

  const addManualToken = async () => {
    if (!manualFid) {
      alert('Please enter a valid FID')
      return
    }

    setIsAddingToken(true)
    try {
      const response = await fetch('/api/admin/notification-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fid: parseInt(manualFid),
          token: manualToken || '',
          url: manualUrl || '',
          enabled: true
        })
      })

      if (response.ok) {
        alert('✅ Notification token added successfully!')
        setManualFid('')
        setManualToken('')
        setManualUrl('')
        loadNotificationTokens() // Refresh the list
      } else {
        const error = await response.json()
        alert(`❌ Failed to add token: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to add manual token:', error)
      alert('❌ Failed to add token')
    } finally {
      setIsAddingToken(false)
    }
  }

  useEffect(() => {
    loadNotificationTokens()
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl p-4 md:p-6"
    >
      <h2 className="text-lg md:text-2xl font-bold mb-4">🔔 Notification Manager</h2>

      {/* Stats Overview */}
      <div className="mb-6">
        <label className="block text-sm font-bold text-blue-200 mb-3">📊 Notification Stats</label>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black/40 border border-blue-500/30 rounded-lg px-4 py-3 text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.total}</div>
            <div className="text-sm text-blue-300">Total Users</div>
          </div>
          <div className="bg-black/40 border border-green-500/30 rounded-lg px-4 py-3 text-center">
            <div className="text-2xl font-bold text-green-400">{stats.enabled}</div>
            <div className="text-sm text-green-300">Notifications Enabled</div>
          </div>
        </div>
      </div>

      {/* Manual Token Addition */}
      <div className="mb-6">
        <label className="block text-sm font-bold text-blue-200 mb-3">➕ Manually Add Notification Token</label>
        <div className="space-y-3">
          <input
            type="number"
            placeholder="Farcaster FID (e.g., 12345)"
            value={manualFid}
            onChange={(e) => setManualFid(e.target.value)}
            className="w-full bg-black/40 border border-blue-500/30 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Notification Token (leave empty if not available)"
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            className="w-full bg-black/40 border border-blue-500/30 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
          />
          <input
            type="url"
            placeholder="Notification URL (leave empty if not available)"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            className="w-full bg-black/40 border border-blue-500/30 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={addManualToken}
            disabled={isAddingToken || !manualFid}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-3 rounded-lg font-bold transition-all disabled:cursor-not-allowed"
          >
            {isAddingToken ? '⏳ Adding...' : '➕ Add Token'}
          </button>
        </div>
        <p className="text-xs text-blue-300 mt-2">
          💡 Use this to manually add notification tokens when the webhook isn&apos;t working or for testing purposes.
        </p>
      </div>

      {/* Test Notification */}
      <div className="mb-6">
        <label className="block text-sm font-bold text-blue-200 mb-3">📤 Send Test Notification</label>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="sendToAll"
              checked={sendToAll}
              onChange={(e) => setSendToAll(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="sendToAll" className="text-sm text-blue-300">
              Send to all users ({stats.enabled} enabled)
            </label>
          </div>

          {!sendToAll && (
            <input
              type="number"
              placeholder="Farcaster FID (e.g., 12345)"
              value={testFid}
              onChange={(e) => setTestFid(e.target.value)}
              className="w-full bg-black/40 border border-blue-500/30 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
            />
          )}

          <input
            type="text"
            placeholder="Notification Title"
            value={testTitle}
            onChange={(e) => setTestTitle(e.target.value)}
            className="w-full bg-black/40 border border-blue-500/30 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
          />
          <textarea
            placeholder="Notification Body"
            value={testBody}
            onChange={(e) => setTestBody(e.target.value)}
            rows={3}
            className="w-full bg-black/40 border border-blue-500/30 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none"
          />
          <button
            onClick={sendTestNotification}
            disabled={isSendingTest || (!sendToAll && !testFid) || !testTitle || !testBody}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-3 rounded-lg font-bold transition-all disabled:cursor-not-allowed"
          >
            {isSendingTest ? '⏳ Sending...' : sendToAll ? `📢 Send to All (${stats.enabled})` : '📤 Send Test Notification'}
          </button>
        </div>
      </div>

      {/* Notification Tokens List */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-3">
          <label className="block text-sm font-bold text-blue-200">📋 Notification Tokens</label>
          <button
            onClick={loadNotificationTokens}
            disabled={isLoadingTokens}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-3 py-1 rounded text-sm transition-all"
          >
            {isLoadingTokens ? '⏳' : '🔄'} Refresh
          </button>
        </div>

        {notificationTokens.length > 0 ? (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {notificationTokens.map((token) => (
              <div key={token.fid} className="bg-black/40 border border-blue-500/30 rounded-lg px-3 py-2 flex justify-between items-center">
                <div>
                  <div className="text-sm font-bold text-blue-300">FID: {token.fid}</div>
                  <div className="text-xs text-gray-400">
                    Token: {token.hasToken ? 'Available' : 'Pending'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${token.enabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {token.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-black/40 border border-blue-500/30 rounded-lg px-4 py-6 text-center text-gray-400">
            {isLoadingTokens ? '⏳ Loading notification tokens...' : 'No notification tokens found. Users need to enable notifications in Farcaster to receive them.'}
          </div>
        )}
      </div>

      <p className="text-xs text-blue-300 mt-4">
        💡 Notification tokens are stored in the database and persist across deployments. The system is fully operational - users just need to enable notifications in Farcaster to receive them.
      </p>

      {/* Troubleshooting */}
      <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <h3 className="text-sm font-bold text-yellow-300 mb-2">🔧 Troubleshooting</h3>
        <ul className="text-xs text-yellow-200 space-y-1">
          <li>• <strong>✅ System Status:</strong> Notification system is fully operational and deployed</li>
          <li>• <strong>Webhook URL:</strong> Configured as <code>https://joybit.vercel.app/api/farcaster-webhook</code></li>
          <li>• <strong>User Setup:</strong> Users must <strong>enable notifications</strong> in Farcaster client (not just add the app)</li>
          <li>• <strong>Token Storage:</strong> Tokens are only stored when users enable notifications (notifications_enabled event)</li>
          <li>• <strong>Empty Tokens:</strong> miniapp_added events provide empty tokens - real tokens come from notifications_enabled</li>
          <li>• <strong>External APIs:</strong> System successfully calls Pushover/Farcaster APIs when valid tokens exist</li>
          <li>• <strong>400 Errors:</strong> Usually means user hasn&apos;t enabled notifications or invalid app token</li>
          <li>• <strong>Test Results:</strong> API integration confirmed working with proper token data</li>
          <li>• <strong>Next Steps:</strong> Wait for users to enable notifications or manually add test tokens</li>
        </ul>
      </div>
    </motion.div>
  )
}

// Scheduled Notifications Manager Section
function ScheduledNotificationsManager() {
  const [scheduledNotifications, setScheduledNotifications] = useState<any[]>([])
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Create form state
  const [createTitle, setCreateTitle] = useState('')
  const [createBody, setCreateBody] = useState('')
  const [createTargetUrl, setCreateTargetUrl] = useState('https://joybit.vercel.app')
  const [createScheduledTime, setCreateScheduledTime] = useState('')
  const [createIsRecurring, setCreateIsRecurring] = useState(false)
  const [createRecurrencePattern, setCreateRecurrencePattern] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [createFid, setCreateFid] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const loadScheduledNotifications = async () => {
    setIsLoadingScheduled(true)
    try {
      const response = await fetch('/api/scheduled-notifications')
      if (response.ok) {
        const data = await response.json()
        setScheduledNotifications(data.notifications || [])
      } else {
        console.error('Failed to load scheduled notifications')
        setScheduledNotifications([])
      }
    } catch (error) {
      console.error('Failed to load scheduled notifications:', error)
      setScheduledNotifications([])
    } finally {
      setIsLoadingScheduled(false)
    }
  }

  const createScheduledNotification = async () => {
    if (!createTitle || !createBody || !createScheduledTime) {
      alert('Please fill in all required fields')
      return
    }

    setIsCreating(true)
    try {
      const requestBody: any = {
        title: createTitle,
        body: createBody,
        targetUrl: createTargetUrl,
        scheduledTime: new Date(createScheduledTime).toISOString(),
        isRecurring: createIsRecurring,
        enabled: true
      }

      if (createFid) {
        requestBody.fid = parseInt(createFid)
      }

      if (createIsRecurring) {
        requestBody.recurrencePattern = createRecurrencePattern
      }

      const response = await fetch('/api/scheduled-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        alert('✅ Scheduled notification created successfully!')
        setCreateTitle('')
        setCreateBody('')
        setCreateTargetUrl('https://joybit.vercel.app')
        setCreateScheduledTime('')
        setCreateIsRecurring(false)
        setCreateFid('')
        setShowCreateForm(false)
        loadScheduledNotifications()
      } else {
        const error = await response.json()
        alert(`❌ Failed to create notification: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to create scheduled notification:', error)
      alert('❌ Failed to create scheduled notification')
    } finally {
      setIsCreating(false)
    }
  }

  const toggleNotification = async (id: number, enabled: boolean) => {
    try {
      const response = await fetch(`/api/scheduled-notifications?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled })
      })

      if (response.ok) {
        loadScheduledNotifications()
      } else {
        alert('Failed to update notification')
      }
    } catch (error) {
      console.error('Failed to toggle notification:', error)
      alert('Failed to update notification')
    }
  }

  const deleteNotification = async (id: number) => {
    if (!confirm('Are you sure you want to delete this scheduled notification?')) return

    try {
      const response = await fetch(`/api/scheduled-notifications?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadScheduledNotifications()
      } else {
        alert('Failed to delete notification')
      }
    } catch (error) {
      console.error('Failed to delete notification:', error)
      alert('Failed to delete notification')
    }
  }

  useEffect(() => {
    loadScheduledNotifications()
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-4 md:p-6"
    >
      <h2 className="text-lg md:text-2xl font-bold mb-4">⏰ Scheduled Notifications</h2>

      {/* Create Button */}
      <div className="mb-4">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-bold transition-all"
        >
          {showCreateForm ? '❌ Cancel' : '➕ Create Scheduled Notification'}
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="mb-6 p-4 bg-black/40 border border-purple-500/30 rounded-lg">
          <h3 className="text-sm font-bold text-purple-300 mb-3">📝 Create New Scheduled Notification</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Notification Title"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              className="w-full bg-black/40 border border-purple-500/30 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
            />
            <textarea
              placeholder="Notification Body"
              value={createBody}
              onChange={(e) => setCreateBody(e.target.value)}
              rows={3}
              className="w-full bg-black/40 border border-purple-500/30 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none resize-none"
            />
            <input
              type="url"
              placeholder="Target URL (optional)"
              value={createTargetUrl}
              onChange={(e) => setCreateTargetUrl(e.target.value)}
              className="w-full bg-black/40 border border-purple-500/30 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
            />
            <input
              type="number"
              placeholder="Farcaster FID (leave empty for broadcast to all)"
              value={createFid}
              onChange={(e) => setCreateFid(e.target.value)}
              className="w-full bg-black/40 border border-purple-500/30 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
            />
            <input
              type="datetime-local"
              value={createScheduledTime}
              onChange={(e) => setCreateScheduledTime(e.target.value)}
              className="w-full bg-black/40 border border-purple-500/30 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
            />
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isRecurring"
                checked={createIsRecurring}
                onChange={(e) => setCreateIsRecurring(e.target.checked)}
                className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
              />
              <label htmlFor="isRecurring" className="text-sm text-purple-300">
                Recurring notification
              </label>
            </div>
            {createIsRecurring && (
              <select
                value={createRecurrencePattern}
                onChange={(e) => setCreateRecurrencePattern(e.target.value as 'daily' | 'weekly' | 'monthly')}
                className="w-full bg-black/40 border border-purple-500/30 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            )}
            <button
              onClick={createScheduledNotification}
              disabled={isCreating || !createTitle || !createBody || !createScheduledTime}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-3 rounded-lg font-bold transition-all disabled:cursor-not-allowed"
            >
              {isCreating ? '⏳ Creating...' : '✅ Create Notification'}
            </button>
          </div>
        </div>
      )}

      {/* Scheduled Notifications List */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-3">
          <label className="block text-sm font-bold text-purple-200">📋 Scheduled Notifications</label>
          <button
            onClick={loadScheduledNotifications}
            disabled={isLoadingScheduled}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-3 py-1 rounded text-sm transition-all"
          >
            {isLoadingScheduled ? '⏳' : '🔄'} Refresh
          </button>
        </div>

        {scheduledNotifications.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {scheduledNotifications.map((notification) => (
              <div key={notification.id} className="bg-black/40 border border-purple-500/30 rounded-lg px-3 py-2">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="text-sm font-bold text-purple-300">{notification.title}</div>
                    <div className="text-xs text-gray-400 mt-1">{notification.body}</div>
                    <div className="text-xs text-purple-400 mt-1">
                      📅 {new Date(notification.scheduledTime).toLocaleString()}
                      {notification.fid ? ` • FID: ${notification.fid}` : ' • 📢 Broadcast'}
                      {notification.isRecurring && ` • 🔄 ${notification.recurrencePattern}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <button
                      onClick={() => toggleNotification(notification.id, !notification.enabled)}
                      className={`text-xs px-2 py-1 rounded ${
                        notification.enabled
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      }`}
                    >
                      {notification.enabled ? '✅' : '⏸️'}
                    </button>
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-black/40 border border-purple-500/30 rounded-lg px-4 py-6 text-center text-gray-400">
            {isLoadingScheduled ? '⏳ Loading scheduled notifications...' : 'No scheduled notifications found.'}
          </div>
        )}
      </div>

      <p className="text-xs text-purple-300 mt-4">
        💡 Scheduled notifications will be sent automatically at their scheduled time. Recurring notifications reschedule themselves after sending.
      </p>
    </motion.div>
  )
}

// Level Rewards Manager Section
function LevelRewardsManager() {
  const { writeContractAsync } = useWriteContract()
  const [levelRewards, setLevelRewards] = useState<Record<number, string>>({})
  const [currentLevel, setCurrentLevel] = useState(1)
  const [rewardAmount, setRewardAmount] = useState('')
  const [savedRewards, setSavedRewards] = useState<Record<number, string>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load level rewards from database
    const loadRewards = async () => {
      try {
        const response = await fetch('/api/level-rewards')
        if (response.ok) {
          const data = await response.json()
          setSavedRewards(data)
          setLevelRewards(data)
        }
      } catch (error) {
        console.error('Failed to load level rewards:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadRewards()
  }, [])

  const handleSetReward = () => {
    if (!rewardAmount.trim()) return

    const newRewards = { ...levelRewards, [currentLevel]: rewardAmount.trim() }
    setLevelRewards(newRewards)
  }

  const handleRemoveReward = (level: number) => {
    const newRewards = { ...levelRewards }
    delete newRewards[level]
    setLevelRewards(newRewards)
  }

  const handleSave = async () => {
    try {
      // Save to database for each level reward
      for (const [levelStr, rewardStr] of Object.entries(levelRewards)) {
        const level = parseInt(levelStr)
        const reward = rewardStr.trim()
        if (reward && reward !== '0') {
          await fetch('/api/level-rewards', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ level, reward }),
          })
        }
      }

      // Save to contract for each level reward
      for (const [levelStr, rewardStr] of Object.entries(levelRewards)) {
        const level = parseInt(levelStr)
        const reward = parseFloat(rewardStr)
        if (reward > 0) {
          await writeContractAsync({
            address: CONTRACT_ADDRESSES.match3Game as `0x${string}`,
            abi: MATCH3_GAME_ABI,
            functionName: 'setLevelReward',
            args: [level, parseEther(reward.toString())],
          })
        }
      }

      setSavedRewards({ ...levelRewards })
      alert('✅ Level rewards saved to database and contract!')
    } catch (error) {
      console.error('Failed to save level rewards:', error)
      alert('❌ Failed to save level rewards')
    }
  }

  const handleClear = async () => {
    try {
      // Clear from database
      for (const level of Object.keys(levelRewards)) {
        await fetch('/api/level-rewards', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ level: parseInt(level) }),
        })
      }

      setLevelRewards({})
      setSavedRewards({})
      alert('✅ Level rewards cleared from database!')
    } catch (error) {
      console.error('Failed to clear level rewards:', error)
      alert('❌ Failed to clear level rewards')
    }
  }

  const getRewardForLevel = (level: number) => {
    return levelRewards[level] || savedRewards[level] || 'Not set'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4 md:p-6"
    >
      <h2 className="text-lg md:text-2xl font-bold mb-4">🎁 Level Rewards Manager</h2>
      
      {/* Current Rewards Display */}
      <div className="mb-6">
        <label className="block text-sm font-bold text-green-200 mb-3">📋 Current Level Rewards Overview</label>
        <div className="bg-black/40 border border-green-500/30 rounded-lg p-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-400">
                {Object.keys(savedRewards).length}
              </div>
              <div className="text-xs text-green-300">Levels with Rewards</div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-400">
                {Object.values(savedRewards).reduce((sum, reward) => sum + parseFloat(reward || '0'), 0).toFixed(1)}
              </div>
              <div className="text-xs text-blue-300">Total JOYB Rewards</div>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-400">
                {Math.max(...Object.keys(savedRewards).map(Number), 0)}
              </div>
              <div className="text-xs text-purple-300">Highest Level</div>
            </div>
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-400">
                {Object.keys(levelRewards).length}
              </div>
              <div className="text-xs text-orange-300">Pending Changes</div>
            </div>
          </div>

          {/* Level Columns Display */}
          <div className="max-h-64 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {/* Column 1: Levels 1-250 */}
              <div className="bg-gray-800/50 rounded-lg p-3">
                <h4 className="text-sm font-bold text-green-300 mb-2 text-center">🏆 Levels 1-250</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {Array.from({ length: 250 }, (_, i) => i + 1).map(level => {
                    const reward = getRewardForLevel(level)
                    const isSet = reward !== 'Not set'
                    const hasPending = levelRewards[level] !== undefined
                    return (
                      <div key={level} className={`flex justify-between items-center p-2 rounded text-xs ${
                        isSet ? 'bg-green-500/20 border border-green-500/30' : 'bg-gray-700/30'
                      } ${hasPending ? 'ring-1 ring-yellow-400/50' : ''}`}>
                        <span className="text-gray-300 font-medium">Lv.{level}</span>
                        <span className={`font-bold ${isSet ? 'text-green-300' : 'text-gray-500'}`}>
                          {isSet ? `${reward} 💎` : '—'}
                          {hasPending && <span className="text-yellow-400 ml-1">✏️</span>}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Column 2: Levels 251-500 */}
              <div className="bg-gray-800/50 rounded-lg p-3">
                <h4 className="text-sm font-bold text-blue-300 mb-2 text-center">💎 Levels 251-500</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {Array.from({ length: 250 }, (_, i) => i + 251).map(level => {
                    const reward = getRewardForLevel(level)
                    const isSet = reward !== 'Not set'
                    const hasPending = levelRewards[level] !== undefined
                    return (
                      <div key={level} className={`flex justify-between items-center p-2 rounded text-xs ${
                        isSet ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-gray-700/30'
                      } ${hasPending ? 'ring-1 ring-yellow-400/50' : ''}`}>
                        <span className="text-gray-300 font-medium">Lv.{level}</span>
                        <span className={`font-bold ${isSet ? 'text-blue-300' : 'text-gray-500'}`}>
                          {isSet ? `${reward} 💎` : '—'}
                          {hasPending && <span className="text-yellow-400 ml-1">✏️</span>}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Column 3: Levels 501-750 */}
              <div className="bg-gray-800/50 rounded-lg p-3">
                <h4 className="text-sm font-bold text-purple-300 mb-2 text-center">👑 Levels 501-750</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {Array.from({ length: 250 }, (_, i) => i + 501).map(level => {
                    const reward = getRewardForLevel(level)
                    const isSet = reward !== 'Not set'
                    const hasPending = levelRewards[level] !== undefined
                    return (
                      <div key={level} className={`flex justify-between items-center p-2 rounded text-xs ${
                        isSet ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-gray-700/30'
                      } ${hasPending ? 'ring-1 ring-yellow-400/50' : ''}`}>
                        <span className="text-gray-300 font-medium">Lv.{level}</span>
                        <span className={`font-bold ${isSet ? 'text-purple-300' : 'text-gray-500'}`}>
                          {isSet ? `${reward} 💎` : '—'}
                          {hasPending && <span className="text-yellow-400 ml-1">✏️</span>}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Column 4: Levels 751-1000 */}
              <div className="bg-gray-800/50 rounded-lg p-3">
                <h4 className="text-sm font-bold text-orange-300 mb-2 text-center">🔥 Levels 751-1000</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {Array.from({ length: 250 }, (_, i) => i + 751).map(level => {
                    const reward = getRewardForLevel(level)
                    const isSet = reward !== 'Not set'
                    const hasPending = levelRewards[level] !== undefined
                    return (
                      <div key={level} className={`flex justify-between items-center p-2 rounded text-xs ${
                        isSet ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-gray-700/30'
                      } ${hasPending ? 'ring-1 ring-yellow-400/50' : ''}`}>
                        <span className="text-gray-300 font-medium">Lv.{level}</span>
                        <span className={`font-bold ${isSet ? 'text-orange-300' : 'text-gray-500'}`}>
                          {isSet ? `${reward} 💎` : '—'}
                          {hasPending && <span className="text-yellow-400 ml-1">✏️</span>}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-400 justify-center">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500/20 border border-green-500/30 rounded"></div>
              <span>Reward Set</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-700/30 rounded"></div>
              <span>No Reward</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-yellow-400">✏️</span>
              <span>Pending Change</span>
            </div>
            <div className="flex items-center gap-1">
              <span>💎</span>
              <span>JOYB Tokens</span>
            </div>
          </div>
        </div>
      </div>

      {/* Set Reward Form */}
      <div className="mb-6">
        <label className="block text-sm font-bold text-green-200 mb-3">⚙️ Set Level Reward</label>
        <div className="bg-black/40 border border-green-500/30 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Level (1-1000)</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={currentLevel}
                onChange={(e) => setCurrentLevel(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">JOYB Reward Amount</label>
              <input
                type="text"
                placeholder="e.g., 100, 250.5"
                value={rewardAmount}
                onChange={(e) => setRewardAmount(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-green-500 focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSetReward}
                disabled={!rewardAmount.trim()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-2 rounded font-bold text-sm transition-all"
              >
                Set Reward
              </button>
            </div>
          </div>

          {/* Current Level Preview */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            <div className="text-sm text-green-300">
              <strong>Level {currentLevel}:</strong> {getRewardForLevel(currentLevel)} JOYB
              {levelRewards[currentLevel] && <span className="text-yellow-400 ml-2">(unsaved)</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Pending Changes */}
      {Object.keys(levelRewards).length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-bold text-yellow-200 mb-3">⏳ Pending Changes</label>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {Object.entries(levelRewards).map(([level, reward]) => (
                <div key={level} className="flex justify-between items-center text-sm">
                  <span>Level {level}: {reward} JOYB</span>
                  <button
                    onClick={() => handleRemoveReward(parseInt(level))}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={() => {
            const defaultRewards: Record<number, string> = {
              1: '10',    // Level 1: 10 JOYB
              2: '15',    // Level 2: 15 JOYB
              3: '25',    // Level 3: 25 JOYB
              4: '40',    // Level 4: 40 JOYB
              5: '50',    // Level 5: 50 JOYB
              6: '75',    // Level 6: 75 JOYB
              7: '100',   // Level 7: 100 JOYB
              8: '125',   // Level 8: 125 JOYB
              9: '150',   // Level 9: 150 JOYB
              10: '200',  // Level 10: 200 JOYB
              11: '250',  // Level 11: 250 JOYB
              12: '300',  // Level 12: 300 JOYB
              13: '400',  // Level 13: 400 JOYB
              14: '500',  // Level 14: 500 JOYB
              15: '600',  // Level 15: 600 JOYB
              16: '750',  // Level 16: 750 JOYB
              17: '900',  // Level 17: 900 JOYB
              18: '1100', // Level 18: 1100 JOYB
              19: '1300', // Level 19: 1300 JOYB
              20: '1500', // Level 20: 1500 JOYB
            }
            setLevelRewards(defaultRewards)
          }}
          className="flex-1 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-bold transition-all"
        >
          🎁 Set Default Rewards
        </button>
      </div>
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={Object.keys(levelRewards).length === 0}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-bold transition-all"
        >
          💾 Save Rewards
        </button>
        <button
          onClick={handleClear}
          className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-bold transition-all"
        >
          🗑️ Clear All
        </button>
      </div>
    </motion.div>
  )
}

// Leaderboard Sync Section
function LeaderboardSyncSection() {
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string>('')

  const handleSyncLeaderboard = async () => {
    if (!confirm('This will fetch Farcaster data for all leaderboard players. Continue?')) return

    setSyncing(true)
    setSyncStatus('Starting sync...')

    try {
      // First, get the current leaderboard
      const response = await fetch('/api/leaderboard')
      if (!response.ok) throw new Error('Failed to fetch leaderboard')
      
      const data = await response.json()
      const leaderboard = data.leaderboard || []
      
      setSyncStatus(`Found ${leaderboard.length} players to sync...`)
      
      // Sync each player
      let synced = 0
      let failed = 0
      
      for (const entry of leaderboard) {
        try {
          setSyncStatus(`Syncing ${synced + failed + 1}/${leaderboard.length}: ${entry.address.slice(0, 6)}...`)
          
          // Get user by verification address
          const userResponse = await fetch(`https://api.farcaster.xyz/v2/user-by-verification?address=${entry.address}`)
          if (!userResponse.ok) {
            console.log(`User by verification API failed for ${entry.address}:`, userResponse.status)
            failed++
            continue
          }
          
          const userData = await userResponse.json()
          if (!userData.result?.user) {
            console.log(`No user found for verified address ${entry.address}`)
            failed++
            continue
          }
          
          const username = userData.result.user.username
          const pfp = userData.result.user.pfp?.url
          console.log(`Found user ${username} with PFP for verified address ${entry.address}`)
          
          // Update the leaderboard entry
          const updateResponse = await fetch('/api/leaderboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: entry.address,
              score: entry.score,
              username,
              pfp
            })
          })
          
          if (!updateResponse.ok) {
            console.error(`Update failed for ${entry.address}:`, updateResponse.status)
            failed++
            continue
          }
          
          synced++
          
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500))
          
        } catch (error) {
          console.error('Failed to sync player:', entry.address, error)
          failed++
        }
      }
      
      setSyncStatus(`✅ Sync complete! Synced: ${synced}, Failed: ${failed}`)
      
    } catch (error) {
      console.error('Sync failed:', error)
      setSyncStatus('❌ Sync failed: ' + (error as Error).message)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/50 rounded-lg p-4 md:p-6"
    >
      <h3 className="text-lg md:text-xl font-bold text-blue-300 mb-4">🔄 Leaderboard Sync</h3>
      
      <div className="space-y-4">
        <div className="text-sm text-gray-300">
          <p>Sync Farcaster usernames and profile pictures for all leaderboard players.</p>
          <p className="text-yellow-400 mt-1">⚠️ This may take several minutes for large leaderboards.</p>
        </div>
        
        {syncStatus && (
          <div className="bg-black/20 border border-gray-600 rounded-lg p-3">
            <p className="text-sm font-mono">{syncStatus}</p>
          </div>
        )}
        
        <button
          onClick={handleSyncLeaderboard}
          disabled={syncing}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
        >
          {syncing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Syncing...
            </>
          ) : (
            <>
              🔄 Sync Leaderboard
            </>
          )}
        </button>
      </div>
    </motion.div>
  )
}

// Settings Overview Section
function SettingsOverview() {
  const { data: treasuryETH } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury,
    abi: TREASURY_ABI,
    functionName: 'treasuryBalanceETH',
  })

  const { data: treasuryJOYB } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury,
    abi: TREASURY_ABI,
    functionName: 'treasuryBalanceToken',
    args: [CONTRACT_ADDRESSES.joybitToken],
  })

  const { data: supportedTokens } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury,
    abi: TREASURY_ABI,
    functionName: 'getSupportedTokens',
  })

  const [tokenMetadata, setTokenMetadata] = useState<Record<string, { image: string; symbol: string }>>({})

  // Load token metadata from API
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const response = await fetch('/api/token-metadata')
        if (response.ok) {
          const data = await response.json()
          setTokenMetadata(data)
        }
      } catch (error) {
        console.error('Failed to load token metadata:', error)
      }
    }
    loadMetadata()
  }, [])

  const { data: match3PlayFee } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game,
    abi: MATCH3_GAME_ABI,
    functionName: 'playFee',
  })

  // Match3 Booster Prices
  const { data: hammerPrice } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game,
    abi: MATCH3_GAME_ABI,
    functionName: 'hammerPrice',
  })

  const { data: shufflePrice } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game,
    abi: MATCH3_GAME_ABI,
    functionName: 'shufflePrice',
  })

  const { data: colorBombPrice } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game,
    abi: MATCH3_GAME_ABI,
    functionName: 'colorBombPrice',
  })

  const { data: hammerPackPrice } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game,
    abi: MATCH3_GAME_ABI,
    functionName: 'hammerPackPrice',
  })

  const { data: shufflePackPrice } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game,
    abi: MATCH3_GAME_ABI,
    functionName: 'shufflePackPrice',
  })

  const { data: colorBombPackPrice } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game,
    abi: MATCH3_GAME_ABI,
    functionName: 'colorBombPackPrice',
  })

  const { data: cardPlayFee } = useReadContract({
    address: CONTRACT_ADDRESSES.cardGame,
    abi: CARD_GAME_ABI,
    functionName: 'playFee',
  })

  const { data: cardWinReward } = useReadContract({
    address: CONTRACT_ADDRESSES.cardGame,
    abi: CARD_GAME_ABI,
    functionName: 'winReward',
  })

  const { data: dailyBaseReward } = useReadContract({
    address: CONTRACT_ADDRESSES.dailyClaim,
    abi: DAILY_CLAIM_ABI,
    functionName: 'baseReward',
  })

  const { data: dailyStreakBonus } = useReadContract({
    address: CONTRACT_ADDRESSES.dailyClaim,
    abi: DAILY_CLAIM_ABI,
    functionName: 'streakBonus',
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-4 md:p-6"
    >
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-center">📊 Current Settings Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {/* Treasury */}
        <div className="bg-black/30 rounded-lg p-3 md:p-4">
          <h3 className="text-sm md:text-base font-bold text-blue-400 mb-2">💰 Treasury</h3>
          <div className="space-y-1 text-xs md:text-sm mb-3">
            <div className="flex justify-between">
              <span className="text-gray-400">ETH Balance:</span>
              <span className="font-bold">{formatTokenBalance(treasuryETH)} ETH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">JOYB Balance:</span>
              <span className="font-bold">{formatTokenBalance(treasuryJOYB)} JOYB</span>
            </div>
          </div>
          
          {/* Multi-Token Balances */}
          {supportedTokens && Array.isArray(supportedTokens) && (supportedTokens as `0x${string}`[]).filter(addr => addr.toLowerCase() !== CONTRACT_ADDRESSES.joybitToken?.toLowerCase()).length > 0 && (
            <div>
              <h4 className="text-xs md:text-sm font-bold text-purple-400 mb-2">Multi-Token Balances</h4>
              <div className="space-y-1">
                {(supportedTokens as `0x${string}`[])
                  .filter(addr => addr.toLowerCase() !== CONTRACT_ADDRESSES.joybitToken?.toLowerCase())
                  .map(tokenAddr => {
                    const metadata = tokenMetadata[tokenAddr.toLowerCase()]
                    return (
                      <MultiTokenBalanceDisplay
                        key={tokenAddr}
                        address={tokenAddr}
                        symbol={metadata?.symbol || 'TOKEN'}
                      />
                    )
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Match-3 Game */}
        <div className="bg-black/30 rounded-lg p-3 md:p-4">
          <h3 className="text-sm md:text-base font-bold text-purple-400 mb-2">🎮 Match-3 Game</h3>
          <div className="space-y-1 text-xs md:text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Play Fee:</span>
              <span className="font-bold">{formatEther(match3PlayFee || 0n)} ETH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Hammer Price:</span>
              <span className="font-bold">{formatEther(hammerPrice || 0n)} ETH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Shuffle Price:</span>
              <span className="font-bold">{formatEther(shufflePrice || 0n)} ETH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Color Bomb:</span>
              <span className="font-bold">{formatEther(colorBombPrice || 0n)} ETH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Hammer Pack (5):</span>
              <span className="font-bold">{formatEther(hammerPackPrice || 0n)} ETH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Shuffle Pack (5):</span>
              <span className="font-bold">{formatEther(shufflePackPrice || 0n)} ETH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Bomb Pack (5):</span>
              <span className="font-bold">{formatEther(colorBombPackPrice || 0n)} ETH</span>
            </div>
          </div>
        </div>

        {/* Card Game */}
        <div className="bg-black/30 rounded-lg p-3 md:p-4">
          <h3 className="text-sm md:text-base font-bold text-green-400 mb-2">🎴 Card Game</h3>
          <div className="space-y-1 text-xs md:text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Play Fee:</span>
              <span className="font-bold">{formatEther(cardPlayFee || 0n)} ETH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Win Reward:</span>
              <span className="font-bold">{formatEther(cardWinReward || 0n)} JOYB</span>
            </div>
          </div>
        </div>

        {/* Daily Claim */}
        <div className="bg-black/30 rounded-lg p-3 md:p-4">
          <h3 className="text-sm md:text-base font-bold text-orange-400 mb-2">🎁 Daily Claim</h3>
          <div className="space-y-1 text-xs md:text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Base Reward:</span>
              <span className="font-bold">{formatEther(dailyBaseReward || 0n)} JOYB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Streak Bonus:</span>
              <span className="font-bold">{formatEther(dailyStreakBonus || 0n)} JOYB</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 text-center text-xs md:text-sm text-gray-400">
        ℹ️ All values are fetched live from smart contracts
      </div>
    </motion.div>
  )
}

// Treasury Section
function TreasurySection() {
  const [withdrawETH, setWithdrawETH] = useState('')
  const [withdrawJOYB, setWithdrawJOYB] = useState('')
  const [withdrawTokenAddress, setWithdrawTokenAddress] = useState('')
  const [withdrawTokenAmount, setWithdrawTokenAmount] = useState('')
  const [adminAddress, setAdminAddress] = useState('')
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const [tokenMetadata, setTokenMetadata] = useState<Record<string, { image: string; symbol: string }>>({})
  
  const { writeContractAsync: writeContract, isPending } = useWriteContract()
  const { isLoading: isProcessing, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const { data: ethBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury,
    abi: TREASURY_ABI,
    functionName: 'treasuryBalanceETH',
  })

  const { data: joybBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury,
    abi: TREASURY_ABI,
    functionName: 'treasuryBalanceToken',
    args: [CONTRACT_ADDRESSES.joybitToken],
  })

  const { data: supportedTokens } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury,
    abi: TREASURY_ABI,
    functionName: 'getSupportedTokens',
  })

  // Load token metadata from API
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const response = await fetch('/api/token-metadata')
        if (response.ok) {
          const data = await response.json()
          setTokenMetadata(data)
        }
      } catch (error) {
        console.error('Failed to load token metadata:', error)
      }
    }
    loadMetadata()
  }, [])

  useEffect(() => {
    if (isSuccess) {
      alert('✅ Transaction successful!')
      setWithdrawETH('')
      setWithdrawJOYB('')
      setWithdrawTokenAddress('')
      setWithdrawTokenAmount('')
      setAdminAddress('')
    }
  }, [isSuccess])

  const handleWithdrawETH = async () => {
    if (!withdrawETH || Number(withdrawETH) <= 0) {
      alert('❌ Enter valid amount')
      return
    }
    try {
      const hash = await writeContract({
        address: CONTRACT_ADDRESSES.treasury,
        abi: TREASURY_ABI,
        functionName: 'withdrawETH',
        args: [parseEther(withdrawETH)],
      })
      setTxHash(hash)
    } catch (error) {
      console.error(error)
      alert('❌ Transaction rejected')
    }
  }

  const handleWithdrawJOYB = async () => {
    if (!withdrawJOYB || Number(withdrawJOYB) <= 0) {
      alert('❌ Enter valid amount')
      return
    }
    try {
      const hash = await writeContract({
        address: CONTRACT_ADDRESSES.treasury,
        abi: TREASURY_ABI,
        functionName: 'withdrawToken',
        args: [CONTRACT_ADDRESSES.joybitToken, parseEther(withdrawJOYB)],
      })
      setTxHash(hash)
    } catch (error) {
      console.error(error)
      alert('❌ Transaction rejected')
    }
  }

  const handleAddAdmin = async () => {
    if (!adminAddress || !adminAddress.startsWith('0x')) {
      alert('❌ Enter valid address')
      return
    }
    try {
      const hash = await writeContract({
        address: CONTRACT_ADDRESSES.treasury,
        abi: TREASURY_ABI,
        functionName: 'addAdmin',
        args: [adminAddress as `0x${string}`],
      })
      setTxHash(hash)
    } catch (error) {
      console.error(error)
      alert('❌ Transaction rejected')
    }
  }

  const handleRemoveAdmin = async () => {
    if (!adminAddress || !adminAddress.startsWith('0x')) {
      alert('❌ Enter valid address')
      return
    }
    try {
      const hash = await writeContract({
        address: CONTRACT_ADDRESSES.treasury,
        abi: TREASURY_ABI,
        functionName: 'removeAdmin',
        args: [adminAddress as `0x${string}`],
      })
      setTxHash(hash)
    } catch (error) {
      console.error(error)
      alert('❌ Transaction rejected')
    }
  }

  const handleWithdrawToken = async () => {
    if (!withdrawTokenAddress || !withdrawTokenAddress.startsWith('0x')) {
      alert('❌ Enter valid token address')
      return
    }
    if (!withdrawTokenAmount || Number(withdrawTokenAmount) <= 0) {
      alert('❌ Enter valid amount')
      return
    }
    try {
      const hash = await writeContract({
        address: CONTRACT_ADDRESSES.treasury,
        abi: TREASURY_ABI,
        functionName: 'withdrawToken',
        args: [withdrawTokenAddress as `0x${string}`, parseEther(withdrawTokenAmount)],
      })
      setTxHash(hash)
    } catch (error) {
      console.error(error)
      alert('❌ Transaction rejected')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4 md:p-6"
    >
      <h2 className="text-lg md:text-2xl font-bold mb-4">🏦 Treasury</h2>
      
      <div className="grid grid-cols-2 gap-2 md:gap-4 mb-4 md:mb-6">
        <div className="bg-black/30 rounded-lg p-3 md:p-4">
          <div className="text-xs md:text-sm text-gray-400">ETH Balance</div>
          <div className="text-lg md:text-2xl font-bold text-green-400">
            {formatTokenBalance(ethBalance)} ETH
          </div>
        </div>
        <div className="bg-black/30 rounded-lg p-3 md:p-4">
          <div className="text-xs md:text-sm text-gray-400">JOYB Balance</div>
          <div className="text-lg md:text-2xl font-bold text-yellow-400">
            {formatTokenBalance(joybBalance)} JOYB
          </div>
        </div>
      </div>

      {/* Multi-Token Balances */}
      {supportedTokens && Array.isArray(supportedTokens) && (supportedTokens as `0x${string}`[]).filter(addr => addr.toLowerCase() !== CONTRACT_ADDRESSES.joybitToken?.toLowerCase()).length > 0 && (
        <div className="mb-4 md:mb-6">
          <h3 className="text-sm md:text-base font-bold text-purple-400 mb-3">Multi-Token Balances</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
            {(supportedTokens as `0x${string}`[])
              .filter(addr => addr.toLowerCase() !== CONTRACT_ADDRESSES.joybitToken?.toLowerCase())
              .map(tokenAddr => {
                const metadata = tokenMetadata[tokenAddr.toLowerCase()]
                return (
                  <TokenBalance
                    key={tokenAddr}
                    address={tokenAddr}
                    symbol={metadata?.symbol || 'TOKEN'}
                    image={metadata?.image}
                  />
                )
              })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div>
          <label className="block text-xs md:text-sm text-blue-200 mb-2">Withdraw ETH</label>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              value={withdrawETH}
              onChange={(e) => setWithdrawETH(e.target.value)}
              placeholder="Amount"
              className="col-span-2 bg-white/10 border border-white/20 rounded-lg px-3 py-2 md:px-4 md:py-3 text-white text-sm md:text-base"
            />
            <button 
              onClick={handleWithdrawETH}
              disabled={isPending || isProcessing}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 px-2 py-2 md:px-4 md:py-3 rounded-lg font-bold transition-all text-sm md:text-base"
            >
              {isPending || isProcessing ? '⏳' : 'Send'}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs md:text-sm text-blue-200 mb-2">Withdraw JOYB</label>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              value={withdrawJOYB}
              onChange={(e) => setWithdrawJOYB(e.target.value)}
              placeholder="Amount"
              className="col-span-2 bg-white/10 border border-white/20 rounded-lg px-3 py-2 md:px-4 md:py-3 text-white text-sm md:text-base"
            />
            <button 
              onClick={handleWithdrawJOYB}
              disabled={isPending || isProcessing}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 px-2 py-2 md:px-4 md:py-3 rounded-lg font-bold transition-all text-sm md:text-base"
            >
              {isPending || isProcessing ? '⏳' : 'Send'}
            </button>
          </div>
        </div>
      </div>

      {/* Withdraw Any Token */}
      <div className="mt-4">
        <label className="block text-xs md:text-sm text-purple-200 mb-2">Withdraw Any Token</label>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input
            type="text"
            value={withdrawTokenAddress}
            onChange={(e) => setWithdrawTokenAddress(e.target.value)}
            placeholder="Token address (0x...)"
            className="md:col-span-3 bg-white/10 border border-white/20 rounded-lg px-3 py-2 md:px-4 md:py-3 text-white text-sm md:text-base"
          />
          <input
            type="text"
            value={withdrawTokenAmount}
            onChange={(e) => setWithdrawTokenAmount(e.target.value)}
            placeholder="Amount"
            className="md:col-span-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 md:px-4 md:py-3 text-white text-sm md:text-base"
          />
          <button 
            onClick={handleWithdrawToken}
            disabled={isPending || isProcessing}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 px-2 py-2 md:px-4 md:py-3 rounded-lg font-bold transition-all text-sm md:text-base"
          >
            {isPending || isProcessing ? '⏳' : 'Send'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          💡 Withdraw any ERC20 token by entering its contract address
        </p>
      </div>

      <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-white/10">
        <label className="block text-xs md:text-sm text-blue-200 mb-2">Admin Management</label>
        <div className="grid grid-cols-5 gap-2">
          <input
            type="text"
            value={adminAddress}
            onChange={(e) => setAdminAddress(e.target.value)}
            placeholder="Admin address (0x...)"
            className="col-span-3 bg-white/10 border border-white/20 rounded-lg px-3 py-2 md:px-4 md:py-3 text-white text-sm md:text-base"
          />
          <button 
            onClick={handleAddAdmin}
            disabled={isPending || isProcessing}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 px-2 py-2 md:px-4 md:py-3 rounded-lg font-bold transition-all text-xs md:text-base"
          >
            Add
          </button>
          <button 
            onClick={handleRemoveAdmin}
            disabled={isPending || isProcessing}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-500 px-2 py-2 md:px-4 md:py-3 rounded-lg font-bold transition-all text-xs md:text-base"
          >
            Remove
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          💡 Admins can call creditReward() for any supported token
        </p>
      </div>
    </motion.div>
  )
}

// Token Balance Display Component
function TokenBalance({ address, symbol, image }: { address: `0x${string}`; symbol: string; image?: string }) {
  const { data: balance } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury,
    abi: TREASURY_ABI,
    functionName: 'treasuryBalanceToken',
    args: [address],
  })

  return (
    <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-3">
      <div className="text-xs text-gray-400 mb-1">{symbol} Balance</div>
      <div className="text-base md:text-lg font-bold text-purple-300">
        {formatTokenBalance(balance)} {symbol}
      </div>
    </div>
  )
}

// Compact Token Balance Display for Settings Overview
function MultiTokenBalanceDisplay({ address, symbol }: { address: `0x${string}`; symbol: string }) {
  const { data: balance } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury,
    abi: TREASURY_ABI,
    functionName: 'treasuryBalanceToken',
    args: [address],
  })

  return (
    <div className="flex justify-between text-xs">
      <span className="text-gray-400">{symbol}:</span>
      <span className="font-bold text-purple-300">
        {formatTokenBalance(balance)} {symbol}
      </span>
    </div>
  )
}

// Multi-Token Management Section
function MultiTokenManagement() {
  const [newTokenAddress, setNewTokenAddress] = useState('')
  const [newTokenMinBalance, setNewTokenMinBalance] = useState('')
  const [newTokenImage, setNewTokenImage] = useState('')
  const [newTokenSymbol, setNewTokenSymbol] = useState('')
  const [removeTokenAddress, setRemoveTokenAddress] = useState('')
  const [playerAddress, setPlayerAddress] = useState('')
  const [rewardTokenAddress, setRewardTokenAddress] = useState('')
  const [rewardAmount, setRewardAmount] = useState('')
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const [tokenImages, setTokenImages] = useState<Record<string, { image: string; symbol: string }>>({})
  
  const { writeContractAsync: writeContract, isPending } = useWriteContract()
  const { isLoading: isProcessing, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const { data: supportedTokens } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury,
    abi: TREASURY_ABI,
    functionName: 'getSupportedTokens',
  })

  const { data: joybitTokenAddress } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury,
    abi: TREASURY_ABI,
    functionName: 'joybitToken',
  })

  // Load token images from localStorage and API
  useEffect(() => {
    const loadTokenImages = async () => {
      // Load from localStorage first
      const saved = localStorage.getItem('joybit_token_images')
      if (saved) {
        setTokenImages(JSON.parse(saved))
      }
      
      // Also load from API
      try {
        const response = await fetch('/api/token-metadata')
        if (response.ok) {
          const data = await response.json()
          setTokenImages(prev => ({ ...data, ...prev })) // Merge with localStorage
        }
      } catch (error) {
        console.error('Failed to load token metadata from API:', error)
      }
    }
    
    loadTokenImages()
  }, [])

  // Save token image to both localStorage and API
  const saveTokenImage = async (address: string, image: string, symbol: string) => {
    const updated = { ...tokenImages, [address.toLowerCase()]: { image, symbol } }
    setTokenImages(updated)
    
    console.log('💾 Admin: Saving token metadata:', { address, image, symbol })
    
    // Save to localStorage
    localStorage.setItem('joybit_token_images', JSON.stringify(updated))
    console.log('✅ Admin: Saved to localStorage:', updated)
    
    // Save to API
    try {
      console.log('📡 Admin: Sending to API...')
      const response = await fetch('/api/token-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, image, symbol })
      })
      const result = await response.json()
      console.log('✅ Admin: API response:', result)
    } catch (error) {
      console.error('❌ Admin: Failed to save token metadata to API:', error)
    }
  }

  useEffect(() => {
    if (isSuccess) {
      const handleSuccess = async () => {
        alert('✅ Transaction successful!')

        // Send notification if this was a reward credit
        if (playerAddress && rewardTokenAddress && rewardAmount) {
          const tokenData = tokenImages[rewardTokenAddress.toLowerCase()]
          const tokenSymbol = tokenData?.symbol || (rewardTokenAddress.toLowerCase() === CONTRACT_ADDRESSES.joybitToken.toLowerCase() ? 'JOYB' : 'tokens')

          // Send notification to the rewarded player
          await notifyAdminReward(rewardAmount, tokenSymbol)
        }

        // Clear form fields
        setNewTokenAddress('')
        setNewTokenMinBalance('')
        setNewTokenImage('')
        setNewTokenSymbol('')
        setRemoveTokenAddress('')
        setPlayerAddress('')
        setRewardTokenAddress('')
        setRewardAmount('')
      }

      handleSuccess()
    }
  }, [isSuccess, playerAddress, rewardTokenAddress, rewardAmount, tokenImages])

  const handleAddToken = async () => {
    if (!newTokenAddress || !newTokenAddress.startsWith('0x')) {
      alert('❌ Enter valid token address')
      return
    }
    if (!newTokenMinBalance || Number(newTokenMinBalance) < 0) {
      alert('❌ Enter valid minimum balance')
      return
    }
    
    // Save token metadata BEFORE blockchain transaction
    console.log('💾 Saving token metadata before transaction...')
    if (newTokenImage || newTokenSymbol) {
      await saveTokenImage(newTokenAddress, newTokenImage, newTokenSymbol || 'TOKEN')
      console.log('✅ Token metadata saved before transaction')
    }
    
    try {
      const hash = await writeContract({
        address: CONTRACT_ADDRESSES.treasury,
        abi: TREASURY_ABI,
        functionName: 'addSupportedToken',
        args: [newTokenAddress as `0x${string}`, parseEther(newTokenMinBalance)],
      })
      setTxHash(hash)
    } catch (error) {
      console.error(error)
      alert('❌ Transaction rejected')
    }
  }

  const handleRemoveToken = async () => {
    if (!removeTokenAddress || !removeTokenAddress.startsWith('0x')) {
      alert('❌ Enter valid token address')
      return
    }
    try {
      const hash = await writeContract({
        address: CONTRACT_ADDRESSES.treasury,
        abi: TREASURY_ABI,
        functionName: 'removeSupportedToken',
        args: [removeTokenAddress as `0x${string}`],
      })
      setTxHash(hash)
    } catch (error) {
      console.error(error)
      alert('❌ Transaction rejected')
    }
  }

  const handleCreditReward = async () => {
    if (!playerAddress || !playerAddress.startsWith('0x')) {
      alert('❌ Enter valid player address')
      return
    }
    if (!rewardTokenAddress || !rewardTokenAddress.startsWith('0x')) {
      alert('❌ Enter valid token address')
      return
    }
    if (!rewardAmount || Number(rewardAmount) <= 0) {
      alert('❌ Enter valid reward amount')
      return
    }
    try {
      const hash = await writeContract({
        address: CONTRACT_ADDRESSES.treasury,
        abi: TREASURY_ABI,
        functionName: 'creditReward',
        args: [
          playerAddress as `0x${string}`, 
          rewardTokenAddress as `0x${string}`, 
          parseEther(rewardAmount)
        ],
      })
      setTxHash(hash)
    } catch (error) {
      console.error(error)
      alert('❌ Transaction rejected')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-4 md:p-6"
    >
      <h2 className="text-lg md:text-2xl font-bold mb-4">🪙 Multi-Token Rewards</h2>
      
      {/* Supported Tokens Display */}
      <div className="bg-black/30 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-bold text-yellow-400 mb-2">Supported Tokens</h3>
        <div className="space-y-2">
          {supportedTokens && (supportedTokens as `0x${string}`[]).length > 0 ? (
            (supportedTokens as `0x${string}`[]).map((token, i) => {
              const tokenData = tokenImages[token.toLowerCase()]
              const isJoyb = token === joybitTokenAddress
              return (
                <div key={i} className="flex items-center gap-3 bg-white/5 rounded px-3 py-2">
                  {tokenData?.image ? (
                    <img 
                      src={tokenData.image} 
                      alt={tokenData.symbol}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs">
                      {isJoyb ? '🎮' : '🪙'}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-mono text-xs md:text-sm text-gray-300">{token}</div>
                    {tokenData?.symbol && (
                      <div className="text-xs text-gray-500">{tokenData.symbol}</div>
                    )}
                  </div>
                  {isJoyb && (
                    <span className="text-xs bg-yellow-500/30 px-2 py-1 rounded">JOYB (Default)</span>
                  )}
                </div>
              )
            })
          ) : (
            <p className="text-gray-400 text-sm">No tokens configured</p>
          )}
        </div>
      </div>

      {/* Add New Token */}
      <div className="mb-6">
        <label className="block text-xs md:text-sm text-yellow-200 mb-2">Add New Reward Token</label>
        <div className="grid grid-cols-1 gap-2 mb-2">
          <input
            type="text"
            value={newTokenAddress}
            onChange={(e) => setNewTokenAddress(e.target.value)}
            placeholder="Token address (0x...)"
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 md:px-4 md:py-3 text-white text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={newTokenSymbol}
              onChange={(e) => setNewTokenSymbol(e.target.value)}
              placeholder="Symbol (e.g., USDC)"
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 md:px-4 md:py-3 text-white text-sm"
            />
            <input
              type="text"
              value={newTokenMinBalance}
              onChange={(e) => setNewTokenMinBalance(e.target.value)}
              placeholder="Min balance"
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 md:px-4 md:py-3 text-white text-sm"
            />
          </div>
          <input
            type="text"
            value={newTokenImage}
            onChange={(e) => setNewTokenImage(e.target.value)}
            placeholder="Image URL (https://...)"
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 md:px-4 md:py-3 text-white text-sm"
          />
          {newTokenImage && (
            <div className="flex items-center gap-2 bg-black/40 rounded-lg p-2">
              <span className="text-xs text-gray-400">Preview:</span>
              <img 
                src={newTokenImage} 
                alt="Token preview"
                className="w-10 h-10 rounded-full object-cover border-2 border-yellow-500/30"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="%23666"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-size="20">?</text></svg>'
                }}
              />
              <span className="text-xs text-green-400">✓ Image loaded</span>
            </div>
          )}
          <button 
            onClick={handleAddToken}
            disabled={isPending || isProcessing}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 px-4 py-3 rounded-lg font-bold transition-all"
          >
            {isPending || isProcessing ? '⏳ Processing...' : 'Add Token'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          💡 Add any ERC20 token for multi-currency rewards. Image and symbol are optional but recommended.
        </p>
      </div>

      {/* Remove Token */}
      <div className="mb-6">
        <label className="block text-xs md:text-sm text-yellow-200 mb-2">Remove Token</label>
        <div className="grid grid-cols-3 gap-2">
          <input
            type="text"
            value={removeTokenAddress}
            onChange={(e) => setRemoveTokenAddress(e.target.value)}
            placeholder="Token address (0x...)"
            className="col-span-2 bg-white/10 border border-white/20 rounded-lg px-3 py-2 md:px-4 md:py-3 text-white text-sm"
          />
          <button 
            onClick={handleRemoveToken}
            disabled={isPending || isProcessing}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-500 px-4 py-3 rounded-lg font-bold transition-all"
          >
            {isPending || isProcessing ? '⏳' : 'Remove'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          ⚠️ Cannot remove JOYB (primary token)
        </p>
      </div>

      {/* Credit Reward to Player */}
      <div className="pt-6 border-t border-white/10">
        <label className="block text-xs md:text-sm text-yellow-200 mb-2">Credit Reward to Player</label>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            type="text"
            value={playerAddress}
            onChange={(e) => setPlayerAddress(e.target.value)}
            placeholder="Player address"
            className="md:col-span-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 md:px-4 md:py-3 text-white text-sm"
          />
          <input
            type="text"
            value={rewardTokenAddress}
            onChange={(e) => setRewardTokenAddress(e.target.value)}
            placeholder="Token address"
            className="md:col-span-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 md:px-4 md:py-3 text-white text-sm"
          />
          <input
            type="text"
            value={rewardAmount}
            onChange={(e) => setRewardAmount(e.target.value)}
            placeholder="Amount"
            className="md:col-span-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 md:px-4 md:py-3 text-white text-sm"
          />
          <button 
            onClick={handleCreditReward}
            disabled={isPending || isProcessing}
            className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-500 px-4 py-3 rounded-lg font-bold transition-all"
          >
            {isPending || isProcessing ? '⏳' : 'Credit'}
          </button>
        </div>
        <p className="text-xs text-green-300 mt-2">
          💡 Manually credit any token reward to any player. Player can claim later.
        </p>
      </div>

      {/* Sync Token Metadata to API/Farcaster */}
      <div className="pt-6 border-t border-white/10">
        <label className="block text-xs md:text-sm text-cyan-200 mb-2">📡 Sync to Farcaster (API)</label>
        <button 
          onClick={async () => {
            try {
              console.log('🔄 Syncing all token metadata to API...')
              const saved = localStorage.getItem('joybit_token_images')
              if (!saved) {
                alert('❌ No token metadata found in localStorage')
                return
              }
              
              const allTokens = JSON.parse(saved)
              console.log('📦 Token metadata to sync:', allTokens)
              
              // Sync each token to API
              for (const [address, metadata] of Object.entries(allTokens)) {
                const { image, symbol } = metadata as { image: string; symbol: string }
                console.log(`📡 Syncing ${address}:`, { image, symbol })
                
                const response = await fetch('/api/token-metadata', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ address, image, symbol })
                })
                
                if (response.ok) {
                  console.log(`✅ Synced ${address}`)
                } else {
                  console.error(`❌ Failed to sync ${address}`)
                }
              }
              
              alert('✅ Token metadata synced to API! Farcaster users will now see images and names.')
            } catch (error) {
              console.error('❌ Sync failed:', error)
              alert('❌ Sync failed. Check console for details.')
            }
          }}
          className="w-full bg-cyan-600 hover:bg-cyan-700 px-4 py-3 rounded-lg font-bold transition-all"
        >
          🔄 Sync Token Metadata to Farcaster
        </button>
        <p className="text-xs text-gray-400 mt-2">
          💡 Click this to push all token images and names from your browser to the API so Farcaster users can see them.
        </p>
      </div>
    </motion.div>
  )
}

// Leaderboard Rewards Section
function LeaderboardRewardsSection() {
  const [rewardEntries, setRewardEntries] = useState([{ address: '', amount: '' }])
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false)
  const [leaderboardData, setLeaderboardData] = useState<Array<{address: string, score: number}>>([])
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(-1)

  const { writeContractAsync: creditReward, isPending } = useWriteContract()
  const { isLoading: isProcessing, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  useEffect(() => {
    if (isSuccess && currentProcessingIndex >= 0) {
      // Process next reward if there are more
      const nextIndex = currentProcessingIndex + 1
      if (nextIndex < rewardEntries.length) {
        setCurrentProcessingIndex(nextIndex)
        processNextReward(nextIndex)
      } else {
        // All rewards processed
        setCurrentProcessingIndex(-1)
        alert('✅ All leaderboard rewards credited successfully!')
        setRewardEntries([{ address: '', amount: '' }])
      }
    }
  }, [isSuccess, currentProcessingIndex, rewardEntries])

  const fetchTopPlayers = async () => {
    setIsLoadingLeaderboard(true)
    try {
      const response = await fetch('/api/leaderboard')
      const data = await response.json()

      if (data.leaderboard && data.leaderboard.length > 0) {
        // Get top 10 players
        const top10 = data.leaderboard.slice(0, 10)
        setLeaderboardData(top10)

        // Auto-populate reward entries with addresses
        const entries = top10.map((player: {address: string, score: number}, index: number) => ({
          address: player.address,
          amount: getDefaultRewardAmount(index + 1) // Position 1-10
        }))
        setRewardEntries(entries)
      } else {
        alert('❌ No leaderboard data found')
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      alert('❌ Failed to fetch leaderboard data')
    } finally {
      setIsLoadingLeaderboard(false)
    }
  }

  const getDefaultRewardAmount = (position: number): string => {
    // Default reward amounts based on position
    const rewards = {
      1: '1000',   // 1st place
      2: '750',    // 2nd place
      3: '500',    // 3rd place
      4: '300',    // 4th place
      5: '200',    // 5th place
      6: '150',    // 6th place
      7: '100',    // 7th place
      8: '75',     // 8th place
      9: '50',     // 9th place
      10: '25'     // 10th place
    }
    return rewards[position as keyof typeof rewards] || '10'
  }

  const processNextReward = async (index: number) => {
    const entry = rewardEntries[index]
    if (!entry.address || !entry.amount) return

    try {
      const hash = await creditReward({
        address: CONTRACT_ADDRESSES.treasury,
        abi: TREASURY_ABI,
        functionName: 'creditReward',
        args: [
          entry.address as `0x${string}`,
          CONTRACT_ADDRESSES.joybitToken,
          parseEther(entry.amount)
        ],
      })
      setTxHash(hash)
    } catch (error) {
      console.error(`Error crediting reward for ${entry.address}:`, error)
      alert(`❌ Failed to credit reward for player #${index + 1}`)
      setCurrentProcessingIndex(-1)
    }
  }

  const addRewardEntry = () => {
    setRewardEntries([...rewardEntries, { address: '', amount: '' }])
  }

  const removeRewardEntry = (index: number) => {
    setRewardEntries(rewardEntries.filter((_, i) => i !== index))
  }

  const updateRewardEntry = (index: number, field: 'address' | 'amount', value: string) => {
    const updated = [...rewardEntries]
    updated[index][field] = value
    setRewardEntries(updated)
  }

  const handleCreditRewards = async () => {
    const validEntries = rewardEntries.filter(e => e.address && e.amount)

    if (validEntries.length === 0) {
      alert('❌ Enter valid addresses and amounts')
      return
    }

    // Start processing from first reward
    setCurrentProcessingIndex(0)
    await processNextReward(0)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-6"
    >
      <h2 className="text-2xl font-bold mb-4">🏆 Leaderboard Rewards</h2>
      <p className="text-sm text-gray-300 mb-4">
        Credit JOYB rewards to top leaderboard players (they can claim later)
      </p>

      {/* Fetch Top Players Button */}
      <div className="mb-4">
        <button
          onClick={fetchTopPlayers}
          disabled={isLoadingLeaderboard}
          className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-500 px-6 py-3 rounded-lg font-bold transition-all mr-4"
        >
          {isLoadingLeaderboard ? '⏳ Loading...' : '📊 Load Top 10 Players'}
        </button>
        {leaderboardData.length > 0 && (
          <span className="text-sm text-green-400">
            ✅ Loaded {leaderboardData.length} players from leaderboard
          </span>
        )}
      </div>

      <div className="space-y-3 mb-4">
        {rewardEntries.map((entry, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-1 text-center">
              <span className={`font-bold ${currentProcessingIndex === index ? 'text-yellow-400 animate-pulse' : 'text-yellow-400'}`}>
                #{index + 1}
              </span>
            </div>
            <input
              type="text"
              value={entry.address}
              onChange={(e) => updateRewardEntry(index, 'address', e.target.value)}
              placeholder="Player address (0x...)"
              className="col-span-6 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white text-sm"
            />
            <input
              type="text"
              value={entry.amount}
              onChange={(e) => updateRewardEntry(index, 'amount', e.target.value)}
              placeholder="JOYB amount"
              className="col-span-3 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white text-sm"
            />
            <button
              onClick={() => removeRewardEntry(index)}
              disabled={rewardEntries.length === 1}
              className="col-span-2 bg-red-500/20 hover:bg-red-500/40 disabled:bg-gray-500/20 border border-red-500/50 rounded-lg text-red-300 font-bold"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={addRewardEntry}
          className="bg-yellow-600/30 hover:bg-yellow-600/50 border border-yellow-500/50 px-4 py-3 rounded-lg font-bold"
        >
          + Add Player
        </button>
        <button
          onClick={handleCreditRewards}
          disabled={isPending || isProcessing || rewardEntries.length === 0 || currentProcessingIndex >= 0}
          className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-500 px-6 py-3 rounded-lg font-bold transition-all"
        >
          {currentProcessingIndex >= 0 ? `⏳ Crediting #${currentProcessingIndex + 1}...` :
           isPending ? '🔐 Confirm...' :
           isProcessing ? '⏳ Processing...' :
           'Credit Rewards'}
        </button>
      </div>

      <p className="text-xs text-yellow-300 mt-4">
        💡 Credits rewards to player profiles - they can claim later from their profile page
      </p>
    </motion.div>
  )
}

// Multi-Token Leaderboard Rewards Section
function MultiTokenLeaderboardRewardsSection() {
  const [multiTokenRewards, setMultiTokenRewards] = useState([{ address: '', tokenAddress: '', amount: '' }])
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false)
  const [leaderboardData, setLeaderboardData] = useState<Array<{address: string, score: number}>>([])
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(-1)
  const [tokenImages, setTokenImages] = useState<Record<string, { image: string; symbol: string }>>({})
  
  const { writeContractAsync: creditReward, isPending } = useWriteContract()
  const { isLoading: isProcessing, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const { data: supportedTokens } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury,
    abi: TREASURY_ABI,
    functionName: 'getSupportedTokens',
  })

  // Load token images
  useEffect(() => {
    const loadTokenImages = async () => {
      const saved = localStorage.getItem('joybit_token_images')
      if (saved) {
        setTokenImages(JSON.parse(saved))
      }
      
      try {
        const response = await fetch('/api/token-metadata')
        if (response.ok) {
          const data = await response.json()
          setTokenImages(prev => ({ ...data, ...prev }))
        }
      } catch (error) {
        console.error('Failed to load token metadata from API:', error)
      }
    }
    
    loadTokenImages()
  }, [])

  useEffect(() => {
    if (isSuccess && currentProcessingIndex >= 0) {
      const sendNotificationForReward = async () => {
        const entry = multiTokenRewards[currentProcessingIndex]
        if (entry && entry.address && entry.tokenAddress && entry.amount) {
          const tokenData = tokenImages[entry.tokenAddress.toLowerCase()]
          const tokenSymbol = tokenData?.symbol || (entry.tokenAddress.toLowerCase() === CONTRACT_ADDRESSES.joybitToken.toLowerCase() ? 'JOYB' : 'tokens')

          // Send notification to the rewarded player
          await notifyAdminReward(entry.amount, tokenSymbol)
        }
      }

      // Process next reward if there are more
      const nextIndex = currentProcessingIndex + 1
      if (nextIndex < multiTokenRewards.length) {
        setCurrentProcessingIndex(nextIndex)
        processNextMultiTokenReward(nextIndex)
      } else {
        // All rewards processed
        setCurrentProcessingIndex(-1)
        alert('✅ All multi-token leaderboard rewards credited successfully!')
        setMultiTokenRewards([{ address: '', tokenAddress: '', amount: '' }])
      }

      // Send notification for the completed reward
      sendNotificationForReward()
    }
  }, [isSuccess, currentProcessingIndex, multiTokenRewards, tokenImages])

  const fetchTopPlayers = async () => {
    setIsLoadingLeaderboard(true)
    try {
      const response = await fetch('/api/leaderboard')
      const data = await response.json()
      
      if (data.leaderboard && data.leaderboard.length > 0) {
        // Get top 10 players
        const top10 = data.leaderboard.slice(0, 10)
        setLeaderboardData(top10)
        
        // Auto-populate with default JOYB rewards (can be changed to other tokens)
        const entries = top10.map((player: {address: string, score: number}, index: number) => ({
          address: player.address,
          tokenAddress: CONTRACT_ADDRESSES.joybitToken || '',
          amount: getDefaultRewardAmount(index + 1)
        }))
        setMultiTokenRewards(entries)
      } else {
        alert('❌ No leaderboard data found')
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      alert('❌ Failed to fetch leaderboard data')
    } finally {
      setIsLoadingLeaderboard(false)
    }
  }

  const getDefaultRewardAmount = (position: number): string => {
    // Default reward amounts based on position
    const rewards = {
      1: '1000',   // 1st place
      2: '750',    // 2nd place  
      3: '500',    // 3rd place
      4: '300',    // 4th place
      5: '200',    // 5th place
      6: '150',    // 6th place
      7: '100',    // 7th place
      8: '75',     // 8th place
      9: '50',     // 9th place
      10: '25'     // 10th place
    }
    return rewards[position as keyof typeof rewards] || '10'
  }

  const processNextMultiTokenReward = async (index: number) => {
    const entry = multiTokenRewards[index]
    if (!entry.address || !entry.tokenAddress || !entry.amount) return

    try {
      const hash = await creditReward({
        address: CONTRACT_ADDRESSES.treasury,
        abi: TREASURY_ABI,
        functionName: 'creditReward',
        args: [
          entry.address as `0x${string}`,
          entry.tokenAddress as `0x${string}`,
          parseEther(entry.amount)
        ],
      })
      setTxHash(hash)
    } catch (error) {
      console.error(`Error crediting multi-token reward for ${entry.address}:`, error)
      alert(`❌ Failed to credit reward for player #${index + 1}`)
      setCurrentProcessingIndex(-1)
    }
  }

  const addRewardEntry = () => {
    setMultiTokenRewards([...multiTokenRewards, { address: '', tokenAddress: '', amount: '' }])
  }

  const removeRewardEntry = (index: number) => {
    setMultiTokenRewards(multiTokenRewards.filter((_, i) => i !== index))
  }

  const updateRewardEntry = (index: number, field: 'address' | 'tokenAddress' | 'amount', value: string) => {
    const updated = [...multiTokenRewards]
    updated[index][field] = value
    setMultiTokenRewards(updated)
  }

  const handleCreditRewards = async () => {
    const validEntries = multiTokenRewards.filter(e => e.address && e.tokenAddress && e.amount)
    
    if (validEntries.length === 0) {
      alert('❌ Enter valid addresses, token addresses, and amounts')
      return
    }

    // Start processing from first reward
    setCurrentProcessingIndex(0)
    await processNextMultiTokenReward(0)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-6"
    >
      <h2 className="text-2xl font-bold mb-4">🪙 Multi-Token Leaderboard Rewards</h2>
      <p className="text-sm text-gray-300 mb-4">
        Credit rewards in any supported token to top leaderboard players (they can claim later)
      </p>

      {/* Fetch Top Players Button */}
      <div className="mb-4">
        <button
          onClick={fetchTopPlayers}
          disabled={isLoadingLeaderboard}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 px-6 py-3 rounded-lg font-bold transition-all mr-4"
        >
          {isLoadingLeaderboard ? '⏳ Loading...' : '📊 Load Top 10 Players'}
        </button>
        {leaderboardData.length > 0 && (
          <span className="text-sm text-green-400">
            ✅ Loaded {leaderboardData.length} players from leaderboard
          </span>
        )}
      </div>
      
      <div className="space-y-3 mb-4">
        {multiTokenRewards.map((entry, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-1 text-center">
              <span className={`font-bold ${currentProcessingIndex === index ? 'text-purple-400 animate-pulse' : 'text-purple-400'}`}>
                #{index + 1}
              </span>
            </div>
            <input
              type="text"
              value={entry.address}
              onChange={(e) => updateRewardEntry(index, 'address', e.target.value)}
              placeholder="Player address (0x...)"
              className="col-span-3 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white text-sm"
            />
            <select
              value={entry.tokenAddress}
              onChange={(e) => updateRewardEntry(index, 'tokenAddress', e.target.value)}
              className="col-span-3 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white text-sm"
            >
              <option value="">Select Token</option>
              {supportedTokens && (supportedTokens as `0x${string}`[]).map((token) => {
                const tokenData = tokenImages[token.toLowerCase()]
                return (
                  <option key={token} value={token}>
                    {tokenData?.symbol || token.slice(0, 6) + '...' + token.slice(-4)}
                  </option>
                )
              })}
            </select>
            <input
              type="text"
              value={entry.amount}
              onChange={(e) => updateRewardEntry(index, 'amount', e.target.value)}
              placeholder="Amount"
              className="col-span-3 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white text-sm"
            />
            <button
              onClick={() => removeRewardEntry(index)}
              disabled={multiTokenRewards.length === 1}
              className="col-span-2 bg-red-500/20 hover:bg-red-500/40 disabled:bg-gray-500/20 border border-red-500/50 rounded-lg text-red-300 font-bold"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={addRewardEntry}
          className="bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 px-4 py-3 rounded-lg font-bold"
        >
          + Add Player
        </button>
        <button
          onClick={handleCreditRewards}
          disabled={isPending || isProcessing || multiTokenRewards.length === 0 || currentProcessingIndex >= 0}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 px-6 py-3 rounded-lg font-bold transition-all"
        >
          {currentProcessingIndex >= 0 ? `⏳ Crediting #${currentProcessingIndex + 1}...` :
           isPending ? '🔐 Confirm...' :
           isProcessing ? '⏳ Processing...' :
           'Credit Multi-Token Rewards'}
        </button>
      </div>
      
      <p className="text-xs text-purple-300 mt-4">
        💡 Credits rewards in selected tokens to player profiles - they can claim later from their profile page
      </p>
    </motion.div>
  )
}

// Match-3 Game Section  
function Match3GameSection() {
  const [playFee, setPlayFee] = useState('')
  const [levelRewardLevel, setLevelRewardLevel] = useState('')
  const [levelRewardAmount, setLevelRewardAmount] = useState('')
  const [boosterPrices, setBoosterPrices] = useState({
    hammer: '',
    shuffle: '',
    colorBomb: '',
    hammerPack: '',
    shufflePack: '',
    colorBombPack: ''
  })
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const [pendingCompletions, setPendingCompletions] = useState<any[]>([])
  
  const { writeContractAsync: writeContract, isPending } = useWriteContract()
  const { isLoading: isProcessing, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const { data: currentFee } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game,
    abi: MATCH3_GAME_ABI,
    functionName: 'playFee',
  })

  useEffect(() => {
    if (isSuccess) {
      alert('✅ Match-3 settings updated!')
      setPlayFee('')
      setLevelRewardLevel('')
      setLevelRewardAmount('')
    }
  }, [isSuccess])

  // Load pending level completions
  useEffect(() => {
    const loadPendingCompletions = async () => {
      try {
        const response = await fetch('/api/level-completions?pending=true')
        if (response.ok) {
          const data = await response.json()
          setPendingCompletions(data)
        }
      } catch (error) {
        console.error('Failed to load pending completions:', error)
      }
    }
    loadPendingCompletions()
  }, [])

  const handleSetPlayFee = async () => {
    if (!playFee || Number(playFee) < 0) {
      alert('❌ Enter valid fee')
      return
    }
    try {
      const hash = await writeContract({
        address: CONTRACT_ADDRESSES.match3Game,
        abi: MATCH3_GAME_ABI,
        functionName: 'setPlayFee',
        args: [parseEther(playFee)],
      })
      setTxHash(hash)
    } catch (error) {
      console.error(error)
      alert('❌ Transaction rejected')
    }
  }

  const handleSetLevelReward = async () => {
    if (!levelRewardLevel || !levelRewardAmount || Number(levelRewardLevel) < 1 || Number(levelRewardLevel) > 1000) {
      alert('❌ Enter valid level (1-1000) and amount')
      return
    }
    try {
      const hash = await writeContract({
        address: CONTRACT_ADDRESSES.match3Game,
        abi: MATCH3_GAME_ABI,
        functionName: 'setLevelReward',
        args: [Number(levelRewardLevel), parseEther(levelRewardAmount)],
      })
      setTxHash(hash)
    } catch (error) {
      console.error(error)
      alert('❌ Transaction rejected')
    }
  }

  const handleSetBoosterPrices = async () => {
    const { hammer, shuffle, colorBomb, hammerPack, shufflePack, colorBombPack } = boosterPrices
    if (!hammer || !shuffle || !colorBomb || !hammerPack || !shufflePack || !colorBombPack) {
      alert('❌ Enter all booster prices')
      return
    }
    try {
      const hash = await writeContract({
        address: CONTRACT_ADDRESSES.match3Game,
        abi: MATCH3_GAME_ABI,
        functionName: 'setBoosterPrices',
        args: [
          parseEther(hammer),
          parseEther(shuffle),
          parseEther(colorBomb),
          parseEther(hammerPack),
          parseEther(shufflePack),
          parseEther(colorBombPack)
        ],
      })
      setTxHash(hash)
    } catch (error) {
      console.error(error)
      alert('❌ Transaction rejected')
    }
  }

  const handleDistributeRewards = async () => {
    if (pendingCompletions.length === 0) {
      alert('❌ No pending rewards to distribute')
      return
    }

    try {
      // Group completions by address for batch processing
      const addressRewards: Record<string, { totalAmount: bigint; completionIds: number[] }> = {}
      
      pendingCompletions.forEach((completion: any) => {
        const address = completion.address
        const amount = BigInt(completion.reward_amount)
        
        if (!addressRewards[address]) {
          addressRewards[address] = { totalAmount: 0n, completionIds: [] }
        }
        
        addressRewards[address].totalAmount += amount
        addressRewards[address].completionIds.push(completion.id)
      })

      // Distribute rewards for each address
      for (const [address, data] of Object.entries(addressRewards)) {
        console.log(`🎁 Distributing ${data.totalAmount} JOYB to ${address}`)
        
        const hash = await writeContract({
          address: CONTRACT_ADDRESSES.treasury,
          abi: TREASURY_ABI,
          functionName: 'creditReward',
          args: [
            address as `0x${string}`,
            CONTRACT_ADDRESSES.joybitToken as `0x${string}`,
            data.totalAmount
          ],
        })
        
        // Wait for transaction to complete
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Mark completions as distributed
        await fetch('/api/level-completions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: data.completionIds })
        })
        
        console.log(`✅ Distributed rewards to ${address}`)
      }
      
      alert(`✅ Successfully distributed rewards to ${Object.keys(addressRewards).length} players!`)
      
      // Reload pending completions
      const response = await fetch('/api/level-completions?pending=true')
      if (response.ok) {
        const data = await response.json()
        setPendingCompletions(data)
      }
      
    } catch (error) {
      console.error('Failed to distribute rewards:', error)
      alert('❌ Failed to distribute rewards')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-6"
    >
      <h2 className="text-2xl font-bold mb-4">🎮 Match-3 Game</h2>
      
      <div className="space-y-4">
        {/* Play Fee */}
        <div>
          <label className="block text-sm text-purple-200 mb-2">Paid Play Fee (ETH)</label>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              value={playFee}
              onChange={(e) => setPlayFee(e.target.value)}
              placeholder={currentFee ? formatEther(currentFee as bigint) : '0.001'}
              className="col-span-2 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white"
            />
            <button 
              onClick={handleSetPlayFee}
              disabled={isPending || isProcessing}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 px-4 py-3 rounded-lg font-bold transition-all"
            >
              {isPending || isProcessing ? '⏳' : 'Update'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Current: {currentFee ? formatEther(currentFee as bigint) : '0.0'} ETH
          </p>
        </div>

        {/* Level Rewards */}
        <div className="pt-4 border-t border-white/10">
          <label className="block text-sm text-purple-200 mb-2">Level Rewards (1-100)</label>
          <div className="grid grid-cols-5 gap-2">
            <input
              type="text"
              value={levelRewardLevel}
              onChange={(e) => setLevelRewardLevel(e.target.value)}
              placeholder="Level (1-100)"
              className="col-span-2 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white"
            />
            <input
              type="text"
              value={levelRewardAmount}
              onChange={(e) => setLevelRewardAmount(e.target.value)}
              placeholder="JOYB reward"
              className="col-span-2 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white"
            />
            <button 
              onClick={handleSetLevelReward}
              disabled={isPending || isProcessing}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 px-4 py-3 rounded-lg font-bold transition-all"
            >
              Set
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            💡 Set JOYB reward for each level individually
          </p>
        </div>

        {/* Booster Prices */}
        <div className="pt-4 border-t border-white/10">
          <label className="block text-sm text-purple-200 mb-2">Booster Prices (ETH)</label>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <input
              type="text"
              value={boosterPrices.hammer}
              onChange={(e) => setBoosterPrices({...boosterPrices, hammer: e.target.value})}
              placeholder="Hammer (single)"
              className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white text-sm"
            />
            <input
              type="text"
              value={boosterPrices.shuffle}
              onChange={(e) => setBoosterPrices({...boosterPrices, shuffle: e.target.value})}
              placeholder="Shuffle (single)"
              className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white text-sm"
            />
            <input
              type="text"
              value={boosterPrices.colorBomb}
              onChange={(e) => setBoosterPrices({...boosterPrices, colorBomb: e.target.value})}
              placeholder="ColorBomb (single)"
              className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white text-sm"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <input
              type="text"
              value={boosterPrices.hammerPack}
              onChange={(e) => setBoosterPrices({...boosterPrices, hammerPack: e.target.value})}
              placeholder="Hammer Pack (x5)"
              className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white text-sm"
            />
            <input
              type="text"
              value={boosterPrices.shufflePack}
              onChange={(e) => setBoosterPrices({...boosterPrices, shufflePack: e.target.value})}
              placeholder="Shuffle Pack (x5)"
              className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white text-sm"
            />
            <input
              type="text"
              value={boosterPrices.colorBombPack}
              onChange={(e) => setBoosterPrices({...boosterPrices, colorBombPack: e.target.value})}
              placeholder="ColorBomb Pack (x5)"
              className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white text-sm"
            />
          </div>
          <button 
            onClick={handleSetBoosterPrices}
            disabled={isPending || isProcessing}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 px-4 py-3 rounded-lg font-bold transition-all"
          >
            {isPending || isProcessing ? '⏳ Processing...' : 'Update All Booster Prices'}
          </button>
        </div>

        {/* Level Reward Distribution */}
        <div className="pt-4 border-t border-white/10">
          <label className="block text-sm text-purple-200 mb-2">🎁 Level Reward Distribution</label>
          <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
            <div className="text-sm text-gray-300 mb-2">
              Pending distributions: <span className="text-yellow-400 font-bold">{pendingCompletions.length}</span>
            </div>
            {pendingCompletions.length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {pendingCompletions.slice(0, 5).map((completion: any) => (
                  <div key={completion.id} className="text-xs bg-gray-700/50 rounded p-2">
                    <div className="flex justify-between">
                      <span>Level {completion.level}</span>
                      <span className="text-green-400">{completion.reward_amount} JOYB</span>
                    </div>
                    <div className="text-gray-400 text-[10px] mt-1">
                      {completion.address.slice(0, 6)}...{completion.address.slice(-4)}
                    </div>
                  </div>
                ))}
                {pendingCompletions.length > 5 && (
                  <div className="text-xs text-gray-400 text-center">
                    ...and {pendingCompletions.length - 5} more
                  </div>
                )}
              </div>
            )}
          </div>
          <button 
            onClick={handleDistributeRewards}
            disabled={isPending || isProcessing || pendingCompletions.length === 0}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-500 px-4 py-3 rounded-lg font-bold transition-all"
          >
            {isPending || isProcessing ? '⏳ Distributing...' : `🎁 Distribute ${pendingCompletions.length} Rewards`}
          </button>
          <p className="text-xs text-gray-400 mt-1">
            💰 Distribute pending level rewards to players via smart contract
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// Card Game Section
function CardGameSection() {
  const [playFee, setPlayFee] = useState('')
  const [winReward, setWinReward] = useState('')
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  
  const { writeContractAsync: writeContract, isPending } = useWriteContract()
  const { isLoading: isProcessing, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const { data: currentFee } = useReadContract({
    address: CONTRACT_ADDRESSES.cardGame,
    abi: CARD_GAME_ABI,
    functionName: 'playFee',
  })

  const { data: currentReward } = useReadContract({
    address: CONTRACT_ADDRESSES.cardGame,
    abi: CARD_GAME_ABI,
    functionName: 'winReward',
  })

  useEffect(() => {
    if (isSuccess) {
      alert('✅ Card Game settings updated!')
      setPlayFee('')
      setWinReward('')
    }
  }, [isSuccess])

  const handleSetPlayFee = async () => {
    if (!playFee || Number(playFee) < 0) {
      alert('❌ Enter valid fee')
      return
    }
    try {
      const hash = await writeContract({
        address: CONTRACT_ADDRESSES.cardGame,
        abi: CARD_GAME_ABI,
        functionName: 'setPlayFee',
        args: [parseEther(playFee)],
      })
      setTxHash(hash)
    } catch (error) {
      console.error(error)
      alert('❌ Transaction rejected')
    }
  }

  const handleSetWinReward = async () => {
    if (!winReward || Number(winReward) < 0) {
      alert('❌ Enter valid reward')
      return
    }
    try {
      const hash = await writeContract({
        address: CONTRACT_ADDRESSES.cardGame,
        abi: CARD_GAME_ABI,
        functionName: 'setWinReward',
        args: [parseEther(winReward)],
      })
      setTxHash(hash)
    } catch (error) {
      console.error(error)
      alert('❌ Transaction rejected')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-pink-500/20 border border-pink-500/30 rounded-xl p-6"
    >
      <h2 className="text-2xl font-bold mb-4">🃏 Card Game</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-pink-200 mb-2">Play Fee (ETH)</label>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              value={playFee}
              onChange={(e) => setPlayFee(e.target.value)}
              placeholder={currentFee ? formatEther(currentFee as bigint) : '0.002'}
              className="col-span-2 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white"
            />
            <button 
              onClick={handleSetPlayFee}
              disabled={isPending || isProcessing}
              className="bg-pink-600 hover:bg-pink-700 disabled:bg-gray-500 px-4 py-3 rounded-lg font-bold transition-all"
            >
              {isPending || isProcessing ? '⏳' : 'Set'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Current: {currentFee ? formatEther(currentFee as bigint) : '0.0'} ETH
          </p>
        </div>

        <div>
          <label className="block text-sm text-pink-200 mb-2">Win Reward (JOYB)</label>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              value={winReward}
              onChange={(e) => setWinReward(e.target.value)}
              placeholder={currentReward ? formatEther(currentReward as bigint) : '100'}
              className="col-span-2 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white"
            />
            <button 
              onClick={handleSetWinReward}
              disabled={isPending || isProcessing}
              className="bg-pink-600 hover:bg-pink-700 disabled:bg-gray-500 px-4 py-3 rounded-lg font-bold transition-all"
            >
              {isPending || isProcessing ? '⏳' : 'Set'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Current: {currentReward ? formatEther(currentReward as bigint) : '0'} JOYB
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// Daily Claim Section
function DailyClaimSection() {
  const [baseReward, setBaseReward] = useState('')
  const [streakBonus, setStreakBonus] = useState('')
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  
  const { writeContractAsync: writeContract, isPending } = useWriteContract()
  const { isLoading: isProcessing, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const { data: currentBase } = useReadContract({
    address: CONTRACT_ADDRESSES.dailyClaim,
    abi: DAILY_CLAIM_ABI,
    functionName: 'baseReward',
  })

  const { data: currentBonus } = useReadContract({
    address: CONTRACT_ADDRESSES.dailyClaim,
    abi: DAILY_CLAIM_ABI,
    functionName: 'streakBonus',
  })

  useEffect(() => {
    if (isSuccess) {
      alert('✅ Daily Claim settings updated!')
      setBaseReward('')
      setStreakBonus('')
    }
  }, [isSuccess])

  const handleSetBaseReward = async () => {
    if (!baseReward || Number(baseReward) < 0) {
      alert('❌ Enter valid reward')
      return
    }
    try {
      const hash = await writeContract({
        address: CONTRACT_ADDRESSES.dailyClaim,
        abi: DAILY_CLAIM_ABI,
        functionName: 'setBaseReward',
        args: [parseEther(baseReward)],
      })
      setTxHash(hash)
    } catch (error) {
      console.error(error)
      alert('❌ Transaction rejected')
    }
  }

  const handleSetStreakBonus = async () => {
    if (!streakBonus || Number(streakBonus) < 0) {
      alert('❌ Enter valid bonus')
      return
    }
    try {
      const hash = await writeContract({
        address: CONTRACT_ADDRESSES.dailyClaim,
        abi: DAILY_CLAIM_ABI,
        functionName: 'setStreakBonus',
        args: [parseEther(streakBonus)],
      })
      setTxHash(hash)
    } catch (error) {
      console.error(error)
      alert('❌ Transaction rejected')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-green-500/20 border border-green-500/30 rounded-xl p-6"
    >
      <h2 className="text-2xl font-bold mb-4">📅 Daily Claim</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-green-200 mb-2">Base Reward (JOYB)</label>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              value={baseReward}
              onChange={(e) => setBaseReward(e.target.value)}
              placeholder={currentBase ? formatEther(currentBase as bigint) : '100'}
              className="col-span-2 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white"
            />
            <button 
              onClick={handleSetBaseReward}
              disabled={isPending || isProcessing}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 px-4 py-3 rounded-lg font-bold transition-all"
            >
              {isPending || isProcessing ? '⏳' : 'Set'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Current: {currentBase ? formatEther(currentBase as bigint) : '0'} JOYB
          </p>
        </div>

        <div>
          <label className="block text-sm text-green-200 mb-2">Streak Bonus (JOYB/day)</label>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              value={streakBonus}
              onChange={(e) => setStreakBonus(e.target.value)}
              placeholder={currentBonus ? formatEther(currentBonus as bigint) : '10'}
              className="col-span-2 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white"
            />
            <button 
              onClick={handleSetStreakBonus}
              disabled={isPending || isProcessing}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 px-4 py-3 rounded-lg font-bold transition-all"
            >
              {isPending || isProcessing ? '⏳' : 'Set'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Current: {currentBonus ? formatEther(currentBonus as bigint) : '0'} JOYB per streak day
          </p>
        </div>
      </div>
      
      <p className="text-xs text-green-300 mt-4">
        💡 Total reward = Base + (Streak × Bonus). Streak continues if claimed within 48h.
      </p>
    </motion.div>
  )
}

// Contract Addresses
function ContractAddresses() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-500/20 border border-gray-500/30 rounded-xl p-6"
    >
      <h2 className="text-2xl font-bold mb-4">📋 Contract Addresses</h2>
      <div className="space-y-2 text-sm font-mono">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Treasury:</span>
          <span className="text-blue-300">{CONTRACT_ADDRESSES.treasury}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Match3Game:</span>
          <span className="text-purple-300">{CONTRACT_ADDRESSES.match3Game}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">CardGame:</span>
          <span className="text-pink-300">{CONTRACT_ADDRESSES.cardGame}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">DailyClaim:</span>
          <span className="text-green-300">{CONTRACT_ADDRESSES.dailyClaim}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">JoybitToken:</span>
          <span className="text-yellow-300">{CONTRACT_ADDRESSES.joybitToken}</span>
        </div>
      </div>
    </motion.div>
  )
}
