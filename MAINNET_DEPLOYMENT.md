# 🚀 Base Mainnet Deployment Checklist

## ✅ Pre-Deployment Configuration

### 1. Environment Setup
All configuration files have been updated for Base mainnet:

- ✅ **Wagmi Config** (`components/providers.tsx`)
  - Using Base mainnet only (Chain ID: 8453)
  - Removed testnet chains
  
- ✅ **Hardhat Config** (`hardhat.config.js`)
  - Base mainnet RPC: `https://mainnet.base.org`
  - Chain ID: 8453
  - Etherscan verification configured

- ✅ **Contract Addresses** (`lib/contracts/addresses.ts`)
  - Reads from environment variables
  - Configured for Base mainnet

### 2. Required Environment Variables

Create `.env.local` file with:

```bash
# Network Configuration (Base Mainnet)
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org

# WalletConnect (Required)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Contract Addresses (Fill after deployment)
NEXT_PUBLIC_JOYBIT_TOKEN_ADDRESS=0xc732932ca7db558cf1bacc17b4f4f7e149e0eb07
NEXT_PUBLIC_TREASURY_ADDRESS=
NEXT_PUBLIC_MATCH3_ADDRESS=
NEXT_PUBLIC_CARDGAME_ADDRESS=
NEXT_PUBLIC_DAILYCLAIM_ADDRESS=

# Admin Wallet (Your address)
NEXT_PUBLIC_ADMIN_WALLET_ADDRESS=your_admin_address
```

Create `.env` file for Hardhat:

```bash
# Deployment Private Key (NO 0x PREFIX!)
PRIVATE_KEY=your_private_key_without_0x

# BaseScan API Key (For verification)
BASESCAN_API_KEY=your_basescan_api_key

# Network Configuration
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
```

## 📋 Deployment Steps

### Step 1: Get Required API Keys

1. **WalletConnect Project ID**
   - Go to https://cloud.walletconnect.com
   - Create a new project
   - Copy the Project ID

2. **BaseScan API Key** (Optional but recommended)
   - Go to https://basescan.org/apis
   - Sign up and create an API key
   - Used for contract verification

### Step 2: Fund Deployer Wallet

Your deployer wallet needs ETH on Base mainnet for:
- Contract deployment gas fees (~0.02 ETH estimated)
- Contract interactions
- Initial setup transactions

**Get Base ETH:**
- Bridge from Ethereum mainnet: https://bridge.base.org
- Buy on exchanges that support Base
- Use Coinbase (free transfers to Base)

### Step 3: Deploy Contracts

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Deploy to Base mainnet
npx hardhat run scripts/deploy.js --network base
```

**Expected Output:**
```
🚀 Starting Joybit deployment to Base...
Deploying contracts with account: 0x...
Account balance: ...

🪙 Using Joybit Token at: 0xc732932ca7db558cf1bacc17b4f4f7e149e0eb07

📦 Deploying Treasury...
✅ Treasury deployed to: 0x...

📦 Deploying Match3Game...
✅ Match3Game deployed to: 0x...

📦 Deploying CardGame...
✅ CardGame deployed to: 0x...

📦 Deploying DailyClaim...
✅ DailyClaim deployed to: 0x...
```

### Step 4: Update Environment Variables

Copy the deployed addresses to `.env.local`:

```bash
NEXT_PUBLIC_TREASURY_ADDRESS=0x... # From deployment output
NEXT_PUBLIC_MATCH3_ADDRESS=0x...    # From deployment output
NEXT_PUBLIC_CARDGAME_ADDRESS=0x...  # From deployment output
NEXT_PUBLIC_DAILYCLAIM_ADDRESS=0x... # From deployment output
```

### Step 5: Verify Contracts on BaseScan

```bash
# Verify Treasury
npx hardhat verify --network base <TREASURY_ADDRESS>

# Verify Match3Game
npx hardhat verify --network base <MATCH3_ADDRESS> <TREASURY_ADDRESS>

# Verify CardGame
npx hardhat verify --network base <CARDGAME_ADDRESS> <TREASURY_ADDRESS>

# Verify DailyClaim
npx hardhat verify --network base <DAILYCLAIM_ADDRESS> <TREASURY_ADDRESS>
```

### Step 6: Configure Contracts

After deployment, set up the contracts:

```bash
# You may need to run these transactions from the admin wallet
# Either through Hardhat console or BaseScan's write contract interface

# 1. Set approved games in Treasury
# 2. Configure play fees
# 3. Set level rewards
# 4. Test with small amounts first
```

### Step 7: Test the Frontend

```bash
# Run the development server
npm run dev

# Open http://localhost:3000
# Connect your wallet (Base mainnet)
# Test all features:
# - Match-3 game
# - Card game  
# - Daily claim
# - Leaderboard
# - Profile
```

## 🔍 Verification Checklist

Before going live:

- [ ] All contracts deployed successfully
- [ ] Contract addresses in `.env.local`
- [ ] Contracts verified on BaseScan
- [ ] WalletConnect configured
- [ ] Can connect wallet on Base mainnet
- [ ] Match-3 game starts and plays
- [ ] Card game works
- [ ] Daily claim functional
- [ ] Leaderboard displays correctly
- [ ] Profile shows user stats
- [ ] Add App button works (Farcaster)
- [ ] Recast button works (Farcaster)
- [ ] Follow button links to profile
- [ ] Audio plays correctly
- [ ] All images load

## 🌐 Production Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard:
# - NEXT_PUBLIC_CHAIN_ID
# - NEXT_PUBLIC_BASE_RPC_URL
# - NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
# - NEXT_PUBLIC_JOYBIT_TOKEN_ADDRESS
# - NEXT_PUBLIC_TREASURY_ADDRESS
# - NEXT_PUBLIC_MATCH3_ADDRESS
# - NEXT_PUBLIC_CARDGAME_ADDRESS
# - NEXT_PUBLIC_DAILYCLAIM_ADDRESS
# - NEXT_PUBLIC_ADMIN_WALLET_ADDRESS
```

### Set up Custom Domain (Optional)

1. Add domain in Vercel dashboard
2. Update DNS records
3. Enable HTTPS

## 🎮 Joybit Token Information

**Token Address (Base Mainnet):**
`0xc732932ca7db558cf1bacc17b4f4f7e149e0eb07`

**Token Details:**
- Name: Joybit Token
- Symbol: JOYB
- Decimals: 18
- Chain: Base (8453)

**Links:**
- BaseScan: https://basescan.org/token/0xc732932ca7db558cf1bacc17b4f4f7e149e0eb07
- Uniswap: https://app.uniswap.org/#/swap?outputCurrency=0xc732932ca7db558cf1bacc17b4f4f7e149e0eb07&chain=base

## 🔐 Security Reminders

- ✅ NEVER commit `.env` or `.env.local` files
- ✅ Keep private keys secure
- ✅ Use different wallets for deployment and admin
- ✅ Test everything on testnet first if possible
- ✅ Start with small amounts for rewards
- ✅ Monitor contract interactions
- ✅ Have emergency pause mechanisms ready

## 📊 Post-Deployment Monitoring

1. **Watch contract activity** on BaseScan
2. **Monitor gas usage** for optimizations
3. **Track user interactions**
4. **Check error logs** in Vercel
5. **Test regularly** from different devices

## 🆘 Troubleshooting

### Common Issues:

**"Insufficient funds for gas"**
- Add more ETH to deployer wallet
- Check current Base gas prices

**"Contract verification failed"**
- Check constructor arguments match
- Ensure BaseScan API key is correct
- Try manual verification on BaseScan

**"Wallet not connecting"**
- Check WalletConnect Project ID
- Verify network is Base (8453)
- Clear browser cache

**"Contract calls failing"**
- Verify contract addresses in `.env.local`
- Check wallet is on Base mainnet
- Ensure contracts are initialized properly

## 📝 Contract Addresses Summary

After deployment, your addresses will be:

| Contract     | Address | BaseScan Link |
|--------------|---------|---------------|
| Joybit Token | `0xc732932ca7db558cf1bacc17b4f4f7e149e0eb07` | ✅ Pre-deployed |
| Treasury     | `TBD` | Add after deployment |
| Match3Game   | `TBD` | Add after deployment |
| CardGame     | `TBD` | Add after deployment |
| DailyClaim   | `TBD` | Add after deployment |

## ✨ Ready to Deploy!

All configurations are set for Base mainnet deployment. Follow the steps above and you'll be live! 🚀

---

**Need Help?**
- Base Docs: https://docs.base.org
- Hardhat Docs: https://hardhat.org/docs
- BaseScan: https://basescan.org
