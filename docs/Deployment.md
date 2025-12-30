# Deployment Guide

## Overview

This guide covers deploying Joybit to production environments. The platform consists of a Next.js frontend, smart contracts on Base blockchain, and a Turso database.

## Prerequisites

### System Requirements
- **Node.js**: 18.0+ for frontend
- **Solidity**: 0.8.22+ for contracts
- **Database**: Turso account and database
- **Hosting**: Vercel/Netlify for frontend

### Accounts & Services
- **Vercel/Netlify**: Frontend hosting
- **Base Mainnet**: Production blockchain
- **Turso**: Database hosting
- **Wallet**: Admin wallet with ETH

## 🚀 Deployment Steps

### 1. Smart Contract Deployment

#### Environment Setup

```bash
# Install Hardhat dependencies
npm install

# Create production environment file
cp .env.example .env.production
```

#### Configure Production Environment

```env
# Production Network
MAINNET_RPC_URL=https://mainnet.base.org
MAINNET_PRIVATE_KEY=your_admin_private_key

# Contract Addresses (will be set after deployment)
JOYBIT_TOKEN_ADDRESS=
JOYBIT_GAME_ADDRESS=
CARD_GAME_ADDRESS=
DAILY_CLAIM_ADDRESS=
TREASURY_ADDRESS=
```

#### Deploy Contracts

```bash
# Compile contracts
npm run compile

# Deploy to Base mainnet
npx hardhat run scripts/deploy.js --network base

# Verify contracts on BaseScan
npx hardhat verify --network base <CONTRACT_ADDRESS>
```

#### Record Contract Addresses

After deployment, note the contract addresses for the frontend configuration.

### 2. Database Setup

#### Create Turso Database

```bash
# Install Turso CLI
npm install -g @tursodatabase/cli

# Login to Turso
turso auth login

# Create production database
turso db create joybit-production

# Get database URL
turso db show joybit-production
```

#### Initialize Database Schema

```bash
# Set environment variables
export TURSO_DATABASE_URL=your_production_db_url
export TURSO_AUTH_TOKEN=your_auth_token

# Run database setup
npm run db:setup
```

### 3. Frontend Deployment

#### Vercel Deployment (Recommended)

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Connect the `Adrijan-Petek/joybit` repository

2. **Configure Environment Variables**

   Add these environment variables in Vercel dashboard:

   ```env
   # Network Configuration
   NEXT_PUBLIC_CHAIN_ID=8453
   NEXT_PUBLIC_BASE_MAINNET_RPC_URL=https://mainnet.base.org

   # WalletConnect
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

   # Admin Configuration
   NEXT_PUBLIC_ADMIN_WALLET_ADDRESS=0xYourAdminAddress

   # Database
   TURSO_DATABASE_URL=your_production_db_url
   TURSO_AUTH_TOKEN=your_auth_token

   # Security Configuration
   SECURITY_MAX_REQUESTS_PER_MINUTE=60
   SECURITY_MAX_REQUESTS_PER_HOUR=1000
   SECURITY_BLOCK_DURATION_MINUTES=15
   SECURITY_SQL_INJECTION_DETECTION=true
   SECURITY_XSS_DETECTION=true
   SECURITY_INPUT_VALIDATION=true

   # Contract Addresses (from deployment)
   NEXT_PUBLIC_JOYBIT_TOKEN_ADDRESS=0x...
   NEXT_PUBLIC_JOYBIT_GAME_ADDRESS=0x...
   NEXT_PUBLIC_CARD_GAME_ADDRESS=0x...
   NEXT_PUBLIC_DAILY_CLAIM_ADDRESS=0x...
   NEXT_PUBLIC_TREASURY_ADDRESS=0x...
   ```

3. **Deploy**
   - Vercel will automatically build and deploy
   - Monitor deployment logs for any issues
   - Access your site at the provided URL

#### Manual Deployment

```bash
# Build for production
npm run build

# Start production server
npm run start
```

### 4. Domain Configuration

#### Custom Domain (Vercel)

1. Go to Vercel project settings
2. Add custom domain in "Domains" section
3. Configure DNS records as instructed
4. Update any hardcoded URLs in the application

#### SSL Certificate

- Vercel provides automatic SSL certificates
- Manual deployments require SSL configuration

## 🔧 Post-Deployment Configuration

### Admin Setup

1. **Access Admin Panel**
   - Navigate to `https://yourdomain.com/admin`
   - Connect with admin wallet

2. **Initial Configuration**
   - Set up security settings
   - Configure game parameters
   - Test all functionality

### Database Verification

```bash
# Test database connection
npm run db:test

# Verify table creation
npm run db:verify
```

### Contract Verification

1. **BaseScan Verification**
   - Verify all contracts on [BaseScan](https://basescan.org)
   - Ensure contract code is publicly visible

2. **Contract Testing**
   - Test contract interactions on mainnet
   - Verify token transfers and game logic

## 📊 Monitoring & Maintenance

### Application Monitoring

#### Vercel Analytics
- Enable Vercel Analytics for performance monitoring
- Monitor error rates and response times
- Track user engagement metrics

#### Security Monitoring
- Regular security dashboard checks
- Monitor threat detection logs
- Review blocked IP addresses

### Database Monitoring

```bash
# Monitor database performance
turso db stats joybit-production

# Check database logs
turso db logs joybit-production
```

### Contract Monitoring

- Monitor contract balances on BaseScan
- Track transaction volumes
- Set up alerts for unusual activity

## 🔄 Updates & Rollbacks

### Code Updates

```bash
# Deploy updates via Git
git add .
git commit -m "Production update"
git push origin main

# Vercel auto-deploys on push
```

### Contract Updates

```bash
# For contract updates (if needed)
npx hardhat run scripts/upgrade-contract.js --network base

# Verify updated contract
npx hardhat verify --network base <NEW_CONTRACT_ADDRESS>
```

### Rollback Strategy

1. **Database Backup**: Regular automated backups
2. **Contract Immutability**: Plan for proxy upgrade patterns
3. **Frontend Rollback**: Use Vercel deployment history

## 🚨 Emergency Procedures

### Security Incident Response

1. **Detection**: Monitor security dashboard
2. **Assessment**: Review threat logs
3. **Containment**: Enable lockdown mode if needed
4. **Recovery**: Restore normal operations
5. **Analysis**: Post-incident review

### System Outage

1. **Identify Issue**: Check Vercel status and logs
2. **Database Check**: Verify Turso connectivity
3. **Contract Check**: Monitor Base network status
4. **Communication**: Update users via status page

## 📈 Scaling Considerations

### Performance Optimization

- **Edge Runtime**: Security proxy runs at edge
- **Database Indexing**: Optimize query performance
- **Caching Strategy**: Implement appropriate caching layers
- **CDN**: Use Vercel's global CDN

### Resource Scaling

- **Database**: Monitor usage and scale as needed
- **Contracts**: Gas optimization for high usage
- **Frontend**: Optimize bundle size and loading

## 🔒 Security Checklist

### Pre-Launch Security

- [ ] All contracts verified on BaseScan
- [ ] Admin wallet secured with hardware wallet
- [ ] Environment variables properly configured
- [ ] Security settings tuned for production
- [ ] Database access restricted
- [ ] SSL certificates valid
- [ ] Rate limiting configured
- [ ] Threat detection active

### Ongoing Security

- [ ] Regular security audits
- [ ] Monitor threat logs daily
- [ ] Update dependencies monthly
- [ ] Review access logs weekly
- [ ] Backup security configurations

## 📞 Support & Troubleshooting

### Common Issues

**Build Failures:**
```bash
# Clear build cache
rm -rf .next
npm run build
```

**Database Connection:**
```bash
# Test database connectivity
npm run db:test
```

**Contract Interaction:**
- Verify RPC URL configuration
- Check contract addresses
- Monitor Base network status

### Getting Help

- **Deployment Issues**: [GitHub Issues](https://github.com/Adrijan-Petek/joybit/issues)
- **Security Concerns**: [Security Discussions](https://github.com/Adrijan-Petek/joybit/discussions)
- **General Support**: adrijan@joybit.game

## ✅ Deployment Checklist

- [ ] Smart contracts deployed and verified
- [ ] Database created and configured
- [ ] Frontend deployed to hosting platform
- [ ] Environment variables configured
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Admin panel accessible
- [ ] All games functional
- [ ] Security system active
- [ ] Monitoring tools configured
- [ ] Backup procedures in place
- [ ] Emergency procedures documented

---

**🎉 Congratulations! Joybit is now live in production!**</content>
<parameter name="filePath">/home/mobb/Downloads/Joybit/wiki/Deployment.md