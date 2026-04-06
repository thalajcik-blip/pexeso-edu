import { createClient } from '@supabase/supabase-js'
import type { CustomDeckData, CustomDeckCard } from '../types/game'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function incrementDeckPlayCount(deckId: string) {
  supabase.rpc('increment_deck_play_count', { p_deck_id: deckId }).then()
}

export async function fetchCustomDeckFull(id: string): Promise<CustomDeckData | null> {
  const [{ data: deckRow }, { data: cards }] = await Promise.all([
    supabase.from('custom_decks').select('title, language, deck_type, results_config').eq('id', id).single(),
    supabase.from('custom_cards')
      .select('image_url, audio_url, label, quiz_question, answers, display_count, quiz_options, quiz_correct, fun_fact, translations')
      .eq('deck_id', id)
      .order('sort_order'),
  ])
  if (!cards) return null
  const deckType: 'image' | 'audio' | 'text' = deckRow?.deck_type === 'audio' ? 'audio' : deckRow?.deck_type === 'text' ? 'text' : 'image'
  const pool: CustomDeckData['pool'] = {}
  type RawCard = { image_url: string | null; audio_url?: string; label: string; quiz_question: string | null; answers: CustomDeckCard['answers']; display_count: number; quiz_options: [string,string,string,string] | null; quiz_correct: string | null; fun_fact: string | null; translations?: CustomDeckCard['translations'] }
  cards.forEach((c: RawCard) => {
    const key = deckType === 'audio' ? (c.audio_url ?? c.image_url ?? c.label) : deckType === 'text' ? c.label : (c.image_url ?? c.label)
    pool[key] = {
      image_url: c.image_url ?? '',
      audio_url: c.audio_url,
      label: c.label,
      quiz_question: c.quiz_question,
      answers: c.answers ?? null,
      display_count: c.display_count ?? 4,
      quiz_options: c.quiz_options,
      quiz_correct: c.quiz_correct,
      fun_fact: c.fun_fact,
      translations: c.translations,
    }
  })
  return {
    id,
    title: deckRow?.title ?? '',
    language: deckRow?.language ?? 'cs',
    deck_type: deckType,
    thumbnail: (deckType === 'audio' || deckType === 'text') ? null : (cards[0]?.image_url || null),
    pool,
    results_config: deckRow?.results_config ?? null,
  }
}
