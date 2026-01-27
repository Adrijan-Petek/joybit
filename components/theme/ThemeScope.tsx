'use client'

import { usePathname } from 'next/navigation'

export function ThemeScope({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isBasebound = pathname?.startsWith('/basebound')

  return (
    <div className={isBasebound ? 'basebound-scope' : 'theme-scope'}>
      {children}
    </div>
  )
}
