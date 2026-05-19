const hre = require("hardhat");
require("dotenv").config({ path: ".env.local" });

async function main() {
  const usdcToken = process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS;

  if (!usdcToken) {
    throw new Error("NEXT_PUBLIC_USDC_TOKEN_ADDRESS is required");
  }

  console.log("Deploying Joybit Match-3 contracts...\n");

  const Treasury = await hre.ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(usdcToken);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("Treasury:", treasuryAddress);

  const Match3Game = await hre.ethers.getContractFactory("Match3Game");
  const match3 = await Match3Game.deploy(treasuryAddress);
  await match3.waitForDeployment();
  const match3Address = await match3.getAddress();
  console.log("Match3Game:", match3Address);

  await treasury.addAdmin(match3Address);
  console.log("Match3Game added as Treasury admin");

  console.log("\nEnvironment values:");
  console.log(`NEXT_PUBLIC_TREASURY_ADDRESS=${treasuryAddress}`);
  console.log(`NEXT_PUBLIC_MATCH3_GAME_ADDRESS=${match3Address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
