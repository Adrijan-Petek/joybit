const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment of simplified contracts...");
  
  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No accounts found. Check your PRIVATE_KEY in .env.local");
  }
  
  const deployer = signers[0];
  console.log("Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Existing JoybitToken address (keep this)
  const JOYBIT_TOKEN = "0x1972722DBd13C25e483085Fc373527336DBAe884";
  console.log("Using existing JoybitToken:", JOYBIT_TOKEN);

  // 1. Deploy Treasury
  console.log("\n📦 Deploying Treasury...");
  const Treasury = await hre.ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(JOYBIT_TOKEN);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("✅ Treasury deployed to:", treasuryAddress);

  // 2. Deploy Match3Game
  console.log("\n📦 Deploying Match3Game...");
  const Match3Game = await hre.ethers.getContractFactory("Match3Game");
  const match3 = await Match3Game.deploy(treasuryAddress);
  await match3.waitForDeployment();
  const match3Address = await match3.getAddress();
  console.log("✅ Match3Game deployed to:", match3Address);

  // 3. Deploy CardGame
  console.log("\n📦 Deploying CardGame...");
  const CardGame = await hre.ethers.getContractFactory("CardGame");
  const cardGame = await CardGame.deploy(treasuryAddress);
  await cardGame.waitForDeployment();
  const cardGameAddress = await cardGame.getAddress();
  console.log("✅ CardGame deployed to:", cardGameAddress);

  // 4. Deploy DailyClaim
  console.log("\n📦 Deploying DailyClaim...");
  const DailyClaim = await hre.ethers.getContractFactory("DailyClaim");
  const dailyClaim = await DailyClaim.deploy(treasuryAddress);
  await dailyClaim.waitForDeployment();
  const dailyClaimAddress = await dailyClaim.getAddress();
  console.log("✅ DailyClaim deployed to:", dailyClaimAddress);

  // 5. Add game contracts as admins in Treasury
  console.log("\n🔐 Setting up Treasury admins...");
  await treasury.addAdmin(match3Address);
  console.log("✅ Match3Game added as Treasury admin");
  
  await treasury.addAdmin(cardGameAddress);
  console.log("✅ CardGame added as Treasury admin");
  
  await treasury.addAdmin(dailyClaimAddress);
  console.log("✅ DailyClaim added as Treasury admin");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log("\n📋 Contract Addresses:");
  console.log("JoybitToken:  ", JOYBIT_TOKEN);
  console.log("Treasury:     ", treasuryAddress);
  console.log("Match3Game:   ", match3Address);
  console.log("CardGame:     ", cardGameAddress);
  console.log("DailyClaim:   ", dailyClaimAddress);
  
  console.log("\n📝 Update these in your .env.local:");
  console.log(`NEXT_PUBLIC_TREASURY_ADDRESS=${treasuryAddress}`);
  console.log(`NEXT_PUBLIC_MATCH3_ADDRESS=${match3Address}`);
  console.log(`NEXT_PUBLIC_CARDGAME_ADDRESS=${cardGameAddress}`);
  console.log(`NEXT_PUBLIC_DAILYCLAIM_ADDRESS=${dailyClaimAddress}`);
  
  console.log("\n⚙️ Default Settings:");
  console.log("Match3 Play Fee:      0.001 ETH");
  console.log("Match3 Level Rewards: 100-1000 JOYB (levels 1-10)");
  console.log("CardGame Play Fee:    0.002 ETH");
  console.log("CardGame Win Reward:  100 JOYB");
  console.log("Daily Claim Base:     100 JOYB");
  console.log("Daily Claim Streak:   +10 JOYB per day");
  
  console.log("\n🔄 Next Steps:");
  console.log("1. Manually transfer JOYB tokens to Treasury:", treasuryAddress);
  console.log("2. Run: node scripts/extractAbis.js");
  console.log("3. Update lib/contracts/abis.ts with new ABIs");
  console.log("4. Update lib/contracts/addresses.ts with new addresses");
  console.log("5. Rebuild admin panel for new contract structure");
  console.log("6. Update frontend hooks and game pages");
  console.log("7. Test all functionality");
  console.log("=".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
