# Getting Started with Joybit

## Prerequisites

Before you begin, ensure you have the following:

### System Requirements
- **Node.js**: Version 18.0 or higher
- **MetaMask**: Latest version installed
- **Base Sepolia ETH**: Testnet tokens for gameplay

### Recommended Tools
- **VS Code**: For development
- **Git**: Version control
- **Yarn/NPM**: Package management

## 🚀 Quick Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Adrijan-Petek/joybit.git
cd joybit
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Network Configuration
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_BASE_TESTNET_RPC_URL=https://sepolia.base.org

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Admin Configuration
NEXT_PUBLIC_ADMIN_WALLET_ADDRESS=0xYourAdminAddress

# Database (Turso)
TURSO_DATABASE_URL=your_database_url
TURSO_AUTH_TOKEN=your_auth_token

# Security Configuration
SECURITY_MAX_REQUESTS_PER_MINUTE=60
SECURITY_MAX_REQUESTS_PER_HOUR=1000
SECURITY_BLOCK_DURATION_MINUTES=15
SECURITY_SQL_INJECTION_DETECTION=true
SECURITY_XSS_DETECTION=true
SECURITY_INPUT_VALIDATION=true

# Contract Addresses (after deployment)
NEXT_PUBLIC_JOYBIT_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_JOYBIT_GAME_ADDRESS=0x...
NEXT_PUBLIC_CARD_GAME_ADDRESS=0x...
NEXT_PUBLIC_DAILY_CLAIM_ADDRESS=0x...
NEXT_PUBLIC_TREASURY_ADDRESS=0x...
```

### 4. Get Testnet ETH

Visit the [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet) to get free test ETH.

### 5. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to start playing!

## 🎮 First Game Session

### Connect Your Wallet
1. Click "Connect Wallet" in the top right
2. Select MetaMask (or your preferred Web3 wallet)
3. Approve the connection request
4. Switch to Base Sepolia testnet if prompted

### Choose Your Game
- **Match-3**: Strategic tile-matching with progressive difficulty
- **Card Game**: Luck-based strategy with blockchain randomness
- **Daily Claim**: Build streaks for maximum rewards

### Start Playing
1. Select a game from the main menu
2. Pay the entry fee (test ETH)
3. Follow on-screen instructions
4. Claim your JOYB token rewards!

## 🛡️ Security Features

Joybit includes enterprise-grade security:

- **Real-time Threat Detection**: Monitors for SQL injection, XSS, and suspicious patterns
- **Rate Limiting**: Prevents abuse with configurable request limits
- **IP Blocking**: Automatic blocking of malicious actors
- **Audit Logging**: Comprehensive security event tracking

## 📊 Admin Access

For administrative access:

1. Use the admin wallet address specified in `.env.local`
2. Navigate to `/admin` route
3. Access security dashboard, theme management, and analytics

## 🏗️ Development Workflow

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Testing
npm run test         # Run all tests
npm run test:watch   # Run tests in watch mode

# Contracts
npm run compile      # Compile Solidity contracts
npm run deploy:test  # Deploy to testnet
npm run deploy:main  # Deploy to mainnet

# Database
npm run db:setup     # Initialize database tables
npm run db:migrate   # Run database migrations

# Security
npm run security:check # Run security audit
npm run security:logs  # View security logs
```

### Project Structure

```
joybit/
├── app/                    # Next.js app directory
│   ├── admin/             # Admin dashboard
│   ├── api/               # API routes
│   ├── card-game/         # Card game page
│   ├── daily-claim/       # Daily claim page
│   ├── game/              # Match-3 game page
│   └── leaderboard/       # Leaderboard page
├── components/            # React components
├── contracts/             # Solidity contracts
├── lib/                   # Utility libraries
├── proxy.ts              # Security proxy (Next.js 16)
├── public/               # Static assets
└── wiki/                 # Documentation
```

## 🔧 Troubleshooting

### Common Issues

**Wallet Connection Issues:**
- Ensure MetaMask is unlocked
- Check if you're on Base Sepolia network
- Verify RPC URL in wallet settings

**Transaction Failures:**
- Check ETH balance
- Verify contract addresses
- Ensure gas limit is sufficient

**Build Errors:**
- Clear node_modules: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version`
- Verify environment variables

### Getting Help

- **🐛 Issues**: [GitHub Issues](https://github.com/Adrijan-Petek/joybit/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/Adrijan-Petek/joybit/discussions)
- **📧 Contact**: adrijan@joybit.game

## 📚 Next Steps

- [Explore Games](Games/Match-3-Puzzle.md)
- [Security Features](Security/Security-Dashboard.md)
- [API Documentation](Technical/API-Reference.md)
- [Deployment Guide](Deployment.md)</content>
<parameter name="filePath">/home/mobb/Downloads/Joybit/wiki/Getting-Started.md