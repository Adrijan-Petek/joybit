const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Starting contract verification on BaseScan...\n");

  // Load deployment info
  const deploymentPath = path.join(__dirname, "..", "deployments", "testnet-deployment.json");
  
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ Deployment file not found!");
    console.error("Please run deployment script first: npx hardhat run scripts/deploy-testnet.js --network baseSepolia");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const contracts = deployment.contracts;

  console.log("Loaded deployment from:", deploymentPath);
  console.log("Network:", deployment.network);
  console.log("Deployer:", deployment.deployer);
  console.log("\n" + "=".repeat(60) + "\n");

  // Verify each contract
  const verifications = [];

  // 1. Test Token
  if (contracts.joybitToken) {
    console.log("1️⃣  Verifying Test JOYB Token...");
    verifications.push(
      verifyContract(contracts.joybitToken, [
        "Joybit Test Token",
        "JOYB"
      ], "TestERC20")
    );
  }

  // 2. Treasury
  if (contracts.treasury) {
    console.log("\n2️⃣  Verifying Treasury...");
    verifications.push(
      verifyContract(contracts.treasury, [], "Treasury")
    );
  }

  // 3. AccessControl
  if (contracts.accessControl) {
    console.log("\n3️⃣  Verifying AccessControl...");
    verifications.push(
      verifyContract(contracts.accessControl, [
        deployment.deployer
      ], "JoybitAccessControl")
    );
  }

  // 4. GameSettings
  if (contracts.gameSettings) {
    console.log("\n4️⃣  Verifying GameSettings...");
    verifications.push(
      verifyContract(contracts.gameSettings, [], "GameSettings")
    );
  }

  // 5. BoosterShop
  if (contracts.boosterShop) {
    console.log("\n5️⃣  Verifying BoosterShop...");
    verifications.push(
      verifyContract(contracts.boosterShop, [], "BoosterShop")
    );
  }

  // 6. JoybitGame
  if (contracts.joybitGame) {
    console.log("\n6️⃣  Verifying JoybitGame...");
    verifications.push(
      verifyContract(contracts.joybitGame, [
        contracts.gameSettings,
        contracts.joybitToken,
        contracts.treasury
      ], "JoybitGame")
    );
  }

  // 7. DailyClaim
  if (contracts.dailyClaim) {
    console.log("\n7️⃣  Verifying DailyClaim...");
    verifications.push(
      verifyContract(contracts.dailyClaim, [
        contracts.joybitToken,
        contracts.treasury
      ], "DailyClaim")
    );
  }

  // 8. CardGame
  if (contracts.cardGame) {
    console.log("\n8️⃣  Verifying CardGame...");
    verifications.push(
      verifyContract(contracts.cardGame, [
        contracts.treasury
      ], "CardGame")
    );
  }

  // Wait for all verifications
  const results = await Promise.allSettled(verifications);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 VERIFICATION SUMMARY");
  console.log("=".repeat(60) + "\n");

  let successCount = 0;
  let failCount = 0;

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      successCount++;
      console.log(`✅ Contract ${index + 1}: Verified`);
    } else {
      failCount++;
      console.log(`❌ Contract ${index + 1}: Failed - ${result.reason}`);
    }
  });

  console.log(`\nTotal: ${successCount} verified, ${failCount} failed`);

  if (successCount === results.length) {
    console.log("\n🎉 All contracts verified successfully!");
  } else {
    console.log("\n⚠️  Some contracts failed verification. Check logs above.");
  }
}

async function verifyContract(address, constructorArguments, contractName) {
  try {
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: constructorArguments,
      contract: contractName ? `contracts/${contractName}.sol:${contractName}` : undefined,
    });
    console.log(`   ✅ ${address} verified`);
    return true;
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log(`   ℹ️  ${address} already verified`);
      return true;
    }
    console.log(`   ❌ ${address} verification failed:`, error.message);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Verification failed:", error);
    process.exit(1);
  });
