# Deployment

This page outlines the typical deployment lifecycle for Joybit. Exact steps vary by environment (testnet vs mainnet) and your ops tooling.

## Smart Contracts

Contracts in this repo:

- `Treasury`
- `Match3Game`
- `CardGame`
- `DailyClaim`
- `BaseboundGame`
- `AchievementERC1155`

Typical order:

1. Deploy `Treasury` (points at the JOYB token contract address).
2. Deploy game contracts pointing at `Treasury`.
3. Deploy `AchievementERC1155` pointing at `Treasury` and an initial `baseMetadataURI`.
4. Configure `Treasury` admins / permissions so game contracts can credit rewards.
5. Fund the treasury with JOYB for payouts.

## Frontend

- Set contract addresses and RPC settings in `.env.local` (or hosting provider env vars).
- Build and deploy the Next.js app (Vercel recommended).

## GitHub Wiki Publishing

Wiki pages are authored in `docs/wiki/` and published via `.github/workflows/wiki-publish.yml`.

- Enable Wiki in GitHub repository settings.
- Create an initial wiki page once (to initialize the wiki repo).
- Add the `GH_PERSONAL_ACCESS_TOKEN` secret for Actions.

Full setup: `docs/Wiki-Publish-Setup.md`
