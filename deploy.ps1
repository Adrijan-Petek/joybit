# Joybit Vercel Deployment (PowerShell)
# Run this script to deploy to Vercel

Write-Host "🚀 Joybit Deployment to Vercel" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if git is initialized
if (-not (Test-Path .git)) {
  Write-Host "📦 Initializing git repository..." -ForegroundColor Yellow
  git init
  git add .
  git commit -m "Initial commit - Joybit game ready for deployment"
  Write-Host "✅ Git initialized" -ForegroundColor Green
} else {
  Write-Host "✅ Git already initialized" -ForegroundColor Green
}

# Check if vercel CLI is installed
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelInstalled) {
  Write-Host "📥 Installing Vercel CLI..." -ForegroundColor Yellow
  npm install -g vercel
  Write-Host "✅ Vercel CLI installed" -ForegroundColor Green
} else {
  Write-Host "✅ Vercel CLI already installed" -ForegroundColor Green
}

# Build locally first to check for errors
Write-Host ""
Write-Host "🔨 Running local build to check for errors..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
  Write-Host "✅ Build successful!" -ForegroundColor Green
} else {
  Write-Host "❌ Build failed! Fix errors before deploying." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "🌐 Deploying to Vercel..." -ForegroundColor Cyan
vercel --prod

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Set environment variables in Vercel dashboard"
Write-Host "2. Redeploy after setting variables"
Write-Host "3. Test the live site"
Write-Host "4. Share on Farcaster/Warpcast"
Write-Host ""
Write-Host "🔗 Environment variables to set:" -ForegroundColor Yellow
Write-Host "   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID"
Write-Host "   NEXT_PUBLIC_JOYBIT_TOKEN_ADDRESS"
Write-Host "   NEXT_PUBLIC_TREASURY_ADDRESS"
Write-Host "   NEXT_PUBLIC_MATCH3_GAME_ADDRESS"
Write-Host "   NEXT_PUBLIC_CARD_GAME_ADDRESS"
Write-Host "   NEXT_PUBLIC_DAILY_CLAIM_ADDRESS"
Write-Host "   NEXT_PUBLIC_ADMIN_WALLET_ADDRESS"
Write-Host ""
Write-Host "📖 See DEPLOYMENT_GUIDE.md for full instructions" -ForegroundColor Cyan
