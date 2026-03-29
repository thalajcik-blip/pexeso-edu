import { createElement } from 'react'
import { toast } from 'sonner'
import { supabase } from './supabase'
import { useAuthStore, getLevel } from '../store/authStore'
import { useGameStore } from '../store/gameStore'
import { XPToast } from '../components/auth/XPToast'

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
  const { user, profile } = useAuthStore.getState()
  if (!user) return

  const xpEarned  = calculateXP(result)
  const xpBefore  = profile?.xp ?? 0
  const xpAfter   = xpBefore + xpEarned
  const levelBefore = getLevel(xpBefore)
  const levelAfter  = getLevel(xpAfter)
  const leveledUp   = levelAfter > levelBefore
  const language    = useGameStore.getState().language

  const { error } = await supabase.from('game_history').insert({
    user_id:        user.id,
    played_at:      new Date().toISOString(),
    set_slug:       result.setSlug,
    set_title:      result.setTitle,
    custom_deck_id: result.customDeckId,
    game_mode:      result.mode,
    score:          result.score,
    quiz_correct:   result.quizCorrect,
    quiz_total:     result.quizTotal,
    total_pairs:    result.totalPairs,
    duration_sec:   result.durationSec,
    is_multiplayer: result.isMultiplayer,
  })

  if (!error) {
    await useAuthStore.getState().addXP(xpEarned)

    // Level-up toast first, then XP progress toast
    const showXPProgress = () => {
      toast.custom(() => createElement(XPToast, {
        xpEarned,
        xpBefore,
        xpAfter,
        levelAfter,
        leveledUp,
        language,
      }), {
        id: `xp-${Date.now()}`,
        duration: 5000,
        unstyled: true,
      })
    }

    setTimeout(showXPProgress, 800)
  }
}
