# Joybit - Vercel Deployment Guide

## 🚀 Deploy to Vercel

### Prerequisites
1. GitHub account
2. Vercel account (sign up at vercel.com)
3. All contracts deployed on Base mainnet ✅

### Step 1: Push to GitHub

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit - Joybit game ready for deployment"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/joybit.git
git branch -M main
git push -u origin main
```

### Step 2: Import to Vercel

1. Go to https://vercel.com
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js

### Step 3: Configure Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

**Required:**
```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=3e40339a23a18ccd2e115f9b0c0c8324
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_JOYBIT_TOKEN_ADDRESS=0xc732932ca7db558cf1bacc17b4f4f7e149e0eb07
NEXT_PUBLIC_TREASURY_ADDRESS=0x91F67245cE0ad7AFB5301EE5d8eaE29Db69078Af
NEXT_PUBLIC_MATCH3_GAME_ADDRESS=0x72cC365b09D7cB4bE3416279407655cA9BBdc532
NEXT_PUBLIC_CARD_GAME_ADDRESS=0xa59Fd0ffE17D446157430E13db2d133DD2DfF3da
NEXT_PUBLIC_DAILY_CLAIM_ADDRESS=0x6A27938E353Be8f25ECD7dEd90A47221e93F2941
NEXT_PUBLIC_ADMIN_WALLET_ADDRESS=0x868edb819af54a9c938dea4c2e027fe050b18d0a
NEXT_PUBLIC_ENVIRONMENT=production
```

**Optional (for better performance):**
```
NEXT_PUBLIC_ONCHAINKIT_API_KEY=6159c80a-f589-46b4-bea1-f8c71df6556a
NEXT_PUBLIC_ALCHEMY_API_KEY=ZqU2WsIBAfDX_AShPzGq_
```

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for build
3. Your app will be live at `https://your-app.vercel.app`

---

## 🟣 Connect to Farcaster

### 1. Create Farcaster Frame

Add this to your `app/page.tsx` metadata:

```tsx
export const metadata = {
  title: 'Joybit - Match-3 Game on Base',
  description: 'Play Match-3 games, earn JOYB tokens on Base blockchain!',
  openGraph: {
    title: 'Joybit - Blockchain Gaming',
    description: 'Play, earn, and win JOYB tokens',
    images: ['/branding/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Joybit - Match-3 on Base',
    description: 'Play Match-3 games and earn JOYB tokens',
    images: ['/branding/og-image.png'],
  },
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': 'https://your-domain.vercel.app/branding/og-image.png',
    'fc:frame:button:1': 'Play Now',
    'fc:frame:button:1:action': 'link',
    'fc:frame:button:1:target': 'https://your-domain.vercel.app',
  },
}
```

### 2. Share on Warpcast

1. Go to https://warpcast.com
2. Create a new cast
3. Paste your Vercel URL
4. The frame will auto-generate with your metadata

---

## 🔵 Connect to Base Ecosystem

### 1. Submit to Base Directory

1. Visit https://base.org/ecosystem
2. Click "Submit a project"
3. Fill in details:
   - **Name:** Joybit
   - **Category:** Gaming / DeFi
   - **Description:** Match-3 blockchain game with JOYB token rewards
   - **URL:** Your Vercel URL
   - **Contracts:** Link to your BaseScan verified contracts
   - **Social:** Twitter, Discord, etc.

### 2. Add to Base Dapp Store

1. Go to https://base.org/dapps
2. Submit your project
3. Include:
   - Smart contract addresses (all verified ✅)
   - Screenshot/demo video
   - User guide

### 3. Apply for Base Grants (Optional)

If you want funding for development:
1. Visit https://paragraph.xyz/@grants.base.eth
2. Submit grant proposal
3. Mention:
   - Onchain gaming innovation
   - User engagement metrics
   - Community building plans

---

## 📱 Post-Deployment Checklist

### Immediate Actions:
- [ ] Test wallet connection on live site
- [ ] Test all games (Match-3, Card, Daily Claim)
- [ ] Verify admin panel works
- [ ] Test on mobile devices
- [ ] Check announcements display correctly
- [ ] **Test "Add App" button and verify notification appears**
- [ ] **Check webhook endpoint is receiving events** (Vercel logs)

### Farcaster Integration:
- [ ] **Update manifest with production URL** in `public/.well-known/farcaster.json`
- [ ] **Sign the manifest** using Farcaster developer tools
- [ ] **Test webhook**: Check `/api/farcaster-webhook` endpoint
- [ ] **Verify "Add App" notification** displays correctly
- [ ] **Monitor webhook logs** in Vercel for incoming events

### Marketing:
- [ ] Share on Twitter/X
- [ ] Post in Base Discord
- [ ] Share on Warpcast/Farcaster
- [ ] Post in crypto gaming communities
- [ ] Create demo video

### Monitoring:
- [ ] Set up Vercel Analytics
- [ ] Monitor BaseScan for contract activity
- [ ] Track user engagement
- [ ] Monitor Treasury balance
- [ ] **Track "Add App" conversion rate**

---

## 📬 Farcaster Mini App Notifications

Your app now includes notification support! Here's what happens when users add your app:

### What's Implemented:

1. **"Add App" Button** - Main page has a button that prompts users to add Joybit
2. **Welcome Notification** - Users see a welcome toast when they first add the app
3. **Webhook Endpoint** - `/api/farcaster-webhook` receives events from Farcaster
4. **Event Tracking** - Logs when users add/remove app or enable/disable notifications

### Post-Deployment Setup:

1. **Update Manifest URLs** in `public/.well-known/farcaster.json`:
   ```json
   {
     "miniapp": {
       "homeUrl": "https://your-actual-domain.vercel.app",
       "iconUrl": "https://your-actual-domain.vercel.app/icon.png",
       "webhookUrl": "https://your-actual-domain.vercel.app/api/farcaster-webhook"
     }
   }
   ```

2. **Sign Your Manifest**:
   - Go to https://farcaster.xyz/~/developers/mini-apps/manifest
   - Enter your domain
   - Sign with your Farcaster account
   - Copy the signed `accountAssociation` to your manifest

3. **Test Webhook**:
   ```bash
   # Health check
   curl https://your-domain.vercel.app/api/farcaster-webhook
   ```

4. **Monitor Events**:
   - Vercel Dashboard → Your Project → Logs
   - Filter for "Farcaster webhook event received"

### Notification Features:

- ✅ Welcome toast when user adds app (shown once)
- ✅ Success notification on "Add App" button click
- ✅ Webhook receives `miniapp_added`, `miniapp_removed`, `notifications_enabled`, `notifications_disabled` events
- ✅ Notification tokens stored in webhook payload (ready for database integration)

See `NOTIFICATIONS_SETUP.md` for detailed implementation docs.

---

## 🔗 Important Links

**Your Deployed Contracts:**
- Treasury: https://basescan.org/address/0x91F67245cE0ad7AFB5301EE5d8eaE29Db69078Af#code
- Match3Game: https://basescan.org/address/0x72cC365b09D7cB4bE3416279407655cA9BBdc532#code
- CardGame: https://basescan.org/address/0xa59Fd0ffE17D446157430E13db2d133DD2DfF3da#code
- DailyClaim: https://basescan.org/address/0x6A27938E353Be8f25ECD7dEd90A47221e93F2941#code

**Resources:**
- Base: https://base.org
- Farcaster: https://www.farcaster.xyz
- Warpcast: https://warpcast.com
- BaseScan: https://basescan.org
- Vercel Docs: https://vercel.com/docs

---

## 🆘 Troubleshooting

**Build fails on Vercel:**
- Check all environment variables are set
- Ensure no TypeScript errors (`npm run build` locally)
- Check build logs for specific errors

**Wallet not connecting:**
- Verify WalletConnect Project ID is correct
- Check network is set to Base (Chain ID 8453)
- Clear browser cache and try again

**Contracts not loading:**
- Verify all contract addresses in environment variables
- Check Base RPC URL is correct
- Ensure contracts are verified on BaseScan

---

## 🎉 Ready to Launch!

Once deployed:
1. Share your Vercel URL
2. Fund Treasury with JOYB tokens
3. Start promoting on social media
4. Engage with Base and Farcaster communities
5. Monitor user feedback and iterate

**Good luck with your launch! 🚀**
