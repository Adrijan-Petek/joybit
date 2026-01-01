# 🎮 Joybit Achievement NFT System - Complete Setup

## 🚀 Quick Start Guide

### Prerequisites
- ✅ Node.js installed
- ✅ Pinata account with API keys
- ✅ Wallet with ETH on Base Mainnet (~0.01 ETH for deployment + gas)
- ✅ All other contracts already deployed

### Step-by-Step Deployment

#### 1️⃣ Clean Pinata
**DO THIS FIRST!**
1. Go to [https://app.pinata.cloud/](https://app.pinata.cloud/)
2. Delete all existing Joybit achievement files
3. Start fresh ✨

#### 2️⃣ Generate Achievement Cards
```bash
npm run generate-cards
```
**Output:** 40 beautiful PNG cards in `public/achievement-cards/`

**What it creates:**
- Gradient backgrounds based on rarity
- Large emoji icons
- Achievement name and rarity
- Professional NFT card design
- 512x512px optimized for OpenSea

#### 3️⃣ Upload to Pinata IPFS
```bash
npm run upload-ipfs
```
**This will:**
- Upload all 40 card images to IPFS
- Create metadata JSON for each achievement
- Upload metadata to IPFS
- Save results to `achievement-ipfs-results.json`

**After upload completes:**
1. Check `achievement-ipfs-results.json` for all IPFS hashes
2. Note the metadata hashes for each achievement

#### 4️⃣ Create Pinata Folder (Recommended)
1. In Pinata dashboard, create folder: "joybit-achievements-metadata"
2. Upload all 40 JSON files (name them `1.json`, `2.json`, ..., `40.json`)
3. Get the folder CID
4. Your base URI: `ipfs://YOUR_FOLDER_CID/`

#### 5️⃣ Deploy Contract
```bash
npm run deploy-achievement
```
**Contract Features:**
- ✅ Gas-optimized for Base Mainnet
- ✅ Soulbound (non-transferable) NFTs
- ✅ Flexible - can add achievements anytime
- ✅ User-paid minting with ETH
- ✅ Backend gasless minting capability
- ✅ Active/inactive toggle per achievement

**After deployment:**
```bash
# Copy the contract address from output
# Update .env.local:
NEXT_PUBLIC_ACHIEVEMENT_ERC1155_ADDRESS=0xYOUR_NEW_CONTRACT_ADDRESS
```

#### 6️⃣ Update Base URI
Use Hardhat console:
```bash
npx hardhat console --network base
```
Then:
```javascript
const Achievement = await ethers.getContractAt("AchievementERC1155", "YOUR_CONTRACT_ADDRESS")
await Achievement.setBaseMetadataURI("ipfs://YOUR_FOLDER_CID/")
```

#### 7️⃣ Add All Achievements
```bash
npm run add-achievements
```
**This adds all 40 achievements in one go:**
- Processes each achievement
- Sets rarity levels
- Configures pricing
- Activates for minting
- ~0.001 ETH total gas cost

#### 8️⃣ Verify Contract (Optional but Recommended)
```bash
npx hardhat verify --network base YOUR_CONTRACT_ADDRESS "TREASURY_ADDRESS" "ipfs://YOUR_FOLDER_CID/"
```

#### 9️⃣ Test Everything
1. Go to `/profile` page
2. Connect wallet
3. View unlocked achievements
4. Try minting an achievement NFT
5. Check wallet - NFT should appear
6. View on OpenSea: [https://opensea.io/assets/base/YOUR_CONTRACT/TOKEN_ID](https://opensea.io/assets/base/YOUR_CONTRACT/TOKEN_ID)

---

## 📁 File Structure

```
Joybit/
├── contracts/
│   └── AchievementERC1155.sol          # Improved contract
├── scripts/
│   ├── generate-achievement-cards.js   # Card generator
│   ├── upload-to-pinata.js            # IPFS uploader
│   ├── deploy-achievement.js          # Contract deployment
│   └── add-achievements-bulk.js       # Bulk add script
├── public/
│   └── achievement-cards/             # Generated PNG cards
├── achievement-ipfs-results.json      # Upload results
└── deployments/
    └── achievement-deployment.json    # Deployment info
```

## 🎨 Achievement Card Design

Each card features:
- **Background:** Rarity-based gradient (Common → Mythic)
- **Emoji:** Large 160px achievement icon
- **Name:** Bold achievement name
- **Rarity:** Color-coded badge
- **ID:** Achievement number
- **Category:** Match3, Daily, Card, General
- **Branding:** Joybit logo

### Rarity Colors:
- 🔹 **Common:** Gray (#6B7280)
- 🔷 **Rare:** Blue (#3B82F6)
- 🟣 **Epic:** Purple (#8B5CF6)
- 🟠 **Legendary:** Orange (#F59E0B)
- 🔴 **Mythic:** Red (#EF4444)

## 💰 Achievement Pricing

Suggested pricing (adjust as needed):
- **Common:** 0.00003 ETH (~$0.10)
- **Rare:** 0.0001 ETH (~$0.30)
- **Epic:** 0.0003 ETH (~$1.00)
- **Legendary:** 0.001 ETH (~$3.00)
- **Mythic:** 0.003 ETH (~$10.00)

## 🔧 Contract Functions

### Admin Functions:
- `addAchievement(id, rarity, price)` - Add/update achievement
- `updateAchievement(id, price, active)` - Update existing
- `setBaseMetadataURI(uri)` - Update IPFS base URI
- `setMinter(address, allowed)` - Authorize backend minter

### User Functions:
- `mintAchievement(achievementId)` - Mint with ETH payment
- `balanceOf(user, id)` - Check if user has NFT
- `uri(id)` - Get metadata URL

### View Functions:
- `getAchievement(id)` - Get achievement details
- `getAchievementCount()` - Total achievements
- `getAllAchievementIds()` - List all IDs
- `hasAchievement(user, id)` - Check if claimed

## 🎯 Achievement Categories

### Match-3 Game (IDs 1-20)
First Win, Hot Streak, Gem Master, Star Player, Speed Demon, Combo King, Champion, Artist, Rainbow, Heart Breaker, Royal, Mystic, Lucky, Inferno, Frost, Thespian, Unicorn, Summit, Tempest, Phantom

### Daily Claim (IDs 21-25)
Daily Starter, Streak Master, Dedicated Player, Loyal Supporter, Eternal Claimant

### Card Game (IDs 26-35)
Card Novice, Card Winner, Card Expert, Card Master, Card God, Card Legend, Card Addict, Card Collector, Card Strategist, Card Veteran

### General (IDs 36-40)
Well Rounded, High Scorer, Level Climber, Perfectionist, Marathon Player

## 🛠️ Admin Panel Integration

The admin panel (`/admin` → Achievements tab) now:
- ✅ Shows all 40 achievements
- ✅ Displays contract status for each
- ✅ Allows adding achievements to contract
- ✅ Updates prices and active status
- ✅ Syncs with new contract address
- ✅ Real-time contract interaction

## 📱 Profile Page Integration

The profile page (`/profile`) now:
- ✅ Shows all unlocked achievements
- ✅ Displays mintability status
- ✅ Allows minting NFTs to wallet
- ✅ Shows "Not mintable yet" for non-contract achievements
- ✅ Seamless wallet integration
- ✅ Real-time minting feedback

## 🔐 Security Features

- ✅ **Soulbound:** NFTs cannot be transferred
- ✅ **Owner-only:** Only admin can add/update achievements
- ✅ **Payment protection:** Treasury receives all mint fees
- ✅ **Claim tracking:** Users can only mint each achievement once
- ✅ **Active toggle:** Can disable achievements without removing

## ⚡ Gas Optimization

Contract optimized for Base Mainnet:
- **Deployment:** ~0.005 ETH
- **Add achievement:** ~0.00005 ETH each
- **Mint achievement:** ~0.0001 ETH
- **Update achievement:** ~0.00003 ETH

Total setup cost: ~0.007 ETH for all 40 achievements

## 📊 Testing Checklist

- [ ] Cards generated (40 PNG files)
- [ ] All images uploaded to Pinata
- [ ] All metadata uploaded to Pinata
- [ ] Pinata folder created with JSONs
- [ ] Contract deployed successfully
- [ ] Base URI updated in contract
- [ ] All 40 achievements added
- [ ] Test mint from UI works
- [ ] NFT appears in wallet
- [ ] Metadata displays on OpenSea
- [ ] Contract verified on BaseScan
- [ ] Admin panel shows new contract
- [ ] Profile page minting works

## 🐛 Troubleshooting

### "Pinata upload failed"
- Check API keys in `.env.local`
- Verify you have Pinata storage space
- Try uploading one file manually first

### "Contract deployment failed"
- Check ETH balance (need ~0.01 ETH)
- Verify treasury address is correct
- Check Base network is selected

### "Achievement not mintable"
- Ensure achievement added to contract
- Check achievement is active
- Verify user hasn't already minted
- Confirm correct price sent

### "Metadata not showing"
- Wait 5-10 minutes for IPFS propagation
- Check base URI is correct in contract
- Verify JSON files named correctly (1.json, 2.json, etc.)
- Try different IPFS gateway

## 📞 Support

Issues? Check:
1. `.env.local` has all correct values
2. Contract address updated after deployment
3. Pinata files uploaded successfully
4. Base network selected in wallet
5. Sufficient ETH for gas fees

## 🎉 Success!

Once complete, you have:
- ✅ Beautiful NFT achievement cards
- ✅ All metadata on IPFS via Pinata
- ✅ New gas-optimized contract on Base
- ✅ All 40 achievements configured
- ✅ Working admin panel integration
- ✅ Functional profile page minting
- ✅ Users can mint achievements to wallets
- ✅ NFTs visible on OpenSea/marketplaces

**Your achievement system is now live! 🚀**
