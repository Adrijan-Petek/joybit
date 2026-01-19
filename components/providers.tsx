'use client'

import { ReactNode } from 'react'
import { WagmiProvider, http, createStorage, cookieStorage, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, darkTheme, connectorsForWallets } from '@rainbow-me/rainbowkit'
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'
import { metaMaskWallet, rainbowWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets'
import '@rainbow-me/rainbowkit/styles.css'
import { ThemeProvider } from './theme/ThemeContext'

const getBaseRpcUrl = () => {
  const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
  const alchemyRpc = alchemyKey ? `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}` : null
  const envRpc = process.env.NEXT_PUBLIC_BASE_RPC_URL
  const defaultRpc = 'https://mainnet.base.org'

  // Prefer a dedicated RPC when available to avoid public endpoint rate limits.
  return alchemyRpc ?? envRpc ?? defaultRpc
}
// Polyfill indexedDB for server-side rendering
if (typeof window === 'undefined') {
  (global as any).indexedDB = {
    open: () => ({
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: {
        createObjectStore: () => ({} as any),
        transaction: () => ({
          objectStore: () => ({
            put: () => ({} as any),
            get: () => ({} as any),
            delete: () => ({} as any),
          } as any),
        } as any),
      } as any,
    }),
    deleteDatabase: () => ({} as any),
  } as any
}
const rainbowKitConnectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        metaMaskWallet,
        rainbowWallet,
        walletConnectWallet,
      ],
    },
  ],
  {
    appName: 'Joybit',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '3e40339a23a18ccd2e115f9b0c0c8324',
  }
)

const config = createConfig({
  chains: [base],
  connectors: [
    ...rainbowKitConnectors,
    miniAppConnector()
  ],
  transports: {
    [base.id]: http(getBaseRpcUrl(), {
      batch: {
        wait: 100, // Batch requests every 100ms
      },
      retryCount: 3,
      retryDelay: 1000, // 1 second between retries
      timeout: 10000, // 10 second timeout
    }),
  },
  ssr: false, // Disable SSR to avoid indexedDB issues
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false, // Reduce reconnection refetches
      retry: 1,
      staleTime: 1000 * 60 * 10, // 10 minutes (increased)
      gcTime: 1000 * 60 * 30, // 30 minutes (increased)
      refetchInterval: false, // Disable automatic polling
    },
  },
})

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config} reconnectOnMount={true}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RainbowKitProvider 
          theme={darkTheme({
            accentColor: '#ee3dff',
            accentColorForeground: 'white',
            borderRadius: 'medium',
          })}
          modalSize="compact"
          showRecentTransactions={true}
          coolMode={true}
          appInfo={{
            appName: 'Joybit',
          }}
          initialChain={base}
        >
          {children}
        </RainbowKitProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
