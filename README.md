# 🎮 Joybit

<div align="center">

**A Decentralized Gaming Platform on Base Blockchain**

[![Next.js](https://img.shields.io/badge/Next.js-16.1+-000000?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.22+-363636?style=for-the-badge&logo=solidity)](https://soliditylang.org/)
[![Base](https://img.shields.io/badge/Base-Blockchain-0052FF?style=for-the-badge&logo=ethereum)](https://base.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.0+-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Turso](https://img.shields.io/badge/Turso-Database-000000?style=for-the-badge&logo=sqlite)](https://turso.tech/)

*Play • Earn • Own • Secure*

[🌐 Live Demo](https://joybit.vercel.app) • [📖 Documentation](docs/) • [🎯 Quick Start](#quick-start) • [🛡️ Security Dashboard](#security)

</div>

---

## ✨ Overview

**Joybit** is a cutting-edge decentralized gaming platform built on the Base blockchain, featuring three distinct games unified by the JOYB token economy. Players can enjoy Match-3 puzzles, strategic card games, and daily reward systems while earning and trading JOYB tokens.

### 🎯 Key Features

- **🎮 Three Unique Games**: Match-3 puzzles, 3-card strategy, and daily rewards
- **💎 Unified Token Economy**: All games reward in JOYB tokens
- **🏆 Achievement System**: Unlock NFTs and track progress
- **🎨 Advanced Theme System**: 18+ professional themes with full customization
- **🔊 Audio Controls**: Separate volume controls for music and sound effects
- **🔐 Decentralized Rewards**: Players claim their own earnings
- **🛡️ Advanced Security**: Real-time threat detection and monitoring
- **📱 Modern UI/UX**: Responsive design with smooth animations
- **⚡ Fast Transactions**: Optimized for Base network
- **📊 Admin Dashboard**: Comprehensive management and analytics

---

## � Documentation

Complete documentation for Joybit development and deployment:

### 🎮 Game Documentation
- **[Getting Started](docs/Getting-Started.md)** - Quick setup and first steps
- **[Home](docs/Home.md)** - Overview and architecture
- **[Games](docs/Games/)** - Game-specific documentation

### 🛡️ Security & Administration
- **[Security Dashboard](docs/Security/Security-Dashboard.md)** - Security monitoring and management
- **[Deployment Guide](docs/Deployment.md)** - Production deployment instructions

### 🔧 Technical Reference
- **[API Reference](docs/Technical/API-Reference.md)** - Complete API documentation
- **[Database Schema](docs/Technical/Database-Schema.md)** - Database structure and migrations

### 📋 Additional Resources
- **[Contributing Guide](docs/Contributing.md)** - How to contribute to the project
- **[Wiki Auto-Publish Setup](docs/Wiki-Publish-Setup.md)** - Set up automatic wiki publishing
- **[Mainnet Deployment](MAINNET_DEPLOYMENT.md)** - Mainnet deployment guide
- **[Testnet Deployment](TESTNET_DEPLOYMENT.md)** - Testnet deployment guide
- **[Farcaster Integration](FARCASTER_INTEGRATION_SUMMARY.md)** - Social features integration
- **[Notifications Setup](NOTIFICATIONS_SETUP.md)** - Push notification configuration

---

## �🚀 Quick Start

### Prerequisites

- **Node.js** 18.0 or higher
- **MetaMask** or compatible Web3 wallet
- **Base Sepolia** testnet ETH ([Get from faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet))

### Installation

```bash
# Clone the repository
git clone https://github.com/Adrijan-Petek/joybit.git
cd joybit

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

Visit **[http://localhost:3000](http://localhost:3000)** to start playing!

---

## 🎮 Games

### 🧩 Match-3 Puzzle (JoybitGame)

**Strategic tile-matching gameplay with progressive difficulty**

- **🎯 Objective**: Match 3+ tiles to reach score targets
- **💰 Entry Fee**: 0.001 ETH per level
- **🏆 Rewards**: JOYB tokens based on performance
- **⚡ Features**: 8x8 grid, time challenges, combo multipliers

**Scoring System:**
- 3 tiles: 30 points
- 4 tiles: 80 points (2.67× multiplier)
- 5 tiles: 150 points (5× multiplier)
- 6+ tiles: 200+ points (6.67×+ multiplier)

### 🃏 3-Card Game (CardGame)

**Luck-based strategy with blockchain randomness**

- **🎯 Objective**: Choose 1 of 3 face-down cards
- **💰 Entry Fee**: 0.002 ETH (configurable)
- **🏆 Win Rate**: ~33.3% with block-based randomness
- **⚡ Features**: Instant results, fair distribution

### 📅 Daily Claim (DailyClaim)

**Build streaks for maximum rewards**

- **🎯 Objective**: Claim daily rewards to build streaks
- **💰 Base Reward**: 0.001 JOYB tokens
- **🏆 Streak Bonus**: +0.0002 JOYB per consecutive day
- **⚡ Features**: Automatic tracking, NFT achievements

---

## 🏗️ Architecture

### Smart Contracts

| Contract | Purpose | Key Features |
|----------|---------|--------------|
| **JoybitToken** | ERC20 Token | JOYB token with 18 decimals |
| **JoybitGame** | Match-3 Logic | Score validation, reward distribution |
| **CardGame** | Card Game | Block randomness, JOYB rewards |
| **DailyClaim** | Daily Rewards | Streak tracking, NFT achievements |
| **Treasury** | Fund Management | ETH fee collection, authorized withdrawals |
| **GameSettings** | Configuration | Dynamic pricing, game parameters |
| **AccessControl** | Permissions | Role-based access, admin management |

### Tech Stack

**Frontend:**
- Next.js 16.1+ with App Router
- TypeScript for type safety
- TailwindCSS for styling
- Framer Motion for animations
- Wagmi v2 + RainbowKit for Web3
- Advanced theme system with CSS variables
- Audio context with separate volume controls

**Security & Middleware:**
- Next.js Proxy (Edge Runtime)
- Real-time threat detection
- Rate limiting and IP blocking
- Security event logging
- Admin dashboard with live monitoring

**Blockchain:**
- Solidity 0.8.22+
- OpenZeppelin contracts
- Hardhat development framework
- Base Sepolia testnet

**Database:**
- Turso (SQLite) for user data
- Security events and threat logs
- Achievement tracking
- Game statistics and analytics

---

## 💰 Token Economy

### JOYB Token

- **Total Supply**: 1,000,000,000 JOYB
- **Decimals**: 18
- **Standard**: ERC20
- **Utility**: Gaming rewards, NFT purchases

### Reward Distribution

```
Gameplay → ETH Fee → Treasury
    ↓
Win/Loss → JOYB Reward → Pending Balance
    ↓
Claim → Transfer → Player Wallet
```

### Economic Model

- **Play Fees**: ETH collected in Treasury
- **Win Rewards**: JOYB distributed from game contracts
- **Claim System**: User-initiated reward collection
- **Treasury**: Admin-managed fund distribution

---

## 🏆 Achievement System

Unlock exclusive NFTs and track your gaming progress:

### 🎖️ Achievement Categories

- **Match-3 Achievements**: First Win, Hot Streak, Gem Master, etc.
- **Card Game Achievements**: Card Novice, Card Winner, Card Expert, etc.
- **Daily Claim Achievements**: Daily Starter, Streak Master, Dedicated Player, etc.
- **General Achievements**: Well Rounded, High Scorer, Level Climber, etc.

### 🏅 Rarity Tiers

- **Common** (Yellow): Basic achievements
- **Rare** (Blue): Moderate challenges
- **Epic** (Purple): Advanced goals
- **Legendary** (Teal): Expert level
- **Mythic** (Rose): Ultimate challenges

---

## 🎨 Theme System

**Comprehensive theming with 18+ professional themes and full customization**

### 🎯 Available Themes

- **Default**: Classic Joybit purple theme
- **Dark**: Deep dark theme for night gaming
- **Neon**: Cyberpunk neon aesthetic
- **Retro**: 80s arcade style
- **Ocean**: Cool blue aquatic theme
- **Forest**: Natural green theme
- **Professional**: Corporate blue theme
- **Corporate**: Clean business theme
- **Minimal**: Simple black and white
- **Elegant**: Purple luxury theme
- **Tech**: Monospace developer theme
- **Sunset**: Warm orange theme
- **Midnight**: Deep blue night theme
- **Aurora**: Northern lights inspired
- **Cyberpunk**: Futuristic neon theme
- **Nature**: Earthy green theme

### ⚙️ Customization Options

- **Colors**: Primary, secondary, accent, background, surface, text, borders
- **Typography**: Font family, size, headline size
- **Layout**: Border radius, spacing, shadows
- **Animation**: None, minimal, or full animations
- **Persistence**: Themes saved to localStorage

### 🔧 Admin Controls

Admin panel includes:
- **🎨 Theme Management**: Theme preset selection and full color customization
- **🎵 Audio Settings**: Global audio controls and volume management
- **📊 Game Analytics**: Real-time statistics and player metrics
- **🛡️ Security Dashboard**: Threat monitoring, IP blocking, and security logs
- **⚙️ System Configuration**: Game parameters and contract settings
- **👥 User Management**: Player data and achievement tracking
- **💰 Treasury Management**: Fund distribution and withdrawal controls

---

## 🔊 Audio System

**Professional audio controls with separate volume management**

### 🎵 Features

- **Music Volume**: Background music control
- **Sound Effects**: Game sound effects volume
- **Mute Controls**: Individual mute toggles
- **Persistent Settings**: Volume preferences saved
- **Theme Integration**: Audio controls match current theme

### 🎮 Audio Context

- Global audio state management
- Separate volume controls for different audio types
- Smooth volume transitions
- Accessibility-friendly controls

---

## 🔧 Development

### Environment Setup

Create `.env.local` with the following variables:

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

### Testing

```bash
# Run comprehensive test suite
npx hardhat test

# Expected: 293 passing tests
# Includes unit tests, integration tests, and gas optimization checks
```

---

## 🌐 Deployment

### Testnet Deployment (Base Sepolia)

```bash
# Deploy all contracts
npx hardhat run scripts/deploy-testnet.js --network baseSepolia

# Verify contracts on BaseScan
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS>
```

### Production Deployment

```bash
# Deploy to Base mainnet
npx hardhat run scripts/deploy-testnet.js --network base

# Update frontend environment variables
# Redeploy on Vercel/Netlify
```

### Frontend Deployment

**Vercel (Recommended):**
1. Connect GitHub repository
2. Add environment variables
3. Deploy automatically

**Manual:**
```bash
npm run build
npm run start
```

---

## �️ Security System

**Enterprise-grade security with real-time threat detection and comprehensive monitoring**

### 🔍 Security Features

- **🛡️ Real-time Threat Detection**: SQL injection, XSS, and suspicious pattern monitoring
- **🚫 IP Blocking**: Automatic and manual IP address blocking
- **⏱️ Rate Limiting**: Configurable request limits per IP and globally
- **📊 Security Dashboard**: Live monitoring with threat analytics
- **🔐 Audit Logging**: Comprehensive security event logging
- **🚨 Emergency Response**: Lockdown capabilities for critical situations
- **📈 Threat Analytics**: Historical data and trend analysis
- **⚙️ Configurable Settings**: Adjustable security parameters

### 🖥️ Admin Security Dashboard

**Multi-tab security management interface:**

#### 📊 Dashboard Tab
- Real-time security metrics
- Active threat count
- Recent security events
- System status overview

#### 🚨 Threats Tab
- Live threat monitoring
- Threat classification (SQL injection, XSS, suspicious)
- Threat details and timestamps
- Resolution status tracking

#### 🛡️ Firewall Tab
- IP blocking management
- Block/unblock IP addresses
- Blocked IP list with reasons
- Automatic threat-based blocking

#### 📋 Logs Tab
- Comprehensive audit logs
- Security event history
- User actions tracking
- Export capabilities

#### ⚙️ Settings Tab
- Security parameter configuration
- Rate limiting settings
- Threat detection sensitivity
- Emergency lockdown controls

### 🔧 Technical Security Implementation

**Edge Proxy Security (Next.js 16):**
- Request-level threat detection
- Rate limiting with sliding windows
- IP-based access control
- Real-time security logging

**Database Security:**
- Turso SQLite with secure connections
- Security event persistence
- Threat pattern storage
- Audit trail maintenance

**API Security:**
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- Suspicious pattern detection

---

## 📊 Analytics & Monitoring

### Game Statistics

- Real-time player counts and active sessions
- Game completion rates and success metrics
- Reward distribution and token flow tracking
- Achievement unlock rates and player progression

### Security Monitoring

- **Threat Detection**: Real-time security event monitoring
- **IP Analytics**: Blocked IP tracking and access patterns
- **Rate Limiting**: Request volume analysis and abuse detection
- **Audit Trails**: Comprehensive security event logging
- **Performance Metrics**: System response times and error rates

### Contract Monitoring

- Balance tracking across all deployed contracts
- Transaction volume and gas usage analysis
- Treasury fund management and distribution tracking
- Player reward claims and token transfers

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation
- Ensure security standards

---

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Base** for the excellent blockchain infrastructure
- **OpenZeppelin** for secure smart contract libraries
- **RainbowKit** for seamless wallet integration
- **Framer Motion** for smooth animations

---

## 📞 Support

- **🐛 Issues**: [GitHub Issues](https://github.com/Adrijan-Petek/joybit/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/Adrijan-Petek/joybit/discussions)
- **📧 Contact**: [adrijan@joybit.game](mailto:adrijan@joybit.game)

---

<div align="center">

**Built with ❤️ on Base** • **Powered by JOYB** • **Made for Gamers**

[🎮 Start Playing](https://joybit.vercel.app) • [📚 Documentation](docs/) • [💬 Discord](#)

</div>
