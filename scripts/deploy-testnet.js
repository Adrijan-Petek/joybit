const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting Joybit TESTNET deployment to Base Sepolia...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");
  
  if (balance < hre.ethers.parseEther("0.01")) {
    console.error("\n❌ Insufficient balance! You need at least 0.01 ETH for testnet deployment.");
    console.log("Get testnet ETH from: https://www.alchemy.com/faucets/base-sepolia");
    process.exit(1);
  }

  const deployedContracts = {};

  // ============================================================
  // 1. DEPLOY TEST JOYBIT TOKEN (for testnet only)
  // ============================================================
  console.log("\n1️⃣  Deploying Test Joybit Token...");
  const TestToken = await hre.ethers.getContractFactory("TestERC20");
  const joybitToken = await TestToken.deploy("Joybit Test Token", "JOYB");
  await joybitToken.waitForDeployment();
  const joybitTokenAddress = await joybitToken.getAddress();
  deployedContracts.joybitToken = joybitTokenAddress;
  console.log("   ✅ Test JOYB Token deployed to:", joybitTokenAddress);
  
  // Mint additional tokens for funding (total 1B tokens for testing)
  console.log("   Minting additional test tokens...");
  await joybitToken.mint(deployer.address, hre.ethers.parseEther("999000000")); // Mint 999M more (already have 1M)
  console.log("   ✅ Total supply: 1,000,000,000 JOYB tokens");

  // ============================================================
  // 2. DEPLOY TREASURY
  // ============================================================
  console.log("\n2️⃣  Deploying Treasury...");
  const Treasury = await hre.ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy();
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  deployedContracts.treasury = treasuryAddress;
  console.log("   ✅ Treasury deployed to:", treasuryAddress);

  // ============================================================
  // 3. DEPLOY ACCESS CONTROL
  // ============================================================
  console.log("\n3️⃣  Deploying AccessControl...");
  const AccessControl = await hre.ethers.getContractFactory("JoybitAccessControl");
  const accessControl = await AccessControl.deploy(deployer.address);
  await accessControl.waitForDeployment();
  const accessControlAddress = await accessControl.getAddress();
  deployedContracts.accessControl = accessControlAddress;
  console.log("   ✅ AccessControl deployed to:", accessControlAddress);

  // ============================================================
  // 4. DEPLOY GAME SETTINGS
  // ============================================================
  console.log("\n4️⃣  Deploying GameSettings...");
  const GameSettings = await hre.ethers.getContractFactory("GameSettings");
  const gameSettings = await GameSettings.deploy();
  await gameSettings.waitForDeployment();
  const gameSettingsAddress = await gameSettings.getAddress();
  deployedContracts.gameSettings = gameSettingsAddress;
  console.log("   ✅ GameSettings deployed to:", gameSettingsAddress);

  // ============================================================
  // 5. DEPLOY BOOSTER SHOP
  // ============================================================
  console.log("\n5️⃣  Deploying BoosterShop...");
  const BoosterShop = await hre.ethers.getContractFactory("BoosterShop");
  const boosterShop = await BoosterShop.deploy();
  await boosterShop.waitForDeployment();
  const boosterShopAddress = await boosterShop.getAddress();
  deployedContracts.boosterShop = boosterShopAddress;
  console.log("   ✅ BoosterShop deployed to:", boosterShopAddress);

  // ============================================================
  // 6. DEPLOY JOYBIT GAME
  // ============================================================
  console.log("\n6️⃣  Deploying JoybitGame...");
  const JoybitGame = await hre.ethers.getContractFactory("JoybitGame");
  const joybitGame = await JoybitGame.deploy(
    gameSettingsAddress,
    joybitTokenAddress,
    treasuryAddress
  );
  await joybitGame.waitForDeployment();
  const joybitGameAddress = await joybitGame.getAddress();
  deployedContracts.joybitGame = joybitGameAddress;
  console.log("   ✅ JoybitGame deployed to:", joybitGameAddress);

  // ============================================================
  // 7. DEPLOY DAILY CLAIM
  // ============================================================
  console.log("\n7️⃣  Deploying DailyClaim...");
  const DailyClaim = await hre.ethers.getContractFactory("DailyClaim");
  const dailyClaim = await DailyClaim.deploy(
    joybitTokenAddress,
    treasuryAddress
  );
  await dailyClaim.waitForDeployment();
  const dailyClaimAddress = await dailyClaim.getAddress();
  deployedContracts.dailyClaim = dailyClaimAddress;
  console.log("   ✅ DailyClaim deployed to:", dailyClaimAddress);

  // ============================================================
  // 8. DEPLOY CARD GAME
  // ============================================================
  console.log("\n8️⃣  Deploying CardGame...");
  const CardGame = await hre.ethers.getContractFactory("CardGame");
  const cardGame = await CardGame.deploy(joybitTokenAddress, treasuryAddress);
  await cardGame.waitForDeployment();
  const cardGameAddress = await cardGame.getAddress();
  deployedContracts.cardGame = cardGameAddress;
  console.log("   ✅ CardGame deployed to:", cardGameAddress);

  // ============================================================
  // 9. CONFIGURE CONTRACTS
  // ============================================================
  console.log("\n9️⃣  Configuring contracts...");
  
  // Authorize game contracts in Treasury
  console.log("   Authorizing JoybitGame in Treasury...");
  await treasury.authorizeContract(joybitGameAddress);
  
  console.log("   Authorizing DailyClaim in Treasury...");
  await treasury.authorizeContract(dailyClaimAddress);
  
  console.log("   Authorizing CardGame in Treasury...");
  await treasury.authorizeContract(cardGameAddress);

  // Fund contracts with test tokens (1M JOYB each)
  console.log("\n   Funding contracts with test JOYB tokens...");
  const fundAmount = hre.ethers.parseEther("1000000");
  
  await joybitToken.transfer(joybitGameAddress, fundAmount);
  console.log("   ✅ Funded JoybitGame with 1M JOYB");
  
  await joybitToken.transfer(dailyClaimAddress, fundAmount);
  console.log("   ✅ Funded DailyClaim with 1M JOYB");

  // Fund treasury with test ETH
  console.log("\n   Funding Treasury with test ETH...");
  // Fund treasury with test ETH
  console.log("\n   Funding Treasury with test ETH...");
  await deployer.sendTransaction({
    to: treasuryAddress,
    value: hre.ethers.parseEther("0.01")
  });
  console.log("   ✅ Funded Treasury with 0.01 ETH");

  // Fund CardGame with JOYB tokens for rewards
  console.log("   Funding CardGame with JOYB tokens for rewards...");
  await joybitToken.transfer(cardGameAddress, hre.ethers.parseEther("1000000"));
  console.log("   ✅ Funded CardGame with 1,000,000 JOYB");

  // ============================================================
  // 10. SAVE DEPLOYMENT INFO
  // ============================================================
  console.log("\n🔟  Saving deployment information...");
  
  const deploymentInfo = {
    network: "base-sepolia",
    chainId: 84532,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: deployedContracts,
    explorerUrls: Object.entries(deployedContracts).reduce((acc, [name, address]) => {
      acc[name] = `https://sepolia.basescan.org/address/${address}`;
      return acc;
    }, {})
  };

  const outputPath = path.join(__dirname, "..", "deployments", "testnet-deployment.json");
  const outputDir = path.dirname(outputPath);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("   ✅ Deployment info saved to:", outputPath);

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log("\n" + "=".repeat(60));
  console.log("🎉 TESTNET DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log("\n📝 Contract Addresses:\n");
  
  Object.entries(deployedContracts).forEach(([name, address]) => {
    const paddedName = name.padEnd(20);
    console.log(`${paddedName} ${address}`);
  });

  console.log("\n🔗 Explorer Links:\n");
  Object.entries(deploymentInfo.explorerUrls).forEach(([name, url]) => {
    console.log(`${name}: ${url}`);
  });
  console.log(`NEXT_PUBLIC_JOYBIT_GAME_ADDRESS=${joybitGameAddress}`);
  console.log(`NEXT_PUBLIC_DAILY_CLAIM_ADDRESS=${dailyClaimAddress}`);
  console.log(`NEXT_PUBLIC_CARD_GAME_ADDRESS=${cardGameAddress}`);
  console.log(`NEXT_PUBLIC_ADMIN_WALLET_ADDRESS=${deployer.address}`);

  console.log("\n⚠️  IMPORTANT NEXT STEPS:");
  console.log("1. Copy the environment variables above to your .env.local file");
  console.log("2. Get testnet ETH: https://www.alchemy.com/faucets/base-sepolia");
  console.log("3. Fund CardGame with more JOYB tokens for rewards if needed");
  console.log("4. Configure game fees and rewards in admin panel");
  console.log("5. Verify contracts on BaseScan (optional)");
  
  console.log("\n✨ Deployment complete! Check deployments/testnet-deployment.json for details");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
