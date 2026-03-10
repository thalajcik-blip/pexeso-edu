import { createClient } from '@supabase/supabase-js'
import type { CustomDeckData } from '../types/game'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function fetchCustomDeckFull(id: string): Promise<CustomDeckData | null> {
  const { data: cards } = await supabase
    .from('custom_cards')
    .select('image_url, label, quiz_question, quiz_options, quiz_correct, fun_fact, translations')
    .eq('deck_id', id)
    .order('sort_order')
  if (!cards) return null
  const pool: CustomDeckData['pool'] = {}
  cards.forEach((c: { image_url: string; label: string; quiz_question: string | null; quiz_options: [string,string,string,string] | null; quiz_correct: string | null; fun_fact: string | null; translations?: Record<string, unknown> }) => {
    pool[c.image_url] = {
      image_url: c.image_url,
      label: c.label,
      quiz_question: c.quiz_question,
      quiz_options: c.quiz_options,
      quiz_correct: c.quiz_correct,
      fun_fact: c.fun_fact,
      translations: c.translations,
    }
  })
  return { id, title: '', thumbnail: cards[0]?.image_url ?? null, pool }
}
