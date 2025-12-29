/**
 * Utility functions for fetching Farcaster user data
 */

export interface FarcasterUser {
  fid: number
  username: string
  displayName: string
  pfp: string
  bio: string
  address: string
}

/**
 * Fetch Farcaster user profile by address
 */
export async function fetchFarcasterUserByAddress(address: string): Promise<FarcasterUser | null> {
  try {
    // Use Farcaster's API to get user by address
    // First, we need to get the FID from the address
    const addressResponse = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`, {
      headers: {
        'accept': 'application/json',
        // Note: In production, you should use your own Neynar API key
        // For now, we'll use a public endpoint or handle gracefully
      }
    })

    if (!addressResponse.ok) {
      console.warn('Failed to fetch user by address:', addressResponse.status)
      return null
    }

    const addressData = await addressResponse.json()

    if (!addressData.users || addressData.users.length === 0) {
      console.log('No Farcaster user found for address:', address)
      return null
    }

    const user = addressData.users[0]

    return {
      fid: user.fid,
      username: user.username,
      displayName: user.display_name || user.username,
      pfp: user.pfp_url,
      bio: user.profile?.bio?.text || '',
      address: address.toLowerCase()
    }
  } catch (error) {
    console.error('Error fetching Farcaster user by address:', error)
    return null
  }
}

/**
 * Fetch Farcaster user profile by FID
 */
export async function fetchFarcasterUserByFID(fid: number): Promise<FarcasterUser | null> {
  try {
    const response = await fetch(`https://api.neynar.com/v2/farcaster/user?fid=${fid}`, {
      headers: {
        'accept': 'application/json',
      }
    })

    if (!response.ok) {
      console.warn('Failed to fetch user by FID:', response.status)
      return null
    }

    const data = await response.json()
    const user = data.user

    return {
      fid: user.fid,
      username: user.username,
      displayName: user.display_name || user.username,
      pfp: user.pfp_url,
      bio: user.profile?.bio?.text || '',
      address: user.verified_addresses?.eth_addresses?.[0] || ''
    }
  } catch (error) {
    console.error('Error fetching Farcaster user by FID:', error)
    return null
  }
}

/**
 * Get user profile data with fallback to default values
 */
export async function getUserProfile(address: string): Promise<{
  username: string
  displayName: string
  profilePicture: string
  bio: string
}> {
  const farcasterUser = await fetchFarcasterUserByAddress(address)

  if (farcasterUser) {
    return {
      username: farcasterUser.username,
      displayName: farcasterUser.displayName,
      profilePicture: farcasterUser.pfp,
      bio: farcasterUser.bio
    }
  }

  // Fallback for users not found on Farcaster
  return {
    username: `${address.slice(0, 6)}...${address.slice(-4)}`,
    displayName: `User ${address.slice(0, 6)}...${address.slice(-4)}`,
    profilePicture: '', // Could use a default avatar
    bio: ''
  }
}