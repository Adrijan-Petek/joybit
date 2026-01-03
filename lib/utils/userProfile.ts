// Utility functions for generating user profiles (usernames and avatars)
const adjectives = [
  'Cosmic', 'Mystic', 'Neon', 'Quantum', 'Cyber', 'Digital', 'Pixel', 'Retro', 'Future', 'Galactic',
  'Electric', 'Plasma', 'Void', 'Stellar', 'Nova', 'Comet', 'Meteor', 'Astro', 'Nebula', 'Photon',
  'Laser', 'Hologram', 'Matrix', 'Vector', 'Byte', 'Data', 'Code', 'Binary', 'Hex', 'Cache',
  'Flux', 'Pulse', 'Wave', 'Echo', 'Shadow', 'Ghost', 'Phantom', 'Specter', 'Wraith', 'Spirit'
]

const nouns = [
  'Warrior', 'Ninja', 'Samurai', 'Knight', 'Mage', 'Wizard', 'Druid', 'Ranger', 'Paladin', 'Rogue',
  'Archer', 'Berserker', 'Monk', 'Bard', 'Sorcerer', 'Necromancer', 'Alchemist', 'Artificer', 'Summoner', 'Shaman',
  'Hunter', 'Guardian', 'Sentinel', 'Defender', 'Champion', 'Hero', 'Legend', 'Master', 'Lord', 'King',
  'Queen', 'Prince', 'Princess', 'Emperor', 'Empress', 'Overlord', 'Conqueror', 'Destroyer', 'Annihilator', 'Titan'
]

const colors = [
  'FF6B6B', '4ECDC4', '45B7D1', '96CEB4', 'FFEAA7', 'DDA0DD', '98D8C8', 'F7DC6F', 'BB8FCE', '85C1E9',
  'F8C471', '82E0AA', 'F1948A', '85C1E9', 'D7BDE2', 'AED6F1', 'A3E4D7', 'F9E79F', 'D2B4DE', 'A9DFBF'
]

// Generate a random username
export function generateUsername(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const number = Math.floor(Math.random() * 9999) + 1
  return `${adjective}${noun}${number}`
}

// Generate a random avatar (gradient background with initials)
export function generateAvatar(username: string): string {
  const color1 = colors[Math.floor(Math.random() * colors.length)]
  const color2 = colors[Math.floor(Math.random() * colors.length)]
  const initial = username.charAt(0).toUpperCase()

  // Create SVG avatar
  const svg = `
    <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#${color1};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#${color2};stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="32" fill="url(#grad)" />
      <text x="32" y="40" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="white">${initial}</text>
    </svg>
  `

  // Convert to data URL
  const encoded = encodeURIComponent(svg.trim())
  return `data:image/svg+xml;charset=UTF-8,${encoded}`
}

// Generate a complete user profile
export function generateUserProfile(): { username: string; avatar: string } {
  const username = generateUsername()
  const avatar = generateAvatar(username)
  return { username, avatar }
}

// Validate username (basic validation)
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || username.trim().length === 0) {
    return { valid: false, error: 'Username cannot be empty' }
  }

  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' }
  }

  if (username.length > 20) {
    return { valid: false, error: 'Username must be less than 20 characters' }
  }

  // Only allow alphanumeric characters, underscores, and hyphens
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { valid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' }
  }

  return { valid: true }
}