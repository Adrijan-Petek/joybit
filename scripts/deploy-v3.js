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
  const treasuryAddress = process.env.NEXT_PUBLIC_TREASURY_ADDRESS
  const gameSigner = (process.env.NEXT_PUBLIC_GAME_SIGNER_ADDRESS || process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS || '').trim()
  const adminAddress = (process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS || process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESSES?.split(',')[0] || '').trim()
  const oldGameAddress = (process.env.NEXT_PUBLIC_MATCH3_GAME_ADDRESS || '').trim()
  const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'

  if (!privateKey) throw new Error('PRIVATE_KEY is required')
  if (!treasuryAddress) throw new Error('NEXT_PUBLIC_TREASURY_ADDRESS is required (Treasury-v2)')
  if (!gameSigner) throw new Error('NEXT_PUBLIC_GAME_SIGNER_ADDRESS or NEXT_PUBLIC_ADMIN_WALLET_ADDRESS is required')
  if (!adminAddress) throw new Error('NEXT_PUBLIC_ADMIN_WALLET_ADDRESS is required')

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

  console.log('Deploying Joybit Game-v3...\n')
  console.log('Deployer:', account.address)
  console.log('Admin owner:', adminAddress)
  console.log('Treasury-v2:', treasuryAddress)
  console.log('Game signer:', gameSigner)
  console.log('Old game:', oldGameAddress || 'not provided')
  console.log('Nonce:', nonce)
  console.log('Balance (ETH):', balance.toString())

  const gameArtifact = loadArtifact('contracts/Game-v3.sol/Match3GameV3.json')

  const gameHash = await walletClient.deployContract({
    abi: gameArtifact.abi,
    bytecode: gameArtifact.bytecode,
    args: [treasuryAddress, gameSigner],
  })
  const gameReceipt = await publicClient.waitForTransactionReceipt({ hash: gameHash })
  const gameAddress = gameReceipt.contractAddress
  if (!gameAddress) throw new Error('Game-v3 deployment did not return a contract address')
  console.log('Game-v3:', gameAddress)

  const treasuryAbi = parseAbi([
    'function setAuthorizedGame(address game, bool status)',
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
  console.log('Game-v3 authorized in Treasury-v2')

  if (oldGameAddress && /^0x[a-fA-F0-9]{40}$/.test(oldGameAddress) && oldGameAddress.toLowerCase() !== gameAddress.toLowerCase()) {
    const disableOldHash = await walletClient.writeContract({
      address: treasuryAddress,
      abi: treasuryAbi,
      functionName: 'setAuthorizedGame',
      args: [oldGameAddress, false],
    })
    await publicClient.waitForTransactionReceipt({ hash: disableOldHash })
    console.log('Old game deauthorized in Treasury-v2')
  }

  const gameOwnershipHash = await walletClient.writeContract({
    address: gameAddress,
    abi: gameAbi,
    functionName: 'transferOwnership',
    args: [adminAddress],
  })
  await publicClient.waitForTransactionReceipt({ hash: gameOwnershipHash })
  console.log('Game-v3 ownership transferred to admin')

  console.log('\nUpdate env:')
  console.log(`NEXT_PUBLIC_MATCH3_GAME_ADDRESS=${gameAddress}`)
  console.log('Keep NEXT_PUBLIC_TREASURY_ADDRESS as existing Treasury-v2')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
