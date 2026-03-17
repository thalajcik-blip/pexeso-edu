import { supabase } from './supabase'
import { useAuthStore } from '../store/authStore'

export interface GameResult {
  setSlug: string | null       // built-in deck ID (e.g. 'flags', 'animals')
  setTitle: string | null      // display name snapshot
  customDeckId: string | null  // custom deck UUID
  mode: 'pexequiz' | 'lightning'
  score: number
  quizCorrect: number
  quizTotal: number
  totalPairs: number
  durationSec: number
  isMultiplayer: boolean
}

export function calculateXP(result: GameResult): number {
  let xp = 10                   // game completion
  xp += result.totalPairs * 2   // per pair found
  xp += result.quizCorrect * 5  // per correct quiz answer
  if (result.quizTotal > 0 && result.quizCorrect === result.quizTotal) xp += 20  // 100% bonus
  return xp
}

export async function saveGameResult(result: GameResult): Promise<void> {
  const { user } = useAuthStore.getState()
  if (!user) return
  const { error } = await supabase.from('game_history').insert({
    user_id:       user.id,
    set_slug:      result.setSlug,
    set_title:     result.setTitle,
    set_id:        result.customDeckId,
    game_mode:     result.mode,
    score:         result.score,
    correct_quiz:  result.quizCorrect,
    total_quiz:    result.quizTotal,
    total_pairs:   result.totalPairs,
    duration_sec:  result.durationSec,
    is_multiplayer: result.isMultiplayer,
  })
  if (!error) {
    await useAuthStore.getState().addXP(calculateXP(result))
  }
}
