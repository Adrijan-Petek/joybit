export const CONTRACT_ADDRESSES = {
  joybitToken: (process.env.NEXT_PUBLIC_JOYBIT_TOKEN_ADDRESS || '') as `0x${string}`,
  treasury: (process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '') as `0x${string}`,
  match3Game: (process.env.NEXT_PUBLIC_MATCH3_GAME_ADDRESS || '') as `0x${string}`,
  cardGame: (process.env.NEXT_PUBLIC_CARD_GAME_ADDRESS || '') as `0x${string}`,
  dailyClaim: (process.env.NEXT_PUBLIC_DAILY_CLAIM_ADDRESS || '') as `0x${string}`,
  achievementNFT: (process.env.NEXT_PUBLIC_ACHIEVEMENT_NFT_ADDRESS || '') as `0x${string}`,
  achievementERC1155: (process.env.NEXT_PUBLIC_ACHIEVEMENT_ERC1155_ADDRESS || '') as `0x${string}`,
} as const

export const CHAIN_CONFIG = {
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '8453'),
  testnetChainId: parseInt(process.env.NEXT_PUBLIC_TESTNET_CHAIN_ID || '84532'),
  rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org',
  testnetRpcUrl: process.env.NEXT_PUBLIC_BASE_TESTNET_RPC_URL || 'https://sepolia.base.org',
} as const

export const ADMIN_CONFIG = {
  adminWallet: process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS,
  logoClicksRequired: 10,
} as const
