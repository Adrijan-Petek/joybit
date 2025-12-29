'use client'

/**
 * Storage utility for Joybit that handles both regular browser and Farcaster miniapp environments
 */

interface StorageOptions {
  useMiniappStorage?: boolean
}

class JoybitStorage {
  private isMiniapp = false
  private miniappSdk: any = null

  constructor() {
    this.detectEnvironment()
  }

  private async detectEnvironment() {
    if (typeof window === 'undefined') return

    try {
      // Check if we're in a Farcaster miniapp context
      const { sdk } = await import('@farcaster/miniapp-sdk')
      this.miniappSdk = sdk

      // Try to call a method to see if we're in miniapp context
      if (sdk && typeof sdk.context === 'object') {
        this.isMiniapp = true
        console.log('🎯 Detected Farcaster miniapp environment')
      }
    } catch (error) {
      // Not in miniapp context, use regular localStorage
      this.isMiniapp = false
      console.log('🌐 Using regular browser localStorage')
    }
  }

  async getItem(key: string): Promise<string | null> {
    await this.detectEnvironment()

    if (this.isMiniapp && this.miniappSdk) {
      try {
        // Use Farcaster miniapp storage if available
        // Note: This is a placeholder - actual miniapp storage API may vary
        const result = await this.miniappSdk.storage?.get(key)
        return result || null
      } catch (error) {
        console.warn('Miniapp storage failed, falling back to localStorage:', error)
        return localStorage.getItem(key)
      }
    }

    // Regular browser localStorage
    return localStorage.getItem(key)
  }

  async setItem(key: string, value: string): Promise<void> {
    await this.detectEnvironment()

    if (this.isMiniapp && this.miniappSdk) {
      try {
        // Use Farcaster miniapp storage if available
        await this.miniappSdk.storage?.set(key, value)
      } catch (error) {
        console.warn('Miniapp storage failed, falling back to localStorage:', error)
        localStorage.setItem(key, value)
      }
    } else {
      // Regular browser localStorage
      localStorage.setItem(key, value)
    }
  }

  async removeItem(key: string): Promise<void> {
    await this.detectEnvironment()

    if (this.isMiniapp && this.miniappSdk) {
      try {
        await this.miniappSdk.storage?.remove(key)
      } catch (error) {
        console.warn('Miniapp storage failed, falling back to localStorage:', error)
        localStorage.removeItem(key)
      }
    } else {
      localStorage.removeItem(key)
    }
  }

  async clear(): Promise<void> {
    await this.detectEnvironment()

    if (this.isMiniapp && this.miniappSdk) {
      try {
        await this.miniappSdk.storage?.clear()
      } catch (error) {
        console.warn('Miniapp storage failed, falling back to localStorage:', error)
        localStorage.clear()
      }
    } else {
      localStorage.clear()
    }
  }
}

// Create a singleton instance
const joybitStorage = new JoybitStorage()

// Export convenience functions
export const getStorageItem = (key: string) => joybitStorage.getItem(key)
export const setStorageItem = (key: string, value: string) => joybitStorage.setItem(key, value)
export const removeStorageItem = (key: string) => joybitStorage.removeItem(key)
export const clearStorage = () => joybitStorage.clear()

export default joybitStorage