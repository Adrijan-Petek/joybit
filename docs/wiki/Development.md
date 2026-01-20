# Development

This page is for contributors and maintainers. For game rules, see [Games](Games).

## Prerequisites

- Node.js 18+
- A Web3 wallet (for local/manual testing)
- Base RPC URL (testnet or mainnet)

## Local Setup

```bash
git clone https://github.com/Adrijan-Petek/joybit.git
cd joybit
npm install
cp .env.example .env.local
npm run dev
```

## Environment Variables

Use `.env.example` as the reference and keep secrets in `.env.local`.

Common variables:

```env
# Chain / RPC
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_BASE_TESTNET_RPC_URL=https://sepolia.base.org

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...

# Contracts (set after deployment)
NEXT_PUBLIC_TREASURY_ADDRESS=0x...
NEXT_PUBLIC_MATCH3_GAME_ADDRESS=0x...
NEXT_PUBLIC_CARD_GAME_ADDRESS=0x...
NEXT_PUBLIC_DAILY_CLAIM_ADDRESS=0x...
NEXT_PUBLIC_BASEBOUND_GAME_ADDRESS=0x...
NEXT_PUBLIC_ACHIEVEMENT_ERC1155_ADDRESS=0x...

# Database (Turso)
TURSO_DATABASE_URL=...
TURSO_AUTH_TOKEN=...

# Pinata / IPFS (achievement metadata)
PINATA_JWT=...
PINATA_API_KEY=...
PINATA_SECRET_API_KEY=...
PINATA_GATEWAY=gateway.pinata.cloud
```

Note: the JOYB ERC-20 contract is treated as an external dependency in this repo. Tests may use `contracts/MockERC20.sol`.

## Key Commands

```bash
# App
npm run dev
npm run build
npm run lint

# Contracts
npm run hardhat:compile
npm run hardhat:test
```

## Repository Layout (Common Paths)

- `app/`: Next.js App Router pages (games, admin, API routes)
- `components/`: shared UI components
- `contracts/`: Solidity contracts (`Match3Game`, `CardGame`, `DailyClaim`, `BaseboundGame`, `AchievementERC1155`, `Treasury`)
- `lib/`: shared logic (web3 helpers, DB, utilities, Pinata/IPFS helpers)
- `scripts/`: deployment + maintenance scripts
- `docs/`: repo docs
- `docs/wiki/`: GitHub Wiki pages (published via Actions)

## Scripts (Operational)

The `scripts/` folder contains utilities for:

- Deploying contracts and verifying addresses
- Creating/uploading achievement metadata and assets
- Admin maintenance (prices, missing achievements, base URI updates)

For the achievement asset pipeline, see [Achievements](Achievements).

## Contributing

- Keep changes focused and documented.
- If behavior changes, update `README.md` and/or `docs/wiki/`.
- Prefer running targeted tests (`npm run hardhat:test`) for contract changes.
