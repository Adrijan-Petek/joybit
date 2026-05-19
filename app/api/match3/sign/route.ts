import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, createWalletClient, encodeAbiParameters, http, keccak256 } from 'viem'
import { base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

type SignRequestBody = {
  sessionId: bigint | number | string
  reward: bigint | number | string
  player: `0x${string}`
  token: `0x${string}`
}

function toBigInt(value: bigint | number | string) {
  if (typeof value === 'bigint') return value
  return BigInt(value)
}

export async function POST(request: NextRequest) {
  const privateKey = process.env.PRIVATE_KEY
  const gameAddress = process.env.NEXT_PUBLIC_MATCH3_GAME_ADDRESS as `0x${string}` | undefined
  const signerAddress = process.env.NEXT_PUBLIC_GAME_SIGNER_ADDRESS as `0x${string}` | undefined
  const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'

  if (!privateKey || !gameAddress || !signerAddress) {
    return NextResponse.json({ error: 'Signing is not configured' }, { status: 503 })
  }

  let body: SignRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const sessionId = toBigInt(body.sessionId)
  const reward = toBigInt(body.reward)

  if (!body.player || !body.token) {
    return NextResponse.json({ error: 'Missing player or token' }, { status: 400 })
  }

  const normalizedPrivateKey = (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as `0x${string}`
  const account = privateKeyToAccount(normalizedPrivateKey)
  if (account.address.toLowerCase() !== signerAddress.toLowerCase()) {
    return NextResponse.json({ error: 'Signer key does not match NEXT_PUBLIC_GAME_SIGNER_ADDRESS' }, { status: 500 })
  }

  const digest = keccak256(
    encodeAbiParameters(
      [
        { type: 'uint256' },
        { type: 'address' },
        { type: 'address' },
        { type: 'uint256' },
        { type: 'address' },
        { type: 'uint256' },
      ],
      [BigInt(base.id), gameAddress as `0x${string}`, body.player as `0x${string}`, sessionId, body.token as `0x${string}`, reward]
    )
  )

  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(rpcUrl),
  })

  const signature = await walletClient.signMessage({
    account,
    message: { raw: digest },
  })

  return NextResponse.json({ signature, digest, signer: account.address })
}
