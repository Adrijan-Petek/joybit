import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { AudioProvider } from '@/components/audio/AudioContext'
import { SplashScreen } from '@/components/SplashScreen'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Joybit - Match-3 Game on Base',
  description: 'Play Match-3 games, earn JOYB tokens on Base blockchain! Compete in card battles and claim daily rewards. Built on Base (bc_sf53xjf3).',
  icons: {
    icon: '/branding/favicon.ico',
  },
  openGraph: {
    title: 'Joybit - Blockchain Gaming on Base',
    description: 'Play, earn, and win JOYB tokens in Match-3 games. Built on Base (bc_sf53xjf3).',
    url: 'https://joybit.vercel.app',
    siteName: 'Joybit',
    images: [
      {
        url: '/branding/logo.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Joybit - Match-3 on Base',
    description: 'Play Match-3 games and earn JOYB tokens on Base blockchain. Built on Base (bc_sf53xjf3).',
    images: ['/branding/logo.png'],
  },
  other: {
    'fc:miniapp': JSON.stringify({
      version: "1",
      imageUrl: "https://joybit.vercel.app/branding/logo.png",
      button: {
        title: "🎮 Play Joybit",
        action: {
          type: "launch_miniapp",
          name: "Joybit",
          url: "https://joybit.vercel.app",
          splashImageUrl: "https://joybit.vercel.app/branding/logo.png",
          splashBackgroundColor: "#000000"
        }
      }
    })
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SplashScreen />
        <Providers>
          <AudioProvider>
            {children}
          </AudioProvider>
        </Providers>
      </body>
    </html>
  )
}
