# Achievement Contract Deployment Guide

## Step-by-Step Process

### 1. ✅ Generate Achievement Cards
```bash
npm run generate-cards
```
This creates 40 PNG images in `public/achievement-cards/`

### 2. 🗑️ Clean Pinata (DO THIS FIRST!)
1. Go to [Pinata Cloud](https://app.pinata.cloud/)
2. Delete all existing files related to Joybit achievements
3. Start with a clean slate

### 3. 📤 Upload to Pinata
```bash
npm run upload-ipfs
```
This will:
- Upload all 40 achievement card images to IPFS
- Create and upload metadata JSON for each achievement
- Save results to `achievement-ipfs-results.json`
- Give you the base URI for the contract

### 4. 📝 Get Base URI
After upload completes, you have two options:

**Option A: Create Pinata Folder (Recommended)**
1. In Pinata, create a new folder called "joybit-achievements"
2. Upload all 40 JSON files (1.json through 40.json) to this folder
3. Get the folder CID
4. Your base URI will be: `ipfs://YOUR_FOLDER_CID/`
5. Contract will append `{id}.json` automatically

**Option B: Use Individual Hashes**
- Each achievement has its own hash
- Less gas-efficient for contract updates
- Use if you want more control

### 5. 🚀 Deploy Contract
```bash
npm run deploy-achievement
```
This deploys the new AchievementERC1155 contract with:
- Treasury address from env
- Base metadata URI (placeholder initially)
- All existing contracts unchanged

### 6. 📝 Update Environment
After deployment, update `.env.local`:
```env
NEXT_PUBLIC_ACHIEVEMENT_ERC1155_ADDRESS=0xNEW_CONTRACT_ADDRESS
```

### 7. 🔄 Update Contract Base URI
You'll need to call `setBaseMetadataURI` on the contract with your Pinata folder hash.

Option A: Using Admin Panel
1. Go to `/admin`
2. Add a function to update base URI
3. Sign transaction

Option B: Using Hardhat Console
```bash
npx hardhat console --network base
const Achievement = await ethers.getContractAt("AchievementERC1155", "0xNEW_ADDRESS")
await Achievement.setBaseMetadataURI("ipfs://YOUR_FOLDER_CID/")
```

### 8. ➕ Add All Achievements
Via Admin Panel:
1. Go to `/admin` → Achievements tab
2. Click "Add to Contract" for each achievement
3. Or use bulk add script (will create one)

### 9. ✅ Verify Contract (Optional)
```bash
npx hardhat verify --network base YOUR_CONTRACT_ADDRESS "TREASURY_ADDRESS" "ipfs://YOUR_FOLDER_CID/"
```

## Contract Improvements

### Gas Optimizations:
- ✅ Removed unnecessary `_achievementExists[id]` check in `addAchievement`
- ✅ Allows overwriting achievements (admin flexibility)
- ✅ Maintains backward compatibility
- ✅ Uses uint240 for prices (gas efficient packing)
- ✅ Immutable treasury address

### Features:
- ✅ Soulbound (non-transferable)
- ✅ Can add any achievement at any time
- ✅ Backend gasless minting capability
- ✅ User-paid minting with configurable prices
- ✅ Active/inactive toggle per achievement
- ✅ Full ERC1155 metadata support

## Achievement Pricing (Suggested)

- Common: 0.00003 ETH (~$0.10)
- Rare: 0.0001 ETH (~$0.30)
- Epic: 0.0003 ETH (~$1.00)
- Legendary: 0.001 ETH (~$3.00)
- Mythic: 0.003 ETH (~$10.00)

Adjust based on Base network gas costs and your economics.

## Testing

### Local Testing:
```bash
npx hardhat test
```

### Mainnet Testing:
1. Deploy contract
2. Add 1-2 test achievements
3. Mint from UI
4. Check OpenSea/Rarible metadata display
5. Verify on BaseScan

## Rollback Plan

If issues occur:
1. Old contract still works: `0x6032d7F9514393C470269e88fC350053a6b1AE0a`
2. Can revert env variable
3. No data loss (database achievements intact)
4. Users keep existing NFTs on old contract

## Post-Deployment Checklist

- [ ] Contract deployed successfully
- [ ] Base URI updated with Pinata folder
- [ ] All 40 achievements added to contract
- [ ] Test mint from UI works
- [ ] Metadata displays correctly on OpenSea
- [ ] Admin panel shows new contract
- [ ] Profile page minting works
- [ ] Contract verified on BaseScan
- [ ] Update documentation with new address

## Support

If you encounter issues:
1. Check gas prices on Base
2. Verify Pinata uploads completed
3. Confirm env variables are correct
4. Check contract ownership
5. Review transaction logs on BaseScan
