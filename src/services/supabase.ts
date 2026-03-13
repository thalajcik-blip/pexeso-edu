import { createClient } from '@supabase/supabase-js'
import type { CustomDeckData, CustomDeckCard } from '../types/game'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function fetchCustomDeckFull(id: string): Promise<CustomDeckData | null> {
  const [{ data: deckRow }, { data: cards }] = await Promise.all([
    supabase.from('custom_decks').select('language, results_config').eq('id', id).single(),
    supabase.from('custom_cards')
      .select('image_url, label, quiz_question, answers, display_count, quiz_options, quiz_correct, fun_fact, translations')
      .eq('deck_id', id)
      .order('sort_order'),
  ])
  if (!cards) return null
  const pool: CustomDeckData['pool'] = {}
  type RawCard = { image_url: string; label: string; quiz_question: string | null; answers: CustomDeckCard['answers']; display_count: number; quiz_options: [string,string,string,string] | null; quiz_correct: string | null; fun_fact: string | null; translations?: CustomDeckCard['translations'] }
  cards.forEach((c: RawCard) => {
    pool[c.image_url] = {
      image_url: c.image_url,
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
    title: '',
    language: deckRow?.language ?? 'cs',
    thumbnail: cards[0]?.image_url ?? null,
    pool,
    results_config: deckRow?.results_config ?? null,
  }
}
