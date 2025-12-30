const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting AchievementERC1155 deployment to Base...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Joybit Token Address on Base
  const JOYBIT_TOKEN_ADDRESS = "0xc732932ca7db558cf1bacc17b4f4f7e149e0eb07";
  console.log("\n🪙 Using Joybit Token at:", JOYBIT_TOKEN_ADDRESS);

  // Use existing Treasury address
  const treasuryAddress = "0x91F67245cE0ad7AFB5301EE5d8eaE29Db69078Af";
  console.log("\n📦 Using existing Treasury at:", treasuryAddress);

  // Deploy AchievementERC1155
  console.log("\n📦 Deploying AchievementERC1155...");
  const AchievementERC1155 = await hre.ethers.getContractFactory("contracts/AchievementERC1155.sol:AchievementERC1155");
  const baseMetadataURI = "https://blue-famous-worm-17.mypinata.cloud/ipfs/";
  const achievementERC1155 = await AchievementERC1155.deploy(treasuryAddress, baseMetadataURI);
  await achievementERC1155.waitForDeployment();
  const achievementAddress = await achievementERC1155.getAddress();
  console.log("✅ AchievementERC1155 deployed to:", achievementAddress);

  console.log("\n🎉 AchievementERC1155 deployment completed successfully!");
  console.log("\n📋 Contract Addresses:");
  console.log("Treasury:", treasuryAddress);
  console.log("AchievementERC1155:", achievementAddress);
  console.log("JOYB Token:", JOYBIT_TOKEN_ADDRESS);

  // Save addresses to file
  const fs = require("fs");
  const addresses = {
    treasury: treasuryAddress,
    achievementERC1155: achievementAddress,
    joybitToken: JOYBIT_TOKEN_ADDRESS,
    network: "base"
  };

  fs.writeFileSync("deployed-addresses.json", JSON.stringify(addresses, null, 2));
  console.log("\n💾 Addresses saved to deployed-addresses.json");

  console.log("\n📝 Update your .env file with these addresses:");
  console.log(`NEXT_PUBLIC_JOYBIT_TOKEN_ADDRESS=${JOYBIT_TOKEN_ADDRESS}`);
  console.log(`NEXT_PUBLIC_TREASURY_ADDRESS=${treasuryAddress}`);
  console.log(`NEXT_PUBLIC_ACHIEVEMENT_ERC1155_ADDRESS=${achievementAddress}`);

  console.log("\n✨ Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
