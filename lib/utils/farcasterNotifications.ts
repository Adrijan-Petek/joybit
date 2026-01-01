export interface NotificationOptions {
  title: string
  body: string
  icon?: string
  url?: string
}

export interface NotificationOptions {
  title: string
  body: string
  icon?: string
  url?: string
}

/**
 * Send a notification to the user via Farcaster
 * Uses server-side notification API since client-side notifications don't exist in SDK
 */
export async function sendFarcasterNotification(options: NotificationOptions): Promise<boolean> {
  try {
    const { sdk } = await import('@farcaster/miniapp-sdk')

    // Check if we're in a Farcaster mini app context
    if (!await sdk.isInMiniApp()) {
      console.log('🔔 Farcaster Notification (not in mini app context):', {
        title: options.title,
        body: options.body,
        icon: options.icon,
        url: options.url
      })
      return false
    }

    // Get user context to get FID
    const context = await sdk.context
    if (!context.user?.fid) {
      console.log('❌ No user FID available for notification')
      return false
    }

    // Send notification via server-side API
    try {
      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fid: context.user.fid,
          title: options.title,
          body: options.body,
          targetUrl: options.url ? `${typeof window !== 'undefined' ? window.location.origin : ''}${options.url}` : (typeof window !== 'undefined' ? window.location.href : ''),
          notificationId: `joybit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Farcaster notification sent via API:', options.title)
        return result.success
      } else {
        const error = await response.json()
        console.log('❌ Server-side notification failed:', error.error)
        return false
      }
    } catch (apiError) {
      console.log('❌ API call failed:', apiError instanceof Error ? apiError.message : String(apiError))
      return false
    }

  } catch (error) {
    console.error('❌ Failed to send Farcaster notification:', error)
    // Fallback to console logging if notification fails
    console.log('🔔 Farcaster Notification (fallback):', {
      title: options.title,
      body: options.body,
      icon: options.icon,
      url: options.url
    })
    return false
  }
}

/**
 * Send notification when user receives rewards to claim
 */
export async function notifyRewardAvailable(amount: string, tokenSymbol: string = 'JOYB'): Promise<boolean> {
  return sendFarcasterNotification({
    title: '🎉 Rewards Available!',
    body: `You have ${amount} ${tokenSymbol} ready to claim in Joybit!`,
    icon: '/branding/logo.png',
    url: '/profile'
  })
}

/**
 * Send notification for announcements
 */
export async function notifyAnnouncement(title: string, message: string): Promise<boolean> {
  return sendFarcasterNotification({
    title: `📢 ${title}`,
    body: message,
    icon: '/branding/logo.png',
    url: '/'
  })
}

/**
 * Send notification to encourage playing games
 */
export async function notifyPlayGame(gameName: string = 'Match-3'): Promise<boolean> {
  return sendFarcasterNotification({
    title: '🎮 Time to Play!',
    body: `Earn JOYB tokens by playing ${gameName} in Joybit!`,
    icon: '/branding/logo.png',
    url: '/game'
  })
}

/**
 * Send notification for daily rewards
 */
export async function notifyDailyReward(amount: string): Promise<boolean> {
  return sendFarcasterNotification({
    title: '🎁 Daily Reward Ready!',
    body: `Your daily ${amount} JOYB reward is available to claim!`,
    icon: '/branding/logo.png',
    url: '/daily-claim'
  })
}

/**
 * Send notification for leaderboard updates
 */
export async function notifyLeaderboardUpdate(position: number, score: number): Promise<boolean> {
  return sendFarcasterNotification({
    title: '🏆 Leaderboard Update!',
    body: `You're now #${position} on the leaderboard with ${score} points!`,
    icon: '/branding/logo.png',
    url: '/leaderboard'
  })
}

/**
 * Send notification for admin rewards
 */
export async function notifyAdminReward(amount: string, tokenSymbol: string): Promise<boolean> {
  return sendFarcasterNotification({
    title: '💰 Admin Reward!',
    body: `You've received ${amount} ${tokenSymbol} from the admin!`,
    icon: '/branding/logo.png',
    url: '/profile'
  })
}