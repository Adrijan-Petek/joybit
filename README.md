# Joybit

<p align="center">
  <img src="public/branding/frame.png" alt="Joybit frame preview" width="600" />
</p>

Joybit is a USDC-powered Joybit Blast mini app built for Base. The project combines a fast tile-matching game loop, wallet-native progression, and on-chain reward distribution with a production-focused web stack.

## Highlights

- USDC-only gameplay economy for start, continue, and booster actions
- On-chain rewards with claimable balances in player profiles
- Admin panel for fee management, reward pool funding, and treasury controls
- Seasonal reward workflows with leaderboard snapshots and distribution tracking
- Base mainnet deployment with verified contracts

## Product Surfaces

- `/` Home and navigation
- `/game` Joybit Blast gameplay and booster shop
- `/leaderboard` Ranking and score tracking
- `/profile` Player stats and reward claims
- `/admin` Contract controls and rewards operations

## Tech Stack

### Frontend

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- wagmi + viem

### Smart Contracts

- `contracts/Game-v4.sol`
- `contracts/Treasury-v4.sol`

### Data Layer

- Turso (LibSQL) for leaderboard and player stats
- Next.js API routes under `app/api/*`

## On-Chain Model (v4)

- Gameplay fees are charged in USDC only
- Treasury splits charges between protocol fees and reward pool
- Rewards are distributed and claimed in USDC
- ETH is not used for gameplay accounting (ETH is only for Base gas)

## Environment Variables

Set environment values in `.env.local`.

### Required

- `NEXT_PUBLIC_USDC_TOKEN_ADDRESS`
- `NEXT_PUBLIC_TREASURY_ADDRESS`
- `NEXT_PUBLIC_MATCH3_GAME_ADDRESS`
- `NEXT_PUBLIC_GAME_SIGNER_ADDRESS`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

### Optional

- `NEXT_PUBLIC_BASE_RPC_URL`
- `NEXT_PUBLIC_ALCHEMY_API_KEY`
- `NEXT_PUBLIC_ONCHAINKIT_API_KEY`
- `NEXT_PUBLIC_ADMIN_WALLET_ADDRESS`
- `NEXT_PUBLIC_ADMIN_WALLET_ADDRESSES`
- `NEXT_PUBLIC_ADMIN_FARCASTER_FID`

### Deployment/Verification

- `PRIVATE_KEY`
- `BASESCAN_API_KEY`

## Local Development

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`.

## Build and Typecheck

```bash
npm run build
npx tsc -p tsconfig.json --noEmit
```

## Contracts and Scripts

Compile contracts:

```bash
npx hardhat compile
```

Deploy v4 contracts:

```bash
node scripts/deploy-v4.js
```

Verify v4 contracts:

```bash
npx hardhat run scripts/verify-v4.js --network base
```

## Security Notes

- Never commit real secrets from `.env.local`
- Rotate keys immediately if secrets are exposed
- Keep admin and signer keys separated
