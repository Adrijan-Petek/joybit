/**
 * post-deploy-admin.js
 * Run after deploy-v3.js to authorize the new game in Treasury-v2
 * and transfer ownership of Game-v3 to the admin wallet.
 *
 * Requires ADMIN_PRIVATE_KEY in .env.local (the 0x868... admin wallet key).
 * The game signer PRIVATE_KEY is also needed for transferOwnership on Game-v3.
 *
 * Usage:
 *   node scripts/post-deploy-admin.js
 */

const { createPublicClient, createWalletClient, http, parseAbi } = require('viem')
const { privateKeyToAccount } = require('viem/accounts')
const { base } = require('viem/chains')
require('dotenv').config({ path: '.env.local' })

async function main() {
  const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY
  const gameSignerPrivateKey = process.env.PRIVATE_KEY
  const treasuryAddress = process.env.NEXT_PUBLIC_TREASURY_ADDRESS
  const newGameAddress = process.env.NEXT_PUBLIC_MATCH3_GAME_ADDRESS
  const oldGameAddress = '0xc496bc2721dfd870a0b03699669a5fa096e30b13'
  const adminAddress = (process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS || '').trim()
  const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'

  if (!adminPrivateKey) throw new Error('ADMIN_PRIVATE_KEY is required in .env.local')
  if (!gameSignerPrivateKey) throw new Error('PRIVATE_KEY is required in .env.local')
  if (!treasuryAddress) throw new Error('NEXT_PUBLIC_TREASURY_ADDRESS is required')
  if (!newGameAddress) throw new Error('NEXT_PUBLIC_MATCH3_GAME_ADDRESS is required')
  if (!adminAddress) throw new Error('NEXT_PUBLIC_ADMIN_WALLET_ADDRESS is required')

  const adminAccount = privateKeyToAccount(adminPrivateKey.startsWith('0x') ? adminPrivateKey : `0x${adminPrivateKey}`)
  const gameSignerAccount = privateKeyToAccount(gameSignerPrivateKey.startsWith('0x') ? gameSignerPrivateKey : `0x${gameSignerPrivateKey}`)

  const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl) })

  const adminWallet = createWalletClient({ account: adminAccount, chain: base, transport: http(rpcUrl) })
  const gameSignerWallet = createWalletClient({ account: gameSignerAccount, chain: base, transport: http(rpcUrl) })

  console.log('Post-deploy admin setup...\n')
  console.log('Admin wallet:     ', adminAccount.address)
  console.log('Game signer:      ', gameSignerAccount.address)
  console.log('Treasury-v2:      ', treasuryAddress)
  console.log('New Game-v3:      ', newGameAddress)
  console.log('Old Game-v2:      ', oldGameAddress)
  console.log()

  const treasuryAbi = parseAbi(['function setAuthorizedGame(address game, bool status)'])
  const gameAbi = parseAbi(['function transferOwnership(address newOwner)'])

  // 1. Authorize Game-v3 in Treasury-v2 (admin must be Treasury owner)
  console.log('1. Authorizing Game-v3 in Treasury-v2...')
  const authHash = await adminWallet.writeContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: 'setAuthorizedGame',
    args: [newGameAddress, true],
  })
  await publicClient.waitForTransactionReceipt({ hash: authHash })
  console.log('   Game-v3 authorized ✓', authHash)

  // 2. Deauthorize old Game-v2 in Treasury-v2
  console.log('2. Deauthorizing old Game-v2...')
  const deauthHash = await adminWallet.writeContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: 'setAuthorizedGame',
    args: [oldGameAddress, false],
  })
  await publicClient.waitForTransactionReceipt({ hash: deauthHash })
  console.log('   Old game deauthorized ✓', deauthHash)

  // 3. Transfer ownership of Game-v3 to admin (signed by game signer who currently owns it)
  console.log('3. Transferring Game-v3 ownership to admin...')
  const transferHash = await gameSignerWallet.writeContract({
    address: newGameAddress,
    abi: gameAbi,
    functionName: 'transferOwnership',
    args: [adminAddress],
  })
  await publicClient.waitForTransactionReceipt({ hash: transferHash })
  console.log('   Ownership transferred ✓', transferHash)

  console.log('\nAll done!')
  console.log('Game-v3:', newGameAddress)
  console.log('Owner:  ', adminAddress)
}

main().catch(err => {
  console.error(err.shortMessage || err.message || err)
  process.exit(1)
})
