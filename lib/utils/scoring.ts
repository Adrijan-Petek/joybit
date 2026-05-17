/**
 * Leaderboard scoring system constants and utilities
 */

export const SCORING_SYSTEM = {
  MATCH3_WIN: 100,
  MATCH3_GAME: 50,
} as const

export type ScoringEvent =
  | 'match3_win'
  | 'match3_game'

/**
 * Calculate leaderboard points for a scoring event
 */
export function calculateLeaderboardPoints(event: ScoringEvent): number {
  switch (event) {
    case 'match3_win':
      return SCORING_SYSTEM.MATCH3_WIN
    case 'match3_game':
      return SCORING_SYSTEM.MATCH3_GAME
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
  }
}
