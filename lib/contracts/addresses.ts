export const CONTRACT_ADDRESSES = {
  rewardToken: (process.env.NEXT_PUBLIC_REWARD_TOKEN_ADDRESS || process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS || '') as `0x${string}`,
  treasury: (process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '') as `0x${string}`,
  match3Game: (process.env.NEXT_PUBLIC_MATCH3_GAME_ADDRESS || '') as `0x${string}`,
} as const
