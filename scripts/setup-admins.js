const hre = require("hardhat");

async function main() {
  console.log("⚙️ Setting up Treasury admins...\n");

  const treasuryAddress = "0x91F67245cE0ad7AFB5301EE5d8eaE29Db69078Af";
  const match3GameAddress = "0x72cC365b09D7cB4bE3416279407655cA9BBdc532";
  const cardGameAddress = "0xa59Fd0ffE17D446157430E13db2d133DD2DfF3da";
  const dailyClaimAddress = "0x6A27938E353Be8f25ECD7dEd90A47221e93F2941";

  const Treasury = await hre.ethers.getContractAt("Treasury", treasuryAddress);
  
  console.log("Adding Match3Game as admin...");
  const tx1 = await Treasury.addAdmin(match3GameAddress);
  await tx1.wait();
  console.log("✅ Match3Game added");

  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log("Adding CardGame as admin...");
  const tx2 = await Treasury.addAdmin(cardGameAddress);
  await tx2.wait();
  console.log("✅ CardGame added");

  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log("Adding DailyClaim as admin...");
  const tx3 = await Treasury.addAdmin(dailyClaimAddress);
  await tx3.wait();
  console.log("✅ DailyClaim added");

  console.log("\n🎉 All admins configured!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
