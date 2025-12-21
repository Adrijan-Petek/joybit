# 🎮 JOYBIT - Blockchain Gaming Platform

Decentralized gaming platform on Base blockchain featuring Match-3 puzzle, 3-Card game, and Daily Claim rewards. Built with Next.js, Solidity, and JOYB token economy.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Smart Contracts](#smart-contracts)
- [Installation](#installation)
- [Deployment Guide](#deployment-guide)
- [Game Mechanics](#game-mechanics)
- [Reward System](#reward-system)
- [Admin Panel](#admin-panel)
- [Testing](#testing)
- [Architecture](#architecture)
- [Troubleshooting](#troubleshooting)

## ⚡ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env.local
# Edit .env.local with your values

# 3. Run development server
npm run dev

# 4. Deploy contracts (testnet)
npx hardhat run scripts/deploy-testnet.js --network baseSepolia
```

**Open** [http://localhost:3000](http://localhost:3000)

---

## ✨ Features

### 🎮 Three Games
- **JoybitGame (Match-3)**: 8x8 grid tile-matching with score targets
- **CardGame (3-Card)**: Luck-based card flip game
- **DailyClaim**: Daily streak rewards system

### 💎 JOYB Token Economy
- **Unified Rewards**: All games reward in JOYB tokens
- **User Claims**: Players claim their own rewards (no admin needed)
- **Play Fees**: Pay ETH to play (goes to Treasury)
- **Win Rewards**: Earn JOYB tokens (claim from profile)

### 🔐 Security Features
- ReentrancyGuard on all critical functions
- Access control for admin operations
- Block-based randomness for CardGame
- Treasury with withdrawal limits
- Pausable emergency controls

## 🔧 Tech Stack

**Frontend**: Next.js 14, TypeScript, TailwindCSS, Wagmi v2, RainbowKit  
**Blockchain**: Solidity 0.8.22+, Hardhat, OpenZeppelin, Base Sepolia  
**Token**: ERC20 (JOYB) with 18 decimals

---

## 📜 Smart Contracts

### Core Contracts

| Contract | Purpose | Key Functions |
|----------|---------|---------------|
| **JoybitToken** | ERC20 game token | `transfer`, `approve`, `mint` (owner) |
| **JoybitGame** | Match-3 gameplay | `submitResult`, `claimReward`, `distributeReward` |
| **CardGame** | 3-card game | `playCard`, `claimReward`, uses JOYB rewards |
| **DailyClaim** | Daily rewards | `claim`, `claimReward`, streak tracking |
| **Treasury** | Fund management | `fundRewards`, `withdraw`, authorization |
| **BoosterShop** | In-game items | `purchaseBooster`, price management |
| **GameSettings** | Configuration | Level settings, tile sets |
| **AccessControl** | Permissions | Admin roles, access management |

### Contract Addresses (Base Sepolia)
After deployment, addresses are in `deployments/testnet-deployment.json`

---

## 🚀 Installation

### Prerequisites
- Node.js 18+
- MetaMask wallet
- Base Sepolia testnet ETH ([Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet))

### Setup Steps

1. **Install Dependencies**
```bash
npm install
```

2. **Environment Configuration**
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Network
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_BASE_TESTNET_RPC_URL=https://sepolia.base.org

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=get_from_walletconnect.com

# Admin Wallet
NEXT_PUBLIC_ADMIN_WALLET_ADDRESS=0xYourAddress

# Deployment Key
PRIVATE_KEY=your_private_key_without_0x
```

3. **Compile Contracts**
```bash
npx hardhat compile
```

4. **Run Tests**
```bash
npx hardhat test
```
Expected: **293 passing, 4 pending**

5. **Start Development**
```bash
npm run dev
```

---

## 🌐 Deployment Guide

### Deploy to Base Sepolia (Testnet)

1. **Fund Wallet**
   - Get Base Sepolia ETH from [faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
   - Minimum: ~0.02 ETH for all contracts

2. **Deploy All Contracts**
```bash
npx hardhat run scripts/deploy-testnet.js --network baseSepolia
```

3. **Deployment Output**
   - Addresses saved to `deployments/testnet-deployment.json`
   - Transaction hashes logged to console
   - Verification URLs for BaseScan

4. **Update Frontend**
```bash
# Copy addresses from deployment output to .env.local
NEXT_PUBLIC_JOYBIT_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_JOYBIT_GAME_ADDRESS=0x...
NEXT_PUBLIC_CARD_GAME_ADDRESS=0x...
NEXT_PUBLIC_DAILY_CLAIM_ADDRESS=0x...
NEXT_PUBLIC_TREASURY_ADDRESS=0x...
NEXT_PUBLIC_BOOSTER_SHOP_ADDRESS=0x...
NEXT_PUBLIC_GAME_SETTINGS_ADDRESS=0x...
NEXT_PUBLIC_ACCESS_CONTROL_ADDRESS=0x...
```

5. **Verify Contracts** (Optional)
```bash
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### Deploy to Mainnet

⚠️ **IMPORTANT**: Only after extensive testnet testing!

```bash
npx hardhat run scripts/deploy-testnet.js --network base
```

---

## 🎮 Game Mechanics

### Match-3 Game (JoybitGame)

**How to Play:**
1. Connect wallet
2. Select level (different fees/rewards)
3. Pay play fee in ETH
4. Match 3+ tiles by swapping adjacent pieces
5. Reach target score before time runs out
6. Win → Pending rewards tracked in JOYB
7. Go to Profile → Claim Rewards

**Scoring:**
- 3 tiles: 30 points
- 4 tiles: 80 points (2.67x)
- 5 tiles: 150 points (5x)
- 6+ tiles: 200+ points (6.67x+)

**Rewards:** 
- Fee: 0.001 ETH → Treasury
- Win: JOYB tokens → User claims from profile

---

### 3-Card Game (CardGame)

**How to Play:**
1. Choose 1 of 3 cards
2. Pay fee (0.002 ETH default)
3. Block randomness determines win
4. Win rate: ~33.3%
5. Win → Pending rewards in JOYB
6. Go to Profile → Claim Rewards

**Economics:**
- Play Fee: 0.002 ETH (configurable)
- Win Amount: JOYB tokens (configurable)
- Funding: Owner transfers JOYB to contract

---

### Daily Claim (DailyClaim)

**How it Works:**
1. Claim once per 24 hours
2. Build streaks for bonuses
3. Rewards accumulate in pending balance
4. Go to Profile → Claim Rewards

**Rewards Structure:**
- Base: 0.001 JOYB
- Streak bonus: +0.0002 JOYB per day
- Max bonus: 0.002 JOYB (10-day streak)

---

## 💰 Reward System

### How Rewards Work

**All games use JOYB token rewards:**

```
┌─────────────┐
│  Play Game  │ → Pay ETH fee → Treasury
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Win/Claim  │ → pendingRewards[player] += amount
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Profile   │ → User clicks "Claim Rewards"
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ JOYB Tokens │ → Transferred to player wallet
└─────────────┘
```

### Claim Rewards (Profile Page)

All rewards from all 3 games go to **Profile page** for claiming:

1. **JoybitGame rewards** → Claim button
2. **CardGame rewards** → Claim button  
3. **DailyClaim rewards** → Claim button

**How to Claim:**
```solidity
// User calls from frontend
joybitGame.claimReward()   // Claims Match-3 rewards
cardGame.claimReward()      // Claims CardGame rewards
dailyClaim.claimReward()    // Claims Daily rewards
```

**Check Pending:**
```solidity
joybitGame.pendingRewards(playerAddress)
cardGame.pendingRewards(playerAddress)
dailyClaim.pendingRewards(playerAddress)
```

---

## 🛠️ Admin Panel

### Access
1. Click Joybit logo **10 times** on homepage
2. Connect with authorized admin wallet
3. Panel unlocks if wallet matches `NEXT_PUBLIC_ADMIN_WALLET_ADDRESS`

### Admin Features

**GameSettings:**
- Configure play fees (ETH)
- Set win rewards (JOYB)
- Update CardGame settings
- View contract addresses

**Treasury Management:**
- View total balance
- Withdraw fees collected
- Emergency controls
- Authorize/deauthorize contracts

**Access Control:**
- Add/remove admin wallets
- View all administrators
- Manage permissions

---

## 🧪 Testing

### Run All Tests
```bash
npx hardhat test
```

**Expected Output:**
```
  JoybitGame Contract
    ✓ Deployment
    ✓ Should submit result and track rewards
    ✓ Should claim rewards
    ... (60 more tests)
    
  CardGame Contract
    ✓ Should use JOYB tokens for rewards
    ✓ Should allow users to claim
    ... (40 more tests)
    
  DailyClaim Contract  
    ✓ Should track streaks
    ✓ Should distribute JOYB rewards
    ... (50 more tests)
    
  293 passing (9s)
  4 pending
```

### Gas Optimization Tests
4 gas tests are skipped due to `.transfer()` gas limit requirements. This is expected behavior.

### Test Coverage
```bash
npx hardhat coverage
```

---

## 🏗️ Architecture

### Contract Flow

```
┌─────────────────┐
│  JoybitToken    │ ← ERC20 token (JOYB)
└────────┬────────┘
         │ transfers
         ▼
┌─────────────────┐     ┌──────────────┐
│   JoybitGame    │────→│   Treasury   │
│   CardGame      │────→│  (Fees ETH)  │
│   DailyClaim    │────→│              │
└─────────────────┘     └──────────────┘
         │
         │ rewards (JOYB)
         ▼
┌─────────────────┐
│  Player Wallet  │
└─────────────────┘
```

### Reward Distribution

**Method 1: User Claims (Recommended)**
```solidity
// User-initiated (gas paid by user)
contract.claimReward()
```

**Method 2: Admin Distributes**
```solidity
// Admin-initiated (gas paid by admin)
contract.distributeReward(player, amount)
contract.batchDistributeRewards(players[], amounts[])
```

---

## 📁 Project Structure

```
joybit/
├── app/                    # Next.js pages
│   ├── game/              # Match-3 game
│   ├── card-game/         # 3-card game  
│   ├── daily-claim/       # Daily rewards
│   ├── profile/           # Claim rewards HERE
│   ├── leaderboard/       # Rankings
│   └── admin/             # Admin panel
├── contracts/             # Solidity contracts
│   ├── JoybitToken.sol    # ERC20 token
│   ├── JoybitGame.sol     # Match-3 logic
│   ├── CardGame.sol       # Card game (JOYB rewards)
│   ├── DailyClaim.sol     # Daily system
│   ├── Treasury.sol       # Fee management
│   ├── BoosterShop.sol    # Items
│   ├── GameSettings.sol   # Config
│   └── AccessControl.sol  # Permissions
├── scripts/
│   └── deploy-testnet.js  # Deployment script
├── test/                  # Hardhat tests
├── lib/
│   ├── contracts/         # ABIs & addresses
│   └── hooks/             # React hooks
└── components/            # React components
```

---

## 🐛 Troubleshooting

### Build Errors

**Error: BigInt not supported**
```bash
# Check tsconfig.json target is ES2020+
"target": "ES2020"
```

**Error: Module not found**
```bash
npm install
npm run build
```

### Contract Errors

**Error: Insufficient funds**
- Get testnet ETH from faucet
- Check wallet has enough balance

**Error: Contract not authorized**
- Only owner can call admin functions
- Check if contract authorized in Treasury

**Error: No rewards to claim**
- Play games first to earn rewards
- Check `pendingRewards` balance

### Frontend Issues

**Wallet won't connect**
- Check `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- Clear browser cache
- Try different wallet

**Transactions fail**
- Check network (Base Sepolia vs Mainnet)
- Verify contract addresses in `.env.local`
- Ensure sufficient gas

---

## 📊 Token Economics (JOYB)

### Initial Supply
- **Total**: 1,000,000,000 JOYB (1 billion)
- **Decimals**: 18
- **Owner**: Deployer wallet

### Distribution
- **Match-3 Rewards**: 100,000,000 JOYB
- **CardGame Rewards**: 1,000,000 JOYB  
- **DailyClaim Rewards**: 10,000,000 JOYB
- **Treasury**: Remaining balance

### Funding Games
```javascript
// Transfer JOYB to game contracts
joybitToken.transfer(joybitGameAddress, parseEther("100000000"))
joybitToken.transfer(cardGameAddress, parseEther("1000000"))  
joybitToken.transfer(dailyClaimAddress, parseEther("10000000"))
```

---

## 🔒 Security

### Implemented
✅ ReentrancyGuard on `claimReward()`, `distributeReward()`  
✅ Access control (onlyOwner, onlyAuthorized)  
✅ Withdrawal limits on Treasury  
✅ Pausable contracts for emergencies  
✅ Block-based randomness (casual game)  
✅ OpenZeppelin audited contracts  

### Recommendations
⚠️ Get professional audit before mainnet  
⚠️ Test extensively on testnet  
⚠️ Monitor contract balances  
⚠️ Set up multisig for admin wallet  

---

## 📝 Environment Variables

### Complete .env.local Template

```env
# Network
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_BASE_TESTNET_RPC_URL=https://sepolia.base.org

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Admin
NEXT_PUBLIC_ADMIN_WALLET_ADDRESS=0xYourAdminAddress

# Contract Addresses (after deployment)
NEXT_PUBLIC_JOYBIT_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_JOYBIT_GAME_ADDRESS=0x...
NEXT_PUBLIC_CARD_GAME_ADDRESS=0x...
NEXT_PUBLIC_DAILY_CLAIM_ADDRESS=0x...
NEXT_PUBLIC_TREASURY_ADDRESS=0x...
NEXT_PUBLIC_BOOSTER_SHOP_ADDRESS=0x...
NEXT_PUBLIC_GAME_SETTINGS_ADDRESS=0x...
NEXT_PUBLIC_ACCESS_CONTROL_ADDRESS=0x...

# Deployment (Hardhat)
PRIVATE_KEY=your_private_key
BASESCAN_API_KEY=optional_for_verification
```

---

## 🚢 Production Deployment

### Frontend (Vercel)

1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Ready for deployment"
git push origin main
```

2. **Deploy on Vercel**
   - Import repository
   - Add all environment variables
   - Deploy

3. **Update Contract Addresses**
   - After deploying contracts
   - Update Vercel environment variables
   - Redeploy frontend

### Contracts (Base Mainnet)

```bash
# Deploy to mainnet
npx hardhat run scripts/deploy-testnet.js --network base

# Verify on BaseScan
npx hardhat verify --network base <ADDRESS> <ARGS>
```

---

## 🎯 Key Differences from Other Projects

### Unified Token Economy
- **All rewards in JOYB** (not ETH)
- CardGame fixed to use JOYB tokens
- Consistent reward claiming across all games

### User-Centric Claims  
- **Players claim their own rewards**
- No admin overhead for distribution
- Profile page centralized claim hub

### Modular Architecture
- Each game is independent contract
- Treasury manages all ETH fees
- Games don't hold ETH (hold JOYB)

---

## 📞 Support

**Issues**: Open GitHub issue  
**Questions**: Check this README  
**Contributions**: Pull requests welcome

---

## 📜 License

MIT License - See LICENSE file

---

**Built on Base Sepolia** 🔵  
**Powered by JOYB Token** 💎  
**Play → Earn → Claim** 🎮
