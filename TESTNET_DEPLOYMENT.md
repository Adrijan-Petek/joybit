# 🧪 Testnet Deployment Guide

## Prerequisites

### 1. Get Testnet ETH
You'll need Base Sepolia ETH for:
- Contract deployment (~0.01 ETH)
- Testing transactions (~0.005 ETH)

**Faucets:**
- Alchemy Base Sepolia Faucet: https://www.alchemy.com/faucets/base-sepolia
- Coinbase Wallet Faucet: https://portal.cdp.coinbase.com/products/faucet

### 2. Get LINK Tokens (for CardGame VRF)
**Chainlink Faucet:**
- https://faucets.chain.link/base-sepolia

### 3. Setup Environment

Create `.env` file in project root:

```bash
# Deployment Account
PRIVATE_KEY=your_testnet_private_key_here

# Network Configuration
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=your_basescan_api_key_here
```

## Deployment Steps

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Compile Contracts
```bash
npx hardhat compile
```

### Step 3: Run Tests (Optional but Recommended)
```bash
npx hardhat test
```

### Step 4: Deploy to Base Sepolia
```bash
npx hardhat run scripts/deploy-testnet.js --network baseSepolia
```

### Step 5: Setup Chainlink VRF (for CardGame)

1. **Create VRF Subscription**
   - Go to: https://vrf.chain.link
   - Connect wallet to Base Sepolia
   - Create new subscription
   - Fund with LINK (minimum 5 LINK recommended)

2. **Add CardGame as Consumer**
   - Copy CardGame contract address from deployment output
   - Add as consumer in VRF subscription UI
   - Save subscription ID

3. **Update CardGame with Subscription**
   ```bash
   # In Hardhat console
   npx hardhat console --network baseSepolia
   
   # Then run:
   const CardGame = await ethers.getContractFactory("CardGame");
   const cardGame = await CardGame.attach("CARD_GAME_ADDRESS");
   await cardGame.setSubscriptionId(YOUR_SUBSCRIPTION_ID);
   ```

### Step 6: Configure Frontend

Copy the environment variables from deployment output to `.env.local`:

```bash
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_JOYBIT_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_TREASURY_ADDRESS=0x...
NEXT_PUBLIC_ACCESS_CONTROL_ADDRESS=0x...
NEXT_PUBLIC_GAME_SETTINGS_ADDRESS=0x...
NEXT_PUBLIC_BOOSTER_SHOP_ADDRESS=0x...
NEXT_PUBLIC_JOYBIT_GAME_ADDRESS=0x...
NEXT_PUBLIC_DAILY_CLAIM_ADDRESS=0x...
NEXT_PUBLIC_CARD_GAME_ADDRESS=0x...
NEXT_PUBLIC_ADMIN_WALLET_ADDRESS=0x...
```

### Step 6: Start Frontend
```bash
npm run dev
```

## Post-Deployment Configuration

### Initial Game Settings (Optional)

Connect to testnet and run these admin functions:

1. **Set Game Fee**
   ```javascript
   // From admin panel or console
   await joybitGame.setPaidGameFee(ethers.parseEther("0.001"));
   ```

2. **Set Booster Prices**
   ```javascript
   await boosterShop.updatePrices(
     ethers.parseEther("0.0001"), // hammer
     ethers.parseEther("0.0002"), // shuffle
     ethers.parseEther("0.0003")  // colorBomb
   );
   ```

3. **Set Daily Claim Rewards**
   ```javascript
   await dailyClaim.updateBaseReward(ethers.parseEther("1000"));
   await dailyClaim.updateStreakBonus(ethers.parseEther("200"));
   ```

## Verification (Optional)

Verify contracts on BaseScan for transparency:

```bash
# Install verification plugin
npm install --save-dev @nomicfoundation/hardhat-verify

# Verify contracts
npx hardhat verify --network baseSepolia TREASURY_ADDRESS
npx hardhat verify --network baseSepolia ACCESS_CONTROL_ADDRESS "DEPLOYER_ADDRESS"
npx hardhat verify --network baseSepolia GAME_SETTINGS_ADDRESS
npx hardhat verify --network baseSepolia BOOSTER_SHOP_ADDRESS
npx hardhat verify --network baseSepolia JOYBIT_GAME_ADDRESS "GAME_SETTINGS_ADDRESS" "JOYBIT_TOKEN_ADDRESS" "TREASURY_ADDRESS"
npx hardhat verify --network baseSepolia DAILY_CLAIM_ADDRESS "JOYBIT_TOKEN_ADDRESS" "TREASURY_ADDRESS"
npx hardhat verify --network baseSepolia CARD_GAME_ADDRESS "TREASURY_ADDRESS"
```

## Testing on Testnet

### Test User Flow

1. **Connect Wallet** to Base Sepolia
2. **Get Test Tokens**
   - Use faucet to get ETH
   - Claim test JOYB from contract (if public mint available)

3. **Test Games**
   - Play free Match-3 game
   - Play paid Match-3 game (requires ETH)
   - Try 3-Card game
   - Claim daily rewards

4. **Test Boosters**
   - Buy boosters with ETH
   - Use boosters in game

5. **Admin Functions** (owner only)
   - Withdraw from treasury
   - Update game fees
   - Update booster prices
   - Pause/unpause contracts

## Troubleshooting

### Common Issues

**1. "Insufficient funds" error**
- Get more testnet ETH from faucet
- Check wallet is connected to Base Sepolia

**2. CardGame not working**
- Check contract is funded with ETH
- Verify play fee and win amount are set
- Check cooldown period hasn't expired

**3. Frontend not connecting**
- Verify .env.local has correct addresses
- Check chainId is set to 84532
- Ensure MetaMask is on Base Sepolia network

**4. Transactions failing**
- Check contract is not paused
- Verify sender is authorized (for owner-only functions)
- Ensure sufficient gas fees

### Getting Help

- Check deployment logs in `deployments/testnet-deployment.json`
- Review transaction on BaseScan: https://sepolia.basescan.org
- Check contract events for error details

## Network Information

**Base Sepolia Testnet**
- Chain ID: 84532
- RPC URL: https://sepolia.base.org
- Explorer: https://sepolia.basescan.org
- Faucet: https://www.alchemy.com/faucets/base-sepolia

**Chainlink VRF (Base Sepolia)**
- Coordinator: 0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE
- Key Hash: 0xd4bb89654db74673a187bd804519e65e3f71a52bc55f11da7601a13dcf505314
- Premium: 0.0005 LINK
- Max Gas: 2,500,000

## Security Notes

⚠️ **IMPORTANT**: This is TESTNET only!

- Private keys are for testing only
- Don't use mainnet private keys
- Test tokens have no real value
- Always test thoroughly before mainnet deployment

## Next Steps

After successful testnet deployment and testing:

1. ✅ Verify all game mechanics work
2. ✅ Test admin functions
3. ✅ Check gas costs
4. ✅ Review smart contract security
5. ✅ Prepare for mainnet deployment

---

**Need Help?** Check the main README.md or create an issue.
