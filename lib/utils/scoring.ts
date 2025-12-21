/**
 * Leaderboard scoring system constants and utilities
 */

export const SCORING_SYSTEM = {
  MATCH3_WIN: 100,
  MATCH3_GAME: 50,
  CARD_WIN: 150,
  CARD_GAME: 30,
  DAILY_CLAIM: 80,
  STREAK_DAY: 20,
} as const

export type ScoringEvent =
  | 'match3_win'
  | 'match3_game'
  | 'card_win'
  | 'card_game'
  | 'daily_claim'
  | 'streak_day'

/**
 * Calculate leaderboard points for a scoring event
 */
export function calculateLeaderboardPoints(event: ScoringEvent): number {
  switch (event) {
    case 'match3_win':
      return SCORING_SYSTEM.MATCH3_WIN
    case 'match3_game':
      return SCORING_SYSTEM.MATCH3_GAME
    case 'card_win':
      return SCORING_SYSTEM.CARD_WIN
    case 'card_game':
      return SCORING_SYSTEM.CARD_GAME
    case 'daily_claim':
      return SCORING_SYSTEM.DAILY_CLAIM
    case 'streak_day':
      return SCORING_SYSTEM.STREAK_DAY
    default:
      return 0
  }
}

/**
 * Get all scoring events and their point values
 */
export function getScoringSystem(): Record<ScoringEvent, number> {
  return {
    match3_win: SCORING_SYSTEM.MATCH3_WIN,
    match3_game: SCORING_SYSTEM.MATCH3_GAME,
    card_win: SCORING_SYSTEM.CARD_WIN,
    card_game: SCORING_SYSTEM.CARD_GAME,
    daily_claim: SCORING_SYSTEM.DAILY_CLAIM,
    streak_day: SCORING_SYSTEM.STREAK_DAY,
  }
}