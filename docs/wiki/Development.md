# Development Guide

This guide covers the technical aspects of developing for and contributing to Joybit.

## 🏗️ Architecture Overview

### System Architecture
Joybit is built with a modern, scalable architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Routes    │    │   Smart         │
│   (Next.js)     │◄──►│   (Edge)        │◄──►│   Contracts     │
│                 │    │                 │    │   (Solidity)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Database      │    │   Security      │    │   Blockchain    │
│   (Turso)       │    │   Monitoring    │    │   (Base)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Tech Stack Details

#### Frontend
- **Framework**: Next.js 16.1+ with App Router
- **Language**: TypeScript 5.0+
- **Styling**: TailwindCSS 3.0+
- **Animations**: Framer Motion
- **Web3**: Wagmi v2 + RainbowKit
- **State Management**: React Context + Custom Hooks

#### Backend
- **Runtime**: Next.js API Routes (Edge Runtime)
- **Database**: Turso (SQLite)
- **Security**: Custom middleware with threat detection
- **Caching**: Next.js built-in caching

#### Blockchain
- **Network**: Base (Ethereum L2)
- **Language**: Solidity 0.8.22+
- **Framework**: Hardhat
- **Libraries**: OpenZeppelin contracts
- **Testing**: Hardhat + Chai

## 🚀 Getting Started

### Prerequisites
- **Node.js**: 18.0 or higher
- **MetaMask**: Web3 wallet
- **Git**: Version control
- **Base Sepolia ETH**: Testnet funds

### Local Development Setup

```bash
# Clone the repository
git clone https://github.com/Adrijan-Petek/joybit.git
cd joybit

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local

# Configure environment variables
# Edit .env.local with your settings

# Start development server
npm run dev
```

### Environment Configuration

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

## 📁 Project Structure

```
joybit/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── admin/             # Admin dashboard
│   ├── game/              # Game pages
│   └── ...
├── components/            # React components
│   ├── AudioButtons.tsx   # Audio controls
│   ├── WalletButton.tsx   # Wallet connection
│   └── ...
├── contracts/             # Solidity contracts
│   ├── JoybitToken.sol    # ERC20 token
│   ├── JoybitGame.sol     # Match-3 logic
│   └── ...
├── lib/                   # Utility libraries
│   ├── contracts/         # Contract ABIs and hooks
│   ├── db/               # Database utilities
│   └── ...
├── public/               # Static assets
│   ├── audio/            # Game audio files
│   ├── branding/         # Logo and branding
│   └── tiles/            # Game tile images
├── scripts/              # Deployment and utility scripts
├── test/                 # Test files
└── docs/                 # Documentation
```

## 🛠️ Development Workflow

### 1. Choose a Task
- Check [GitHub Issues](https://github.com/Adrijan-Petek/joybit/issues) for open tasks
- Look for `good first issue` or `help wanted` labels
- Discuss with maintainers if needed

### 2. Create a Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number-description
```

### 3. Make Changes
- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation
- Ensure security standards

### 4. Test Your Changes
```bash
# Run all tests
npm run test

# Run linting
npm run lint

# Build for production
npm run build
```

### 5. Commit and Push
```bash
git add .
git commit -m "feat: add amazing new feature"
git push origin feature/your-feature-name
```

### 6. Create Pull Request
- Use descriptive titles and descriptions
- Reference related issues
- Request review from maintainers

## 🧪 Testing

### Test Structure
- **Unit Tests**: Individual functions and components
- **Integration Tests**: Contract interactions
- **E2E Tests**: Full user workflows

### Running Tests
```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run contract tests only
npx hardhat test

# Run with coverage
npm run test:coverage
```

### Writing Tests
```typescript
// Component test example
describe('WalletButton', () => {
  it('should display connected address', () => {
    // Test implementation
  });
});

// Contract test example
describe('JoybitToken', () => {
  it('should mint initial supply', async () => {
    // Contract test implementation
  });
});
```

## 🚢 Deployment

### Smart Contract Deployment

#### Testnet Deployment
```bash
# Deploy to Base Sepolia
npx hardhat run scripts/deploy-testnet.js --network baseSepolia

# Verify contracts
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS>
```

#### Mainnet Deployment
```bash
# Deploy to Base mainnet
npx hardhat run scripts/deploy.js --network base

# Update environment variables
# Redeploy frontend
```

### Frontend Deployment

#### Vercel (Recommended)
1. Connect GitHub repository
2. Add environment variables
3. Deploy automatically on push

#### Manual Deployment
```bash
npm run build
npm run start
```

## 🔒 Security

### Security Features
- **Real-time Threat Detection**: SQL injection, XSS monitoring
- **Rate Limiting**: Configurable request limits
- **IP Blocking**: Automatic and manual blocking
- **Audit Logging**: Comprehensive security events
- **Input Validation**: Sanitization and validation

### Security Best Practices
- **Input Sanitization**: Always validate and sanitize inputs
- **Rate Limiting**: Implement appropriate limits
- **Error Handling**: Don't expose sensitive information
- **Access Control**: Use role-based permissions
- **Audit Trails**: Log all security events

### Security Dashboard
Access the admin security dashboard at `/admin` to:
- Monitor real-time threats
- Manage IP blocking
- View security logs
- Configure security settings

## 🎨 Theming System

### Theme Structure
```typescript
interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    border: string;
  };
  typography: {
    fontFamily: string;
    fontSize: string;
    headlineSize: string;
  };
  layout: {
    borderRadius: string;
    spacing: string;
    shadow: string;
  };
  animation: 'none' | 'minimal' | 'full';
}
```

### Adding New Themes
1. Define theme object in `lib/themes.ts`
2. Add to theme registry
3. Test across all components
4. Update documentation

## 🔊 Audio System

### Audio Architecture
- **Global Audio Context**: Centralized audio state
- **Separate Volume Controls**: Music vs sound effects
- **Persistent Settings**: localStorage integration
- **Theme Integration**: Audio controls match theme

### Audio Files
- Located in `public/audio/`
- Supported formats: MP3, WAV, OGG
- Compressed for web delivery

## 📊 Analytics & Monitoring

### Game Analytics
- **Real-time Metrics**: Player counts, game stats
- **Performance Monitoring**: Response times, error rates
- **Reward Tracking**: Token distribution analytics
- **Achievement Analytics**: Unlock rates and trends

### Contract Monitoring
- **Balance Tracking**: All contract balances
- **Transaction Volume**: Gas usage and transaction counts
- **Treasury Management**: Fund flow tracking
- **Player Claims**: Reward distribution monitoring

## 🤝 Contributing Guidelines

### Code Style
- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb config with custom rules
- **Prettier**: Consistent code formatting
- **Imports**: Absolute imports with path mapping

### Commit Convention
```
feat: add new game feature
fix: resolve wallet connection issue
docs: update API documentation
style: format code with prettier
refactor: restructure component architecture
test: add unit tests for game logic
chore: update dependencies
```

### Pull Request Process
1. **Descriptive Title**: Clear, concise description
2. **Detailed Description**: What, why, and how
3. **Related Issues**: Link to GitHub issues
4. **Testing**: Include test results
5. **Screenshots**: UI changes with screenshots
6. **Breaking Changes**: Clearly marked if any

## 📚 Resources

### Documentation
- [API Reference](Technical/API-Reference.md)
- [Database Schema](Technical/Database-Schema.md)
- [Security Dashboard](Security/Security-Dashboard.md)
- [Deployment Guide](../Deployment.md)

### External Resources
- [Base Documentation](https://docs.base.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Hardhat Documentation](https://hardhat.org/docs)

### Community
- [GitHub Issues](https://github.com/Adrijan-Petek/joybit/issues)
- [GitHub Discussions](https://github.com/Adrijan-Petek/joybit/discussions)
- [Discord](#) (Coming Soon)

---

*Happy coding! 🎉*