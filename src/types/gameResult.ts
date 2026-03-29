/**
 * Display type for leaderboard table rows.
 * NOTE: Do NOT confuse with `GameResult` in gameService.ts — that is for INSERT operations.
 * This type represents a row fetched from game_history joined with profiles for display.
 */
export type GameResultRow = {
  id: string
  played_at: string
  username: string
  avatar_id: number
  set_slug: string | null
  set_title: string | null
  custom_deck_id: string | null
  game_mode: 'pexequiz' | 'lightning'  // DB values — NOT 'bleskovy_kviz'
  score: number
  quiz_correct: number
  quiz_total: number
  total_pairs: number
  duration_sec: number
  is_multiplayer: boolean
  // Computed on frontend:
  accuracy: number | null   // quiz_total > 0 ? Math.round(quiz_correct / quiz_total * 100) : null
  set_name: string          // Display name from SET_NAMES lookup or set_title
}
