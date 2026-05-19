const hre = require("hardhat");
require("dotenv").config({ path: ".env.local" });

async function verifyContract(address, args, contractName) {
  if (!address) return;

  try {
    await hre.run("verify:verify", {
      address,
      constructorArguments: args,
    });
    console.log(`${contractName} verified`);
  } catch (error) {
    if (String(error.message || error).toLowerCase().includes("already verified")) {
      console.log(`${contractName} already verified`);
      return;
    }
    console.error(`Failed to verify ${contractName}:`, error.message || error);
  }
}

async function main() {
  const usdcToken = process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS;
  const treasury = process.env.NEXT_PUBLIC_TREASURY_ADDRESS;
  const match3Game = process.env.NEXT_PUBLIC_MATCH3_GAME_ADDRESS;

  await verifyContract(treasury, [usdcToken], "Treasury");
  await verifyContract(match3Game, [treasury], "Match3Game");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
