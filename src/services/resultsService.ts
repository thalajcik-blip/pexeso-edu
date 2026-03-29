import { supabase } from './supabase'
import type { GameResultRow } from '../types/gameResult'

export const SET_NAMES: Record<string, string> = {
  flags: 'Vlajky',
  animals: 'Zvířátka',
  fruits: 'Ovoce & zelenina',
  jobs: 'Povolání',
}

export const MODE_LABELS: Record<string, { emoji: string; label: string }> = {
  pexequiz: { emoji: '🃏', label: 'PexeQuiz' },
  lightning: { emoji: '⚡', label: 'Bleskový kvíz' },
}

export async function getGameResults(opts: {
  mode?: 'pexequiz' | 'lightning'
  limit?: number
  userId?: string
}): Promise<GameResultRow[]> {
  let query = supabase
    .from('game_history')
    .select('id, played_at, user_id, set_slug, set_title, custom_deck_id, game_mode, score, quiz_correct, quiz_total, total_pairs, duration_sec, is_multiplayer, profiles!inner(username, avatar_id)')

  if (opts.userId) {
    query = query.eq('user_id', opts.userId)
  }

  if (opts.mode) {
    query = query.eq('game_mode', opts.mode)
  }

  query = query
    .order('played_at', { ascending: false })
    .limit(opts.limit ?? 100)

  const { data, error } = await query

  if (error || !data) {
    console.error('[resultsService] getGameResults error:', error)
    return []
  }

  type RawRow = {
    id: string
    played_at: string
    user_id: string
    set_slug: string | null
    set_title: string | null
    custom_deck_id: string | null
    game_mode: string
    score: number
    quiz_correct: number
    quiz_total: number
    total_pairs: number
    duration_sec: number
    is_multiplayer: boolean
    profiles: { username: string | null; avatar_id: number | null }
  }

  return (data as unknown as RawRow[]).map((row) => ({
    id: row.id,
    played_at: row.played_at,
    username: row.profiles.username ?? 'Anonym',
    avatar_id: row.profiles.avatar_id ?? 0,
    set_slug: row.set_slug,
    set_title: row.set_title,
    custom_deck_id: row.custom_deck_id,
    game_mode: row.game_mode as 'pexequiz' | 'lightning',
    score: row.score,
    quiz_correct: row.quiz_correct,
    quiz_total: row.quiz_total,
    total_pairs: row.total_pairs,
    duration_sec: row.duration_sec,
    is_multiplayer: row.is_multiplayer,
    accuracy: row.quiz_total > 0
      ? Math.round(row.quiz_correct / row.quiz_total * 100)
      : null,
    set_name: row.set_title ?? (row.set_slug ? (SET_NAMES[row.set_slug] ?? row.set_slug) : '—'),
  }))
}
