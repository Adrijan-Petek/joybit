'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { sdk } from '@farcaster/miniapp-sdk'
import { useAccount, useBalance, usePublicClient, useReadContract, useWriteContract } from 'wagmi'
import { erc20Abi, formatUnits, isAddress, maxUint256, parseUnits, zeroAddress } from 'viem'
import { AudioButtons } from '@/components/AudioButtons'
import { InfoModal } from '@/components/InfoModal'
import { Logo } from '@/components/Logo'
import { WalletButton } from '@/components/WalletButton'
import { useAudio } from '@/components/audio/AudioContext'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { TREASURY_ABI } from '@/lib/contracts/abis'

const quickLinks = [
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Profile', href: '/profile' },
]

const quickActions = [
  { label: 'Add Mini App', action: 'add-mini-app' },
  { label: 'Recast App', action: 'recast-app' },
]

export default function Home() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()
  const { playMusic } = useAudio()
  const [mounted, setMounted] = useState(false)
  const [logoClickCount, setLogoClickCount] = useState(0)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [miniAppBusy, setMiniAppBusy] = useState(false)
  const [userFid, setUserFid] = useState<number | null>(null)
  const [depositAmount, setDepositAmount] = useState('10')
  const [depositBusy, setDepositBusy] = useState(false)
  const [depositStatus, setDepositStatus] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('10')
  const [withdrawBusy, setWithdrawBusy] = useState(false)
  const [withdrawStatus, setWithdrawStatus] = useState('')

  const rewardTokenAddress = isAddress(CONTRACT_ADDRESSES.rewardToken)
    ? (CONTRACT_ADDRESSES.rewardToken as `0x${string}`)
    : undefined
  const treasuryAddress = isAddress(CONTRACT_ADDRESSES.treasury)
    ? (CONTRACT_ADDRESSES.treasury as `0x${string}`)
    : undefined

  const adminWalletList = (process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESSES || process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
  const adminFid = Number(process.env.NEXT_PUBLIC_ADMIN_FARCASTER_FID || '0')
  const isAuthorizedAdmin =
    (!!address && adminWalletList.includes(address.toLowerCase())) ||
    (!!userFid && adminFid > 0 && userFid === adminFid)

  const { data: walletUsdcBalance, refetch: refetchWalletUsdcBalance } = useBalance({
    address,
    token: rewardTokenAddress,
    query: {
      enabled: !!address && !!rewardTokenAddress,
    },
  })

  const { data: depositedUsdcRaw, refetch: refetchDepositedUsdc } = useReadContract({
    address: treasuryAddress || zeroAddress,
    abi: TREASURY_ABI,
    functionName: 'balances',
    args: [address || zeroAddress, rewardTokenAddress || zeroAddress],
    query: {
      enabled: !!address && !!rewardTokenAddress && !!treasuryAddress,
    },
  })

  const handleDepositUsdc = useCallback(async () => {
    if (!address || !rewardTokenAddress || !treasuryAddress) {
      setDepositStatus('Connect wallet and ensure contract addresses are configured.')
      return
    }

    try {
      setDepositBusy(true)
      setDepositStatus('Preparing USDC deposit...')

      const decimals = walletUsdcBalance?.decimals ?? 6
      const amount = parseUnits(depositAmount || '0', decimals)
      if (amount <= 0n) {
        setDepositStatus('Enter a valid deposit amount greater than 0.')
        return
      }

      if (publicClient) {
        const allowance = await publicClient.readContract({
          address: rewardTokenAddress,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address, treasuryAddress],
        })

        if (allowance < amount) {
          setDepositStatus('Approving USDC spend...')
          const approveHash = await writeContractAsync({
            address: rewardTokenAddress,
            abi: erc20Abi,
            functionName: 'approve',
            args: [treasuryAddress, maxUint256],
          })
          await publicClient.waitForTransactionReceipt({ hash: approveHash })
        }
      }

      setDepositStatus('Sending deposit transaction...')
      const depositHash = await writeContractAsync({
        address: treasuryAddress,
        abi: TREASURY_ABI,
        functionName: 'depositUSDC',
        args: [amount],
      })

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: depositHash })
      }

      await Promise.all([refetchWalletUsdcBalance(), refetchDepositedUsdc()])
      setDepositStatus('USDC deposited successfully.')
    } catch (error) {
      setDepositStatus(`Deposit failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setDepositBusy(false)
    }
  }, [address, rewardTokenAddress, treasuryAddress, walletUsdcBalance?.decimals, depositAmount, publicClient, writeContractAsync, refetchWalletUsdcBalance, refetchDepositedUsdc])

  const handleWithdrawUsdc = useCallback(async () => {
    if (!address || !rewardTokenAddress || !treasuryAddress) {
      setWithdrawStatus('Connect wallet and ensure contract addresses are configured.')
      return
    }

    try {
      setWithdrawBusy(true)
      setWithdrawStatus('Preparing USDC withdrawal...')

      const decimals = walletUsdcBalance?.decimals ?? 6
      const amount = parseUnits(withdrawAmount || '0', decimals)
      if (amount <= 0n) {
        setWithdrawStatus('Enter a valid withdrawal amount greater than 0.')
        return
      }

      setWithdrawStatus('Sending withdrawal transaction...')
      const withdrawHash = await writeContractAsync({
        address: treasuryAddress,
        abi: TREASURY_ABI,
        functionName: 'withdraw',
        args: [rewardTokenAddress, amount],
      })

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: withdrawHash })
      }

      await Promise.all([refetchWalletUsdcBalance(), refetchDepositedUsdc()])
      setWithdrawStatus('USDC withdrawn successfully.')
    } catch (error) {
      setWithdrawStatus(`Withdrawal failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setWithdrawBusy(false)
    }
  }, [address, rewardTokenAddress, treasuryAddress, walletUsdcBalance?.decimals, withdrawAmount, publicClient, writeContractAsync, refetchWalletUsdcBalance, refetchDepositedUsdc])

  const handleAddMiniApp = useCallback(async () => {
    if (miniAppBusy) return

    setMiniAppBusy(true)
    try {
      const actions = (sdk as any)?.actions
      if (actions && typeof actions.addMiniApp === 'function') {
        await actions.addMiniApp()
        return
      }

      if (typeof window !== 'undefined') {
        window.open('https://joybit.vercel.app', '_blank', 'noopener,noreferrer')
      }
    } catch (error) {
      console.log('Add Mini App not available in this context:', error)
    } finally {
      setMiniAppBusy(false)
    }
  }, [miniAppBusy])

  const handleRecastApp = useCallback(() => {
    if (typeof window === 'undefined') return

    const shareTexts = [
      '🎮 Just matched tiles in Joybit Blast! Fast gameplay, real USDC rewards, leaderboard competition on Base. Connect your wallet and start earning.',
      'Swap tiles, reach targets, climb ranks. Joybit Blast is a production-ready game on Base with instant USDC reward claims. Who\'s next?',
      '🏆 Competing on the Joybit Blast leaderboard! Match tiles in fast-paced levels to earn real USDC rewards. Built on Base with wallet integration.',
      '🎯 Joybit Blast: Match tiles → Score points → Earn USDC. Fast rounds, real rewards, leaderboard battles on Base.',
      'Just started Joybit Blast on Base. Match tiles, climb leaderboards, and claim USDC rewards instantly. Try it:',
      'Fast tile-matching + real USDC rewards + production game = Joybit Blast on Base. Connect your wallet and join the leaderboard now!'
    ]
    
    const shareText = shareTexts[Math.floor(Math.random() * shareTexts.length)]
    const frameUrl = window.location.origin
    const url = new URL('https://warpcast.com/~/compose')
    url.searchParams.set('text', shareText)
    url.searchParams.append('embeds[]', frameUrl)
    window.open(url.toString(), '_blank', 'noopener,noreferrer')
  }, [])

  useEffect(() => {
    setMounted(true)
    playMusic('main-menu')

    const init = async () => {
      try {
        const ctx = await sdk.context
        setUserFid(ctx?.user?.fid || null)
      } catch {
        setUserFid(null)
      }

      sdk.actions.ready().catch(() => {
        // Browser users are not always inside a Farcaster Mini App.
      })
    }

    init()
  }, [playMusic])

  useEffect(() => {
    if (logoClickCount < 5) return

    if (isAuthorizedAdmin) {
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem('joybit_admin_unlock', '1')
        } catch {
          // Some in-app browsers restrict storage access.
        }
      }
      router.push('/admin')
    }

    setLogoClickCount(0)
  }, [logoClickCount, isAuthorizedAdmin, router])

  if (!mounted) return null

  const tokenDecimals = walletUsdcBalance?.decimals ?? 6
  const walletUsdcValue = walletUsdcBalance?.value ?? 0n
  const depositedUsdcValue = (depositedUsdcRaw as bigint) || 0n

  return (
    <main
      className="min-h-screen overflow-hidden"
      style={{
        backgroundColor: 'var(--theme-background)',
        backgroundImage:
          'radial-gradient(70rem 32rem at 80% -8%, color-mix(in srgb, var(--theme-primary) 24%, transparent), transparent 62%), radial-gradient(52rem 28rem at -10% 100%, color-mix(in srgb, var(--theme-accent) 16%, transparent), transparent 60%)',
        color: 'var(--theme-text)'
      }}
    >
      <InfoModal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} />

      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/45 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => setLogoClickCount((count) => count + 1)}
            className="logo-button-reset flex items-center gap-2 border-0 bg-transparent p-0 shadow-none"
            aria-label="Joybit home"
          >
            <Logo size="small" />
          </button>

          <div className="flex items-center gap-2">
            <AudioButtons splitButtons />
            <WalletButton />
          </div>
        </div>
      </header>

      <button
        type="button"
        onClick={() => setShowInfoModal(true)}
        className="fixed bottom-36 right-4 z-40 flex h-10 w-10 animate-pulse items-center justify-center rounded-full border border-white/15 bg-blue-500 text-sm font-bold text-white shadow-lg md:bottom-20"
        title="How to play"
        aria-label="How to play"
      >
        i
      </button>

      <section className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 pb-20 pt-24 sm:pb-28 sm:pt-20 md:pb-10 md:pt-20">
        <div className="max-w-xl md:mx-auto md:text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-300 sm:text-base">
            Joybit Mini App
          </p>
          <h1 className="mb-4 text-xl font-black leading-tight text-white sm:text-2xl md:text-3xl">
            Match. Climb. Earn.
          </h1>
          <p className="mb-7 text-base leading-7 text-gray-300 md:text-lg">
            Connect your wallet, match tiles in fast-paced levels, and earn real USDC rewards. Climb the leaderboard in a production-ready game built on Base with instant reward claims.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row md:justify-center">
            <button
              type="button"
              onClick={() => router.push('/game')}
              className="theme-button-brand rounded-xl px-6 py-2 text-sm font-bold"
            >
              Start Playing
            </button>
            <button
              type="button"
              onClick={() => router.push('/leaderboard')}
              className="theme-button-brand-soft rounded-xl px-6 py-2 text-sm font-bold"
            >
              View Leaderboard
            </button>
          </div>



          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 sm:mt-6 lg:mt-8">
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <div className="text-xs uppercase tracking-wide text-gray-400">Wallet USDC</div>
                <div className="mt-1 text-lg font-bold text-white">{formatUnits(walletUsdcValue, tokenDecimals)} USDC</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <div className="text-xs uppercase tracking-wide text-gray-400">Deposited USDC</div>
                <div className="mt-1 text-lg font-bold text-white">{formatUnits(depositedUsdcValue, tokenDecimals)} USDC</div>
              </div>
            </div>

            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
              <div className="text-sm font-semibold text-gray-300 whitespace-nowrap">Manage Funds</div>
              
              <input
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="10"
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white w-20"
              />
              <button
                type="button"
                disabled={!isConnected || depositBusy || !rewardTokenAddress || !treasuryAddress}
                onClick={handleDepositUsdc}
                className="theme-button-brand rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50 whitespace-nowrap"
              >
                {depositBusy ? 'Depositing...' : 'Deposit'}
              </button>
              <button
                type="button"
                disabled={!isConnected || withdrawBusy || !rewardTokenAddress || !treasuryAddress}
                onClick={handleWithdrawUsdc}
                className="theme-button-brand-soft rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50 whitespace-nowrap"
              >
                {withdrawBusy ? 'Withdrawing...' : 'Withdraw'}
              </button>
            </div>

            {(depositStatus || withdrawStatus) ? (
              <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
                {depositStatus ? (
                  <div className="text-sm text-gray-300">{depositStatus}</div>
                ) : null}
                {withdrawStatus ? (
                  <div className="text-sm text-gray-300">{withdrawStatus}</div>
                ) : null}
              </div>
            ) : null}

            {/* Info Section */}
            <div className="mt-4 space-y-2 rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="text-xs font-semibold text-gray-300">📋 How it Works</div>
              <div className="text-xs text-gray-400">
                <p className="mb-1"><strong>Deposit:</strong> Transfer USDC from your wallet to treasury. Used to play games and earn rewards.</p>
                <p className="mb-1"><strong>Withdraw:</strong> Reclaim your USDC anytime. Your balance is always yours.</p>
                <p><strong>🔒 Secure:</strong> Smart contract based, non-custodial. Your funds are controlled only by you.</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/80 px-3 py-3 backdrop-blur-md md:hidden">
        <div className="grid grid-cols-2 gap-2">
          {quickLinks.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => router.push(link.href)}
              className="theme-button-brand-soft rounded-lg px-2 py-1 text-[11px] font-semibold"
            >
              {link.label}
            </button>
          ))}
          {quickActions.map((item) => (
            <button
              key={item.action}
              type="button"
              onClick={() => {
                if (item.action === 'add-mini-app') {
                  handleAddMiniApp()
                } else {
                  handleRecastApp()
                }
              }}
              disabled={item.action === 'add-mini-app' && miniAppBusy}
              className="theme-button-brand rounded-lg px-2 py-1 text-[11px] font-semibold"
            >
              {item.action === 'add-mini-app' && miniAppBusy ? 'Adding...' : item.label}
            </button>
          ))}
        </div>
      </nav>

      <nav className="fixed bottom-6 left-1/2 z-40 hidden -translate-x-1/2 rounded-xl border border-white/10 bg-black/60 p-2 backdrop-blur-md md:block">
        <div className="flex flex-wrap gap-2">
          {quickLinks.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => router.push(link.href)}
              className="theme-button-brand-soft rounded-lg px-3 py-1 text-xs font-semibold"
            >
              {link.label}
            </button>
          ))}
          {quickActions.map((item) => (
            <button
              key={item.action}
              type="button"
              onClick={() => {
                if (item.action === 'add-mini-app') {
                  handleAddMiniApp()
                } else {
                  handleRecastApp()
                }
              }}
              disabled={item.action === 'add-mini-app' && miniAppBusy}
              className="theme-button-brand rounded-lg px-3 py-1 text-xs font-semibold"
            >
              {item.action === 'add-mini-app' && miniAppBusy ? 'Adding...' : item.label}
            </button>
          ))}
        </div>
      </nav>
    </main>
  )
}
