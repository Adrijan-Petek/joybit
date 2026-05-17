export const CONTRACT_ADDRESSES = {
  joybitToken: (process.env.NEXT_PUBLIC_JOYBIT_TOKEN_ADDRESS || '') as `0x${string}`,
  treasury: (process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '') as `0x${string}`,
  match3Game: (process.env.NEXT_PUBLIC_MATCH3_GAME_ADDRESS || '') as `0x${string}`,
} as const
