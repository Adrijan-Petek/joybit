'use client'

import { ReactNode } from 'react'
import { WagmiProvider, http, createStorage, cookieStorage } from 'wagmi'
import { base } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, getDefaultConfig, darkTheme } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'

const config = getDefaultConfig({
  appName: 'Joybit',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [base],
  transports: {
    [base.id]: http('https://mainnet.base.org', {
      batch: {
        wait: 100, // Batch requests every 100ms
      },
      retryCount: 3,
      retryDelay: 1000, // 1 second between retries
      timeout: 10000, // 10 second timeout
    }),
  },
  ssr: true,
  storage: createStorage({
    storage: typeof window !== 'undefined' ? window.localStorage : cookieStorage,
  }),
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
      </QueryClientProvider>
    </WagmiProvider>
  )
}
