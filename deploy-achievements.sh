#!/bin/bash

echo "🎮 Joybit Achievement NFT System - Quick Deploy"
echo "================================================"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local not found!"
    echo "Please create .env.local with required environment variables"
    exit 1
fi

echo "📋 Pre-Deployment Checklist:"
echo "[ ] Deleted all files on Pinata"
echo "[ ] Have ~0.01 ETH on Base Mainnet"
echo "[ ] Treasury contract address is correct"
echo ""
read -p "Ready to proceed? (yes/no): " response

if [ "$response" != "yes" ]; then
    echo "❌ Cancelled"
    exit 0
fi

echo ""
echo "Step 1/6: Generating achievement cards..."
npm run generate-cards
if [ $? -ne 0 ]; then
    echo "❌ Card generation failed"
    exit 1
fi

echo ""
echo "Step 2/6: Uploading to Pinata IPFS..."
echo "⚠️  This will take a few minutes..."
npm run upload-ipfs
if [ $? -ne 0 ]; then
    echo "❌ Upload failed"
    exit 1
fi

echo ""
echo "✅ Upload complete!"
echo ""
echo "📝 IMPORTANT: Before deploying contract:"
echo "1. Check achievement-ipfs-results.json"
echo "2. Create Pinata folder 'joybit-achievements-metadata'"
echo "3. Upload all JSON files (1.json through 40.json)"
echo "4. Get the folder CID"
echo ""
read -p "Have you created the Pinata folder and got the CID? (yes/no): " folder_response

if [ "$folder_response" != "yes" ]; then
    echo "⚠️  Please complete Pinata folder setup first"
    echo "Then run: npm run deploy-achievement"
    exit 0
fi

read -p "Enter your Pinata folder CID: " folder_cid

echo ""
echo "Step 3/6: Compiling contracts..."
npx hardhat compile

echo ""
echo "Step 4/6: Deploying Achievement contract..."
npm run deploy-achievement

echo ""
echo "⚠️  Contract deployed! Now you need to:"
echo "1. Copy the contract address from above"
echo "2. Update .env.local: NEXT_PUBLIC_ACHIEVEMENT_ERC1155_ADDRESS=0xYOUR_ADDRESS"
echo "3. Update contract base URI with: ipfs://${folder_cid}/"
echo ""
read -p "Press Enter when you've updated .env.local..."

echo ""
echo "Step 5/6: Updating contract base URI..."
echo "Run this in Hardhat console:"
echo "npx hardhat console --network base"
echo ""
echo "const Achievement = await ethers.getContractAt('AchievementERC1155', 'YOUR_CONTRACT_ADDRESS')"
echo "await Achievement.setBaseMetadataURI('ipfs://${folder_cid}/')"
echo ""
read -p "Press Enter when base URI is updated..."

echo ""
echo "Step 6/6: Adding all achievements to contract..."
npm run add-achievements

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo ""
echo "✅ Next steps:"
echo "1. Test minting from /profile page"
echo "2. Check NFT in wallet"
echo "3. Verify metadata on OpenSea"
echo "4. (Optional) Verify contract on BaseScan"
echo ""
echo "To verify contract:"
echo "npx hardhat verify --network base YOUR_CONTRACT_ADDRESS \"TREASURY_ADDRESS\" \"ipfs://${folder_cid}/\""
echo ""
echo "📚 For detailed info, see: ACHIEVEMENT_SETUP_COMPLETE.md"
