# Achievements

Joybit achievements are implemented as **soulbound ERC-1155 tokens** via `AchievementERC1155`.

## Contract Behavior

- **Non-transferable**: transfers revert (soulbound enforcement).
- **One-time claim**: `claimed[user][id]` prevents duplicate mints.
- **Two mint paths**:
  - `mintAchievement(id)` (user-paid mint; forwards ETH to treasury)
  - `backendMint(user, id)` (authorized minter / owner; gasless for user)

## Metadata (IPFS)

The token URI is computed as:

- `baseMetadataURI + {id}.json`

Where `baseMetadataURI` is typically an `ipfs://.../` prefix set by the owner via `setBaseMetadataURI()`.

## Asset Pipeline (Badges + Metadata)

This repo includes scripts to generate assets and publish them to IPFS via Pinata, including:

- `scripts/generate-achievement-badges.ts` (generates PNG badge images and metadata, uploads via `lib/nft-storage.ts`)
- `scripts/upload-achievement-metadata.ts` / `scripts/upload-achievements-to-pinata.ts` (other upload utilities)

### Required environment variables

Set one of the following auth methods in `.env.local`:

- `PINATA_JWT` (recommended)
- or `PINATA_API_KEY` + `PINATA_SECRET_API_KEY`

Optional:

- `PINATA_GATEWAY` (defaults to `gateway.pinata.cloud`)

Note: if no credentials are present, `lib/nft-storage.ts` falls back to a mock upload flow for local testing.

## Achievement IDs and Rarity

Achievement IDs are numeric on-chain (ERC-1155 token ids). Each id stores:

- `rarity` (Common → Mythic)
- `price` (mint price in wei)
- `active` flag

Admin adds/updates achievements via `addAchievement()` / `updateAchievement()`.
