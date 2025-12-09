const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying remaining contracts...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Use the most recent Treasury address
  const treasuryAddress = "0x91F67245cE0ad7AFB5301EE5d8eaE29Db69078Af";
  console.log("\n📦 Using Treasury at:", treasuryAddress);

  // Deploy CardGame
  console.log("\n📦 Deploying CardGame...");
  const CardGame = await hre.ethers.getContractFactory("CardGame");
  const cardGame = await CardGame.deploy(treasuryAddress);
  await cardGame.waitForDeployment();
  const cardGameAddress = await cardGame.getAddress();
  console.log("✅ CardGame deployed to:", cardGameAddress);

  // Wait 3 seconds
  console.log("\n⏳ Waiting 3 seconds...");
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Deploy DailyClaim
  console.log("\n📦 Deploying DailyClaim...");
  const DailyClaim = await hre.ethers.getContractFactory("DailyClaim");
  const dailyClaim = await DailyClaim.deploy(treasuryAddress);
  await dailyClaim.waitForDeployment();
  const dailyClaimAddress = await dailyClaim.getAddress();
  console.log("✅ DailyClaim deployed to:", dailyClaimAddress);

  // Setup: Add contracts as admins to Treasury
  console.log("\n⚙️ Setting up Treasury admins...");
  const Treasury = await hre.ethers.getContractAt("Treasury", treasuryAddress);
  
  await Treasury.addAdmin(cardGameAddress);
  console.log("✅ CardGame added as admin");
  
  await Treasury.addAdmin(dailyClaimAddress);
  console.log("✅ DailyClaim added as admin");

  // Also add the Match3Game address from previous deployment
  const match3GameAddress = "0x72cC365b09D7cB4bE3416279407655cA9BBdc532";
  await Treasury.addAdmin(match3GameAddress);
  console.log("✅ Match3Game added as admin");

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📋 Final Contract Addresses:");
  console.log("Treasury:", treasuryAddress);
  console.log("Match3Game:", match3GameAddress);
  console.log("CardGame:", cardGameAddress);
  console.log("DailyClaim:", dailyClaimAddress);
  console.log("JOYB Token:", "0xc732932ca7db558cf1bacc17b4f4f7e149e0eb07");

  console.log("\n📝 Update your .env.local file with these addresses:");
  console.log(`NEXT_PUBLIC_JOYBIT_TOKEN_ADDRESS=0xc732932ca7db558cf1bacc17b4f4f7e149e0eb07`);
  console.log(`NEXT_PUBLIC_TREASURY_ADDRESS=${treasuryAddress}`);
  console.log(`NEXT_PUBLIC_MATCH3_GAME_ADDRESS=${match3GameAddress}`);
  console.log(`NEXT_PUBLIC_CARD_GAME_ADDRESS=${cardGameAddress}`);
  console.log(`NEXT_PUBLIC_DAILY_CLAIM_ADDRESS=${dailyClaimAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
