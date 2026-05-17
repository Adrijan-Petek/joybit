'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { formatEther, isAddress, parseEther } from 'viem'
import { AudioButtons } from '@/components/AudioButtons'
import { WalletButton } from '@/components/WalletButton'
import { CONTRACT_ADDRESSES } from '@/lib/contracts/addresses'
import { MATCH3_GAME_ABI, TREASURY_ABI } from '@/lib/contracts/abis'

export default function AdminPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { writeContractAsync, isPending } = useWriteContract()

  const [mounted, setMounted] = useState(false)
  const [userFid, setUserFid] = useState<number | null>(null)
  const [isUnlocked, setIsUnlocked] = useState(false)

  const [newPlayFeeEth, setNewPlayFeeEth] = useState('0.001')
  const [newTreasuryAddress, setNewTreasuryAddress] = useState<string>(CONTRACT_ADDRESSES.treasury || '')
  const [withdrawEthAmount, setWithdrawEthAmount] = useState('0.01')
  const [withdrawTokenAmount, setWithdrawTokenAmount] = useState('10')
  const [status, setStatus] = useState('')

  const adminWalletList = (process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESSES || process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
  const adminFid = Number(process.env.NEXT_PUBLIC_ADMIN_FARCASTER_FID || '0')

  useEffect(() => {
    setMounted(true)

    if (typeof window !== 'undefined') {
      setIsUnlocked(sessionStorage.getItem('joybit_admin_unlock') === '1')
    }

    import('@farcaster/miniapp-sdk')
      .then(async ({ sdk }) => {
        try {
          const ctx = await sdk.context
          setUserFid(ctx?.user?.fid || null)
        } catch {
          setUserFid(null)
        }
      })
      .catch(() => setUserFid(null))
  }, [])

  const isAuthorized = useMemo(() => {
    const walletMatch = !!address && adminWalletList.includes(address.toLowerCase())
    const fidMatch = !!userFid && adminFid > 0 && userFid === adminFid
    return walletMatch || fidMatch
  }, [address, adminWalletList, userFid, adminFid])

  const { data: playFee, refetch: refetchPlayFee } = useReadContract({
    address: CONTRACT_ADDRESSES.match3Game,
    abi: MATCH3_GAME_ABI,
    functionName: 'playFee',
  })

  const { data: treasuryEthBalance, refetch: refetchTreasuryEth } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury,
    abi: TREASURY_ABI,
    functionName: 'treasuryBalanceETH',
  })

  const { data: treasuryRewardTokenBalance, refetch: refetchTreasuryRewardToken } = useReadContract({
    address: CONTRACT_ADDRESSES.treasury,
    abi: TREASURY_ABI,
    functionName: 'treasuryBalanceToken',
    args: [CONTRACT_ADDRESSES.joybitToken],
  })

  if (!mounted) return null

  if (!isConnected || !isUnlocked || !isAuthorized) {
    return (
      <main className="min-h-screen px-4 py-5" style={{ backgroundColor: 'var(--theme-background)', color: 'var(--theme-text)' }}>
        <div className="fixed right-3 top-3 z-50 flex items-center gap-2">
          <WalletButton />
        </div>

        <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center">
          <section className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-6 text-center">
            <h1 className="mb-2 text-2xl font-black">Admin Access Locked</h1>
            <p className="text-sm text-gray-400">
              Connect with an authorized wallet/FID and unlock from the home logo tap sequence.
            </p>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="theme-button-brand mt-4 rounded-lg px-4 py-2 text-sm font-bold"
            >
              Back Home
            </button>
          </section>
        </div>
      </main>
    )
  }

  const handleUpdatePlayFee = async () => {
    try {
      setStatus('Submitting play fee update...')
      const fee = parseEther(newPlayFeeEth || '0')
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.match3Game,
        abi: MATCH3_GAME_ABI,
        functionName: 'setPlayFee',
        args: [fee],
      })
      await refetchPlayFee()
      setStatus('Play fee updated successfully.')
    } catch (error) {
      setStatus(`Play fee update failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleSetTreasuryContract = async () => {
    try {
      if (!isAddress(newTreasuryAddress)) {
        setStatus('Invalid treasury address format.')
        return
      }

      setStatus('Submitting treasury address update...')
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.match3Game,
        abi: MATCH3_GAME_ABI,
        functionName: 'setTreasury',
        args: [newTreasuryAddress as `0x${string}`],
      })
      setStatus('Treasury address updated successfully.')
    } catch (error) {
      setStatus(`Treasury update failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleWithdrawEth = async () => {
    try {
      setStatus('Submitting ETH withdraw...')
      const amount = parseEther(withdrawEthAmount || '0')
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.treasury,
        abi: TREASURY_ABI,
        functionName: 'withdrawETH',
        args: [amount],
      })
      await refetchTreasuryEth()
      setStatus('Treasury ETH withdrawn successfully.')
    } catch (error) {
      setStatus(`Withdraw failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleWithdrawRewardToken = async () => {
    try {
      if (!isAddress(CONTRACT_ADDRESSES.joybitToken)) {
        setStatus('Reward token address is invalid or missing in env.')
        return
      }

      setStatus('Submitting reward token withdraw...')
      const amount = parseEther(withdrawTokenAmount || '0')
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.treasury,
        abi: TREASURY_ABI,
        functionName: 'withdrawToken',
        args: [CONTRACT_ADDRESSES.joybitToken, amount],
      })
      await refetchTreasuryRewardToken()
      setStatus('Treasury reward token withdrawn successfully.')
    } catch (error) {
      setStatus(`Reward token withdraw failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <main className="min-h-screen px-4 py-5" style={{ backgroundColor: 'var(--theme-background)', color: 'var(--theme-text)' }}>
      <div className="fixed right-3 top-3 z-50 flex items-center gap-2">
        <AudioButtons />
        <WalletButton />
      </div>

      <div className="mx-auto max-w-3xl pt-14">
        <div className="mb-6 flex items-center justify-between">
          <button type="button" onClick={() => router.push('/')} className="theme-button-brand-soft rounded-lg px-4 py-2 text-sm font-semibold">
            Back
          </button>
          <h1 className="text-2xl font-black">Admin Panel</h1>
          <div className="w-16" />
        </div>

        <div className="space-y-4">
          <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="mb-3 text-lg font-bold">Match-3 Fee</h2>
            <p className="mb-3 text-sm text-gray-400">Current fee: {formatEther((playFee as bigint) || 0n)} ETH</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={newPlayFeeEth}
                onChange={(e) => setNewPlayFeeEth(e.target.value)}
                placeholder="0.001"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={isPending}
                onClick={handleUpdatePlayFee}
                className="theme-button-brand rounded-lg px-4 py-2 text-sm font-bold"
              >
                Update Fee
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="mb-3 text-lg font-bold">Match-3 Treasury Contract</h2>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={newTreasuryAddress}
                onChange={(e) => setNewTreasuryAddress(e.target.value)}
                placeholder="0x..."
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={isPending}
                onClick={handleSetTreasuryContract}
                className="theme-button-brand rounded-lg px-4 py-2 text-sm font-bold"
              >
                Set Treasury
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="mb-3 text-lg font-bold">Treasury Withdraw</h2>
            <p className="mb-3 text-sm text-gray-400">Treasury ETH balance: {formatEther((treasuryEthBalance as bigint) || 0n)} ETH</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={withdrawEthAmount}
                onChange={(e) => setWithdrawEthAmount(e.target.value)}
                placeholder="0.01"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={isPending}
                onClick={handleWithdrawEth}
                className="theme-button-brand rounded-lg px-4 py-2 text-sm font-bold"
              >
                Withdraw ETH
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="mb-3 text-lg font-bold">Reward Token (JOYB)</h2>
            <p className="mb-1 text-xs text-gray-400 break-all">Token: {CONTRACT_ADDRESSES.joybitToken || 'Not configured'}</p>
            <p className="mb-3 text-sm text-gray-400">
              Treasury token balance: {formatEther((treasuryRewardTokenBalance as bigint) || 0n)} JOYB
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={withdrawTokenAmount}
                onChange={(e) => setWithdrawTokenAmount(e.target.value)}
                placeholder="10"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={isPending}
                onClick={handleWithdrawRewardToken}
                className="theme-button-brand rounded-lg px-4 py-2 text-sm font-bold"
              >
                Withdraw Token
              </button>
            </div>
          </section>

          {status && (
            <section className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-gray-200">
              {status}
            </section>
          )}
        </div>
      </div>
    </main>
  )
}
