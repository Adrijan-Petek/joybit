#!/bin/bash

# Joybit Vercel Deployment Script
# Run this script to deploy to Vercel

echo "🚀 Joybit Deployment to Vercel"
echo "================================"
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
  echo "📦 Initializing git repository..."
  git init
  git add .
  git commit -m "Initial commit - Joybit game ready for deployment"
  echo "✅ Git initialized"
else
  echo "✅ Git already initialized"
fi

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
  echo "📥 Installing Vercel CLI..."
  npm install -g vercel
  echo "✅ Vercel CLI installed"
else
  echo "✅ Vercel CLI already installed"
fi

# Build locally first to check for errors
echo ""
echo "🔨 Running local build to check for errors..."
npm run build

if [ $? -eq 0 ]; then
  echo "✅ Build successful!"
else
  echo "❌ Build failed! Fix errors before deploying."
  exit 1
fi

echo ""
echo "🌐 Deploying to Vercel..."
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Set environment variables in Vercel dashboard"
echo "2. Redeploy after setting variables"
echo "3. Test the live site"
echo "4. Share on Farcaster/Warpcast"
echo ""
echo "🔗 Environment variables to set:"
echo "   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID"
echo "   NEXT_PUBLIC_JOYBIT_TOKEN_ADDRESS"
echo "   NEXT_PUBLIC_TREASURY_ADDRESS"
echo "   NEXT_PUBLIC_MATCH3_GAME_ADDRESS"
echo "   NEXT_PUBLIC_CARD_GAME_ADDRESS"
echo "   NEXT_PUBLIC_DAILY_CLAIM_ADDRESS"
echo "   NEXT_PUBLIC_ADMIN_WALLET_ADDRESS"
echo ""
echo "📖 See DEPLOYMENT_GUIDE.md for full instructions"
