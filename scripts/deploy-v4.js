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
  const usdc = process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS
  const gameSigner = (process.env.NEXT_PUBLIC_GAME_SIGNER_ADDRESS || process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS || '').trim()
  const adminAddress = (process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS || process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESSES?.split(',')[0] || '').trim()
  const oldTreasuryAddress = (process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '').trim()
  const oldGameAddress = (process.env.NEXT_PUBLIC_MATCH3_GAME_ADDRESS || '').trim()
  const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'

  if (!privateKey) throw new Error('PRIVATE_KEY is required')
  if (!usdc) throw new Error('NEXT_PUBLIC_USDC_TOKEN_ADDRESS is required')
  if (!gameSigner) throw new Error('NEXT_PUBLIC_GAME_SIGNER_ADDRESS or NEXT_PUBLIC_ADMIN_WALLET_ADDRESS is required')
  if (!adminAddress) throw new Error('NEXT_PUBLIC_ADMIN_WALLET_ADDRESS is required')

  const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`)
  const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl) })
  const walletClient = createWalletClient({ account, chain: base, transport: http(rpcUrl) })

  const treasuryArtifact = loadArtifact('contracts/Treasury-v4.sol/TreasuryV4.json')
  const gameArtifact = loadArtifact('contracts/Game-v4.sol/Match3GameV4.json')

  console.log('Deploying Joybit Treasury-v4 and Game-v4...\n')
  console.log('Deployer:', account.address)
  console.log('Admin owner:', adminAddress)
  console.log('USDC:', usdc)
  console.log('Game signer:', gameSigner)
  console.log('Old Treasury:', oldTreasuryAddress || 'not provided')
  console.log('Old Game:', oldGameAddress || 'not provided')

  const treasuryHash = await walletClient.deployContract({
    abi: treasuryArtifact.abi,
    bytecode: treasuryArtifact.bytecode,
    args: [usdc],
  })
  const treasuryReceipt = await publicClient.waitForTransactionReceipt({ hash: treasuryHash })
  const treasuryAddress = treasuryReceipt.contractAddress
  if (!treasuryAddress) throw new Error('Treasury-v4 deployment did not return a contract address')
  console.log('Treasury-v4:', treasuryAddress)

  const gameHash = await walletClient.deployContract({
    abi: gameArtifact.abi,
    bytecode: gameArtifact.bytecode,
    args: [treasuryAddress, gameSigner],
  })
  const gameReceipt = await publicClient.waitForTransactionReceipt({ hash: gameHash })
  const gameAddress = gameReceipt.contractAddress
  if (!gameAddress) throw new Error('Game-v4 deployment did not return a contract address')
  console.log('Game-v4:', gameAddress)

  const treasuryAdminAbi = parseAbi([
    'function setAuthorizedGame(address game, bool status)',
    'function transferOwnership(address newOwner)',
  ])
  const gameAdminAbi = parseAbi(['function transferOwnership(address newOwner)'])

  const authorizeHash = await walletClient.writeContract({
    address: treasuryAddress,
    abi: treasuryAdminAbi,
    functionName: 'setAuthorizedGame',
    args: [gameAddress, true],
  })
  await publicClient.waitForTransactionReceipt({ hash: authorizeHash })
  console.log('Game-v4 authorized in Treasury-v4')

  const transferTreasuryHash = await walletClient.writeContract({
    address: treasuryAddress,
    abi: treasuryAdminAbi,
    functionName: 'transferOwnership',
    args: [adminAddress],
  })
  await publicClient.waitForTransactionReceipt({ hash: transferTreasuryHash })
  console.log('Treasury-v4 ownership transferred to admin')

  const transferGameHash = await walletClient.writeContract({
    address: gameAddress,
    abi: gameAdminAbi,
    functionName: 'transferOwnership',
    args: [adminAddress],
  })
  await publicClient.waitForTransactionReceipt({ hash: transferGameHash })
  console.log('Game-v4 ownership transferred to admin')

  console.log('\nUpdate env:')
  console.log(`NEXT_PUBLIC_TREASURY_ADDRESS=${treasuryAddress}`)
  console.log(`NEXT_PUBLIC_MATCH3_GAME_ADDRESS=${gameAddress}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})