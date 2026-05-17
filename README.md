# Joybit

<p align="center">
	<img src="public/branding/logo.png" alt="Joybit logo" width="160" />
</p>

Joybit is a production-focused Match-3 mini app. The current scope is intentionally lean: one polished game loop, wallet-aware rewards, and clear player progression.

## Product Scope

- Match-3 gameplay (`/game`)
- Leaderboard and ranking (`/leaderboard`)
- Player profile, stats, and claimable rewards (`/profile`)
- Wallet integration for mini-app compatible environments

## Architecture

### Frontend

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- Wagmi + RainbowKit

### Smart Contracts

- `contracts/Match3Game.sol`
- `contracts/Treasury.sol`
- `contracts/MockERC20.sol`

### Data Layer

- Turso (LibSQL) for leaderboard and player stat persistence
- API routes under `app/api/*`

## Routes

- `/` Home and primary navigation
- `/game` Match-3 gameplay
- `/leaderboard` Ranked scores
- `/profile` Wallet, stats, and rewards

## Environment Configuration

Copy `.env.example` to `.env.local` and configure the required values.

### Required

- `NEXT_PUBLIC_JOYBIT_TOKEN_ADDRESS`
- `NEXT_PUBLIC_TREASURY_ADDRESS`
- `NEXT_PUBLIC_MATCH3_GAME_ADDRESS`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

### Optional

- `NEXT_PUBLIC_BASE_RPC_URL`
- `NEXT_PUBLIC_ALCHEMY_API_KEY`
- `NEXT_PUBLIC_ONCHAINKIT_API_KEY`

### Deployment Scripts

- `PRIVATE_KEY`
- `BASESCAN_API_KEY`

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production Build

```bash
npm run build
```

## Contract Workflow

```bash
npm run hardhat:compile
npm run hardhat:deploy
```

Optional ABI generation:

```bash
npm run generate-abis
```
