# Tokenomics

Joybit’s on-chain economy is centered around:

- **ETH fees** paid for gameplay actions
- **JOYB rewards** credited to players as claimable balances
- A **treasury** contract that aggregates fees and pays out rewards

## Treasury Model

The `Treasury` contract:

- Receives ETH gameplay fees from game contracts
- Tracks **pending rewards per player per token** (multi-token capable)
- Lets users claim:
  - A specific token via `claimReward(token)`
  - All tokens via `claimAllRewards()`

## Reward Flow (Simplified)

1. Player plays a game (free daily play or paid fee).
2. Paid fees are forwarded to the treasury.
3. On win/claim conditions, the game credits JOYB to the player via `Treasury.creditReward(player, joybitToken, amount)`.
4. The player **claims** their pending JOYB from the treasury.

## Defaults vs. Configuration

Many amounts are configurable by the contract owner:

- Per-game `playFee`
- Card game `winReward`
- Daily claim `baseReward` and `streakBonus`
- Match-3 `levelRewards[level]`

For the exact current values, read contract state on-chain or use the admin UI (if enabled).
