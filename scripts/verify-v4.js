const hre = require('hardhat')
require('dotenv').config({ path: '.env.local' })

async function verifyContract(address, args, contractName, contractPath) {
  if (!address) return

  try {
    await hre.run('verify:verify', {
      address,
      constructorArguments: args,
      contract: contractPath,
    })
    console.log(`${contractName} verified`)
  } catch (error) {
    if (String(error.message || error).toLowerCase().includes('already verified')) {
      console.log(`${contractName} already verified`)
      return
    }
    console.error(`Failed to verify ${contractName}:`, error.message || error)
  }
}

async function main() {
  const treasury = process.env.NEXT_PUBLIC_TREASURY_ADDRESS
  const match3Game = process.env.NEXT_PUBLIC_MATCH3_GAME_ADDRESS
  const gameSigner = (process.env.NEXT_PUBLIC_GAME_SIGNER_ADDRESS || process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS || '').trim()
  const usdcToken = process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS

  await verifyContract(treasury, [usdcToken], 'Treasury-v4', 'contracts/Treasury-v4.sol:TreasuryV4')
  await verifyContract(match3Game, [treasury, gameSigner], 'Game-v4', 'contracts/Game-v4.sol:Match3GameV4')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})