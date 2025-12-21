'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface LogoProps {
  size?: 'small' | 'medium' | 'large'
  clickable?: boolean
  showText?: boolean
}

export function Logo({ size = 'medium', clickable = false, showText = true }: LogoProps) {
  const router = useRouter()
  
  const sizeMap = {
    small: 52,
    medium: 68,
    large: 84,
  }
  
  const textSizes = {
    small: 'text-lg',
    medium: 'text-2xl',
    large: 'text-4xl',
  }

  const handleClick = () => {
    if (clickable) {
      router.push('/')
    }
  }

  return (
    <div 
      className={`flex items-center gap-3 ${clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
      onClick={handleClick}
    >
      <Image 
        src="/logo.png" 
        alt="Joybit Logo" 
        width={sizeMap[size]}
        height={sizeMap[size]}
        className="rounded-lg"
        priority
      />
      {showText && (
        <span className={`${textSizes[size]} font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500`}>
          JOYBIT
        </span>
      )}
    </div>
  )
}
