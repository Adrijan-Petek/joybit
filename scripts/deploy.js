const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting Joybit deployment to Base...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Joybit Token Address on Base
  const JOYBIT_TOKEN_ADDRESS = "0xc732932ca7db558cf1bacc17b4f4f7e149e0eb07";
  console.log("\n🪙 Using Joybit Token at:", JOYBIT_TOKEN_ADDRESS);

  // Deploy Treasury
  console.log("\n📦 Deploying Treasury...");
  const Treasury = await hre.ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(JOYBIT_TOKEN_ADDRESS);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("✅ Treasury deployed to:", treasuryAddress);

  // Deploy Match3Game
  console.log("\n📦 Deploying Match3Game...");
  const Match3Game = await hre.ethers.getContractFactory("Match3Game");
  const match3Game = await Match3Game.deploy(treasuryAddress);
  await match3Game.waitForDeployment();
  const match3GameAddress = await match3Game.getAddress();
  console.log("✅ Match3Game deployed to:", match3GameAddress);

  // Deploy CardGame
  console.log("\n📦 Deploying CardGame...");
  const CardGame = await hre.ethers.getContractFactory("CardGame");
  const cardGame = await CardGame.deploy(treasuryAddress);
  await cardGame.waitForDeployment();
  const cardGameAddress = await cardGame.getAddress();
  console.log("✅ CardGame deployed to:", cardGameAddress);

  // Deploy DailyClaim
  console.log("\n📦 Deploying DailyClaim...");
  const DailyClaim = await hre.ethers.getContractFactory("DailyClaim");
  const dailyClaim = await DailyClaim.deploy(treasuryAddress);
  await dailyClaim.waitForDeployment();
  const dailyClaimAddress = await dailyClaim.getAddress();
  console.log("✅ DailyClaim deployed to:", dailyClaimAddress);

  // Setup: Add contracts as admins to Treasury
  console.log("\n⚙️ Setting up Treasury admins...");
  await treasury.addAdmin(match3GameAddress);
  await treasury.addAdmin(cardGameAddress);
  await treasury.addAdmin(dailyClaimAddress);
  console.log("✅ Treasury admins configured");

  // Set lower minimum balance for operations (can be adjusted later)
  await treasury.setMinimumTokenBalance(JOYBIT_TOKEN_ADDRESS, hre.ethers.parseEther("10000"));
  console.log("✅ Treasury minimum balance set");

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📋 Contract Addresses:");
  console.log("Treasury:", treasuryAddress);
  console.log("Match3Game:", match3GameAddress);
  console.log("CardGame:", cardGameAddress);
  console.log("DailyClaim:", dailyClaimAddress);
  console.log("JOYB Token:", JOYBIT_TOKEN_ADDRESS);

  // Save addresses to file
  const fs = require("fs");
  const addresses = {
    treasury: treasuryAddress,
    match3Game: match3GameAddress,
    cardGame: cardGameAddress,
    dailyClaim: dailyClaimAddress,
    joybitToken: JOYBIT_TOKEN_ADDRESS,
    network: "base"
  };

  fs.writeFileSync("deployed-addresses.json", JSON.stringify(addresses, null, 2));
  console.log("\n💾 Addresses saved to deployed-addresses.json");

  console.log("\n📝 Update your .env file with these addresses:");
  console.log(`NEXT_PUBLIC_JOYBIT_TOKEN_ADDRESS=${JOYBIT_TOKEN_ADDRESS}`);
  console.log(`NEXT_PUBLIC_TREASURY_ADDRESS=${treasuryAddress}`);
  console.log(`NEXT_PUBLIC_MATCH3_GAME_ADDRESS=${match3GameAddress}`);
  console.log(`NEXT_PUBLIC_CARD_GAME_ADDRESS=${cardGameAddress}`);
  console.log(`NEXT_PUBLIC_DAILY_CLAIM_ADDRESS=${dailyClaimAddress}`);

  console.log("\n✨ Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
