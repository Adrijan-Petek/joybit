# Joybit Wiki

Joybit is a decentralized gaming platform on Base. This wiki is the canonical, “operator-ready” reference for how the app works, how the contracts are configured, and how to develop and deploy the stack.

![Joybit Promo](https://raw.githubusercontent.com/Adrijan-Petek/joybit/main/public/joybit-promo.png)

## Start Here

- **New player** → [Games](Games) (how each game works, fees, rewards)
- **Developer** → [Development](Development) (local setup, env, tests, scripts)
- **Operator / admin** → [Deployment](Deployment) and [Security](Security)
- **NFT achievements** → [Achievements](Achievements)
- **Token and rewards** → [Tokenomics](Tokenomics)

## Platform Components (High Level)

- **Web app**: Next.js + TypeScript (App Router)
- **Contracts**: Solidity (Hardhat) on Base
- **Treasury model**: games collect ETH fees and credit player rewards into the `Treasury` contract as **claimable balances**
- **Database**: Turso (SQLite) for off-chain app data (admin, analytics, etc.)

## Repository Documentation

- Product + engineering docs live in `docs/`
- Wiki pages live in `docs/wiki/` and are auto-published to the GitHub Wiki via `.github/workflows/wiki-publish.yml`

## Support

- Issues: `https://github.com/Adrijan-Petek/joybit/issues`
- Discussions: `https://github.com/Adrijan-Petek/joybit/discussions`
