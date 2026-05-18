import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'
import { AudioProvider } from '@/components/audio/AudioContext'
import { SplashScreen } from '@/components/SplashScreen'
import { ThemeProvider } from '@/components/theme/ThemeContext'

export const metadata: Metadata = {
  metadataBase: new URL('https://joybit.vercel.app'),
  title: 'Joybit - Match-3 Game',
  description: 'Play Match-3, compete on the leaderboard, and earn JOYB rewards.',
  icons: {
    icon: '/branding/favicon.ico',
  },
  openGraph: {
    title: 'Joybit - Match-3 Gaming',
    description: 'Play Match-3, compete on the leaderboard, and earn JOYB rewards.',
    url: 'https://joybit.vercel.app',
    siteName: 'Joybit',
    images: [
      {
        url: 'https://joybit.vercel.app/frame3.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Joybit - Match-3',
    description: 'Play Match-3, compete on the leaderboard, and earn JOYB rewards.',
    images: ['https://joybit.vercel.app/frame3.png'],
  },
  other: {
    'talentapp:project_verification': '8fd1a32bcb3eb97a26378ecc625b52332b7c8d598ae0a25620a80f206d91891d54bf5d27e3c237fe9eb7a98ca7c2209fc192976e8a45415374baa73eace62608',
    'fc:miniapp': JSON.stringify({
      version: "1",
      imageUrl: "https://joybit.vercel.app/frame3.png",
      button: {
        title: "🎮 Play Joybit",
        action: {
          type: "launch_miniapp",
          name: "Joybit",
          url: "https://joybit.vercel.app",
          splashImageUrl: "https://joybit.vercel.app/frame3.png",
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
      <body>
        <SplashScreen />
        <ThemeProvider>
          <Providers>
            <AudioProvider>
              {children}
            </AudioProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
