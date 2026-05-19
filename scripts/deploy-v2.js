const { readFileSync } = require('fs')
const { join } = require('path')
const { createPublicClient, createWalletClient, http, parseAbi } = require('viem')
const { privateKeyToAccount } = require('viem/accounts')
const { base } = require('viem/chains')
require('dotenv').config({ path: '.env.local' })

function loadArtifact(relativePath) {
  const artifactPath = join(process.cwd(), 'artifacts', relativePath)
  return JSON.parse(readFileSync(artifactPath, 'utf8'))
}

async function main() {
  const privateKey = process.env.PRIVATE_KEY
  const usdcToken = process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS
  const adminAddress = (process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS || process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESSES?.split(',')[0] || '').trim()
  const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'

  if (!privateKey) {
    throw new Error('PRIVATE_KEY is required')
  }

  if (!usdcToken) {
    throw new Error('NEXT_PUBLIC_USDC_TOKEN_ADDRESS is required')
  }

  if (!adminAddress) {
    throw new Error('NEXT_PUBLIC_ADMIN_WALLET_ADDRESS is required')
  }

  const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`)
  const publicClient = createPublicClient({
    chain: base,
    transport: http(rpcUrl),
  })
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(rpcUrl),
  })

  const [balance, nonce] = await Promise.all([
    publicClient.getBalance({ address: account.address }),
    publicClient.getTransactionCount({ address: account.address }),
  ])

  console.log('Deploying Joybit v2 contracts...\n')
  console.log('Deployer:', account.address)
  console.log('Admin:', adminAddress)
  console.log('Nonce:', nonce)
  console.log('Balance (ETH):', balance.toString())

  const treasuryArtifact = loadArtifact('contracts/Treasury-v2.sol/Treasury.json')
  const gameArtifact = loadArtifact('contracts/Game-v2.sol/Match3Game.json')

  const treasuryHash = await walletClient.deployContract({
    abi: treasuryArtifact.abi,
    bytecode: treasuryArtifact.bytecode,
    args: [usdcToken],
  })
  const treasuryReceipt = await publicClient.waitForTransactionReceipt({ hash: treasuryHash })
  const treasuryAddress = treasuryReceipt.contractAddress
  if (!treasuryAddress) {
    throw new Error('Treasury deployment did not return a contract address')
  }
  console.log('Treasury-v2:', treasuryAddress)

  const gameHash = await walletClient.deployContract({
    abi: gameArtifact.abi,
    bytecode: gameArtifact.bytecode,
    args: [treasuryAddress, adminAddress],
  })
  const gameReceipt = await publicClient.waitForTransactionReceipt({ hash: gameHash })
  const gameAddress = gameReceipt.contractAddress
  if (!gameAddress) {
    throw new Error('Game deployment did not return a contract address')
  }
  console.log('Game-v2:', gameAddress)

  const treasuryAbi = parseAbi([
    'function setAuthorizedGame(address game, bool status)',
    'function transferOwnership(address newOwner)',
  ])
  const gameAbi = parseAbi([
    'function transferOwnership(address newOwner)',
  ])

  const authorizeHash = await walletClient.writeContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: 'setAuthorizedGame',
    args: [gameAddress, true],
  })
  await publicClient.waitForTransactionReceipt({ hash: authorizeHash })
  console.log('Game-v2 authorized in Treasury-v2')

  const treasuryOwnershipHash = await walletClient.writeContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: 'transferOwnership',
    args: [adminAddress],
  })
  await publicClient.waitForTransactionReceipt({ hash: treasuryOwnershipHash })
  console.log('Treasury-v2 ownership transferred to admin')

  const gameOwnershipHash = await walletClient.writeContract({
    address: gameAddress,
    abi: gameAbi,
    functionName: 'transferOwnership',
    args: [adminAddress],
  })
  await publicClient.waitForTransactionReceipt({ hash: gameOwnershipHash })
  console.log('Game-v2 ownership transferred to admin')

  console.log('\nEnvironment values:')
  console.log(`NEXT_PUBLIC_TREASURY_ADDRESS=${treasuryAddress}`)
  console.log(`NEXT_PUBLIC_MATCH3_GAME_ADDRESS=${gameAddress}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
