# Games

Joybit’s games are on-chain fee / reward flows wrapped in a conventional web UI. Where exact values matter, the **contracts are the source of truth** (fees and rewards are adjustable by the contract owner).

## Overview

| Game | Contract | Daily free play | Default paid fee | Default reward |
|------|----------|-----------------|------------------|----------------|
| Match-3 | `Match3Game` | Yes (24h cooldown) | 0.001 ETH | Per-level reward (defaults to 0 until configured) |
| 3-Card | `CardGame` | Yes (24h cooldown) | 0.002 ETH | 100 JOYB on win |
| Daily Claim | `DailyClaim` | N/A | N/A | 100 JOYB + 10 JOYB × (streak - 1) |
| Basebound | `BaseboundGame` | Yes (24h cooldown) | 0.001 ETH | Off-chain progression (contract tracks play/retry fees) |

## Match-3 (Match3Game)

![Match-3 Gameplay](https://raw.githubusercontent.com/Adrijan-Petek/joybit/main/public/screenshot-0.PNG)

### How it works

- Start a session via `startGame(level)` (levels 1–10).
- You get **1 free play per 24 hours**; otherwise you pay `playFee` (default `0.001 ether`) to the treasury.
- Rewards are credited when the frontend calls `completeLevel(sessionId, level)` and `levelRewards[level]` is set to a non-zero value.

### Boosters (paid, sent to treasury)

- Hammer: `0.0001 ETH` (pack of 5: `0.0004 ETH`)
- Shuffle: `0.0002 ETH` (pack of 5: `0.0008 ETH`)
- Color Bomb: `0.0003 ETH` (pack of 5: `0.0012 ETH`)

## 3-Card (CardGame)

![Card Game Interface](https://raw.githubusercontent.com/Adrijan-Petek/joybit/main/public/screenshot-1.PNG)

### How it works

- Play via `playGame(selectedCard)`.
- You get **1 free play per 24 hours**; otherwise you pay `playFee` (default `0.002 ether`) to the treasury.
- If you win, the contract credits `winReward` (default `100 ether` JOYB) to your claimable balance in the treasury.

### Randomness note

The winning card is derived from on-chain entropy (`block.prevrandao`, timestamp, sender, session id). This is suitable for casual gameplay, but it is not VRF-grade randomness.

## Daily Claim (DailyClaim)

![Daily Claim Interface](https://raw.githubusercontent.com/Adrijan-Petek/joybit/main/public/screenshot-2.PNG)

### How it works

- Claim via `claimDaily()` when `canClaim()` returns true (24h cooldown).
- Streak continues if you claim within **48 hours** of your last claim; otherwise the streak resets to 1.
- Reward is `baseReward + streakBonus × (streak - 1)` (defaults: `100 JOYB` base, `10 JOYB` bonus).

## Basebound (BaseboundGame)

Basebound is a side-scrolling hill-climb racer. The contract provides:

- **1 free play per 24 hours**, otherwise `playFee` (default `0.001 ether`).
- An optional `retryGame()` flow with `retryFee` (default `0.0005 ether`).

## Rewards and claiming

All JOYB rewards are credited into the `Treasury` contract as pending balances and must be claimed by the user (see [Tokenomics](Tokenomics)).
