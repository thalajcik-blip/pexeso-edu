import { useEffect, useRef, useState } from 'react'
import { supabase } from '../services/supabase'
import type { AdminRole } from './useAuth'

type Deck = {
  id: string
  title: string
  description: string | null
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  is_private: boolean
  private_code: string | null
  language: 'cs' | 'sk' | 'en'
  difficulty: 'easy' | 'medium' | 'hard'
  created_at: string
}

const LANG_FLAG: Record<Deck['language'], string> = { cs: '🇨🇿', sk: '🇸🇰', en: '🇬🇧' }
const LANG_LABEL: Record<Deck['language'], string> = { cs: 'CS', sk: 'SK', en: 'EN' }
const ALL_LANGS: Deck['language'][] = ['cs', 'sk', 'en']

type Props = {
  role: AdminRole
  onNew: () => void
  onEdit: (deck: Deck) => void
}

const STATUS_LABEL: Record<Deck['status'], string> = {
  draft:    'Koncept',
  pending:  'Čeká na schválení',
  approved: 'Schváleno',
  rejected: 'Zamítnuto',
}

const STATUS_COLOR: Record<Deck['status'], string> = {
  draft:    'bg-gray-100 text-gray-600',
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
}

type DeckJson = {
  version: number
  title: string
  description?: string | null
  language: Deck['language']
  difficulty: 'easy' | 'medium' | 'hard'
  is_private?: boolean
  cards: {
    image_url: string
    label: string
    quiz_question: string
    quiz_options: [string, string, string, string]
    quiz_correct: string
    fun_fact: string
    sort_order: number
  }[]
}

type TranslateState = {
  deckId: string
  targetLang: Deck['language'] | null
  progress: { done: number; total: number } | null
  error: string
}

export default function DeckList({ role, onNew, onEdit }: Props) {
  const [decks, setDecks]         = useState<Deck[]>([])
  const [loading, setLoading]     = useState(true)
  const [importing, setImporting] = useState(false)
  const [translate, setTranslate] = useState<TranslateState | null>(null)
  const importRef                 = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('custom_decks')
      .select('*')
      .order('created_at', { ascending: false })
    setDecks(data ?? [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: Deck['status']) {
    await supabase.from('custom_decks').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    load()
  }

  async function deleteDeck(id: string) {
    if (!confirm('Opravdu smazat tuto sadu?')) return
    await supabase.from('custom_decks').delete().eq('id', id)
    load()
  }

  async function runTranslate(deck: Deck, targetLang: Deck['language']) {
    setTranslate({ deckId: deck.id, targetLang, progress: { done: 0, total: 0 }, error: '' })

    const { data: cards } = await supabase
      .from('custom_cards')
      .select('*')
      .eq('deck_id', deck.id)
      .order('sort_order')

    if (!cards || cards.length === 0) {
      setTranslate(null)
      return
    }

    const translatableCards = cards.filter((c: { quiz_question: string }) => c.quiz_question)
    setTranslate(t => t ? { ...t, progress: { done: 0, total: translatableCards.length } } : null)

    // Create new deck
    const { data: newDeck, error: deckErr } = await supabase
      .from('custom_decks')
      .insert({
        title: `${deck.title} (${LANG_LABEL[targetLang]})`,
        description: deck.description,
        language: targetLang,
        difficulty: deck.difficulty,
        is_private: deck.is_private,
        private_code: deck.private_code,
        status: 'draft',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (deckErr || !newDeck) {
      setTranslate(t => t ? { ...t, error: 'Nepodařilo se vytvořit sadu.' } : null)
      return
    }

    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-quiz`
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}`, 'apikey': anonKey }

    // Translate deck title
    let translatedTitle = `${deck.title} (${LANG_LABEL[targetLang]})`
    try {
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ mode: 'text', text: deck.title, source_lang: deck.language, target_lang: targetLang }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.text && !data.error) translatedTitle = data.text
      }
    } catch (e) { console.error('Title translation failed:', e) }

    await supabase.from('custom_decks').update({ title: translatedTitle }).eq('id', newDeck.id)

    const errors: string[] = []
    const translatedCards = []
    let doneCount = 0

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i]
      let translatedCard = {
        deck_id: newDeck.id,
        image_url: card.image_url,
        label: card.label,
        quiz_question: card.quiz_question,
        quiz_options: card.quiz_options,
        quiz_correct: card.quiz_correct,
        fun_fact: card.fun_fact,
        sort_order: card.sort_order,
      }

      if (card.quiz_question && card.quiz_correct) {
        try {
          const res = await fetch(fnUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              label: card.label,
              quiz_question: card.quiz_question,
              quiz_options: card.quiz_options,
              quiz_correct: card.quiz_correct,
              fun_fact: card.fun_fact,
              source_lang: deck.language,
              target_lang: targetLang,
            }),
          })
          const translated = await res.json()
          if (!res.ok || translated.error) {
            errors.push(`Karta "${card.label}": ${translated.error ?? res.status}`)
          } else {
            translatedCard = { ...translatedCard, ...translated }
          }
        } catch (e) {
          errors.push(`Karta "${card.label}": ${String(e)}`)
        }
        doneCount++
        setTranslate(t => t ? { ...t, progress: { done: doneCount, total: translatableCards.length } } : null)
        // Avoid rate limiting (Gemini free tier: 15 req/min)
        await new Promise(r => setTimeout(r, 4200))
      }

      translatedCards.push(translatedCard)
    }

    await supabase.from('custom_cards').insert(translatedCards)

    if (errors.length > 0) {
      setTranslate(t => t ? { ...t, progress: null, error: `${errors.length} karet se nepodařilo přeložit. První chyba: ${errors[0]}` } : null)
    } else {
      setTranslate(null)
    }
    load()
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImporting(true)
    try {
      const text = await file.text()
      const json: DeckJson = JSON.parse(text)
      if (!json.title || !Array.isArray(json.cards)) throw new Error('Neplatný formát souboru')

      const { data: newDeck, error } = await supabase
        .from('custom_decks')
        .insert({
          title: json.title,
          description: json.description ?? null,
          language: json.language ?? 'cs',
          difficulty: json.difficulty ?? 'medium',
          is_private: json.is_private ?? false,
          private_code: null,
          status: 'draft',
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()
      if (error || !newDeck) throw error ?? new Error('Nepodařilo se vytvořit sadu')

      if (json.cards.length > 0) {
        const cardRows = json.cards.map((c, i) => ({
          deck_id: newDeck.id,
          image_url: c.image_url,
          label: c.label,
          quiz_question: c.quiz_question,
          quiz_options: c.quiz_options,
          quiz_correct: c.quiz_correct,
          fun_fact: c.fun_fact,
          sort_order: c.sort_order ?? i,
        }))
        const { error: cardsErr } = await supabase.from('custom_cards').insert(cardRows)
        if (cardsErr) throw cardsErr
      }

      load()
    } catch (err) {
      alert(`Import selhal: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setImporting(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="text-gray-400 text-sm p-8">Načítání…</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Vlastní sady</h1>
        <div className="flex items-center gap-2">
          {role === 'superadmin' && (
            <>
              <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
              <button
                onClick={() => importRef.current?.click()}
                disabled={importing}
                className="px-4 py-2 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-sm font-semibold hover:bg-indigo-50 disabled:opacity-50 transition-colors"
              >
                {importing ? 'Importuji…' : '↑ Import JSON'}
              </button>
            </>
          )}
          <button
            onClick={onNew}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            + Nová sada
          </button>
        </div>
      </div>

      {decks.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">🃏</div>
          <div>Zatím žádné sady</div>
        </div>
      ) : (
        <div className="space-y-3">
          {decks.map(deck => {
            const isTranslating = translate?.deckId === deck.id && !!translate.progress
            const isPickingLang = translate?.deckId === deck.id && !translate.progress
            const targetLangs   = ALL_LANGS.filter(l => l !== deck.language)

            return (
              <div key={deck.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none shrink-0">{LANG_FLAG[deck.language]}</span>
                      <span className="font-semibold text-gray-800 truncate">{deck.title}</span>
                    </div>
                    {deck.description && (
                      <div className="text-xs text-gray-400 truncate mt-0.5">{deck.description}</div>
                    )}
                  </div>

                  <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${STATUS_COLOR[deck.status]}`}>
                    {STATUS_LABEL[deck.status]}
                  </span>

                  {deck.is_private && (
                    <span className="text-xs text-indigo-500 font-mono shrink-0">🔒 {deck.private_code}</span>
                  )}

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onEdit(deck)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      Upravit
                    </button>

                    {role === 'superadmin' && (
                      <button
                        onClick={() => setTranslate(isPickingLang ? null : { deckId: deck.id, targetLang: null, progress: null, error: '' })}
                        disabled={isTranslating}
                        title="Přeložit sadu do jiného jazyka"
                        className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${isPickingLang ? 'border-indigo-400 bg-indigo-50 text-indigo-600' : 'border-gray-200 hover:bg-gray-50 text-gray-500'}`}
                      >
                        🌐
                      </button>
                    )}

                    {role === 'superadmin' && deck.status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateStatus(deck.id, 'approved')}
                          className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                        >
                          Schválit
                        </button>
                        <button
                          onClick={() => updateStatus(deck.id, 'rejected')}
                          className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        >
                          Zamítnout
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => deleteDeck(deck.id)}
                      className="text-xs px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                    >
                      Smazat
                    </button>
                  </div>
                </div>

                {/* Language picker */}
                {isPickingLang && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500">Přeložit do:</span>
                    {targetLangs.map(lang => (
                      <button
                        key={lang}
                        onClick={() => runTranslate(deck, lang)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium transition-colors"
                      >
                        {LANG_FLAG[lang]} {LANG_LABEL[lang]}
                      </button>
                    ))}
                  </div>
                )}

                {/* Progress */}
                {isTranslating && translate.progress && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                      <span>Překládám do {LANG_FLAG[translate.targetLang!]} {LANG_LABEL[translate.targetLang!]}…</span>
                      <span>{translate.progress.done}/{translate.progress.total}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: translate.progress.total > 0 ? `${(translate.progress.done / translate.progress.total) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                )}

                {translate?.deckId === deck.id && translate.error && (
                  <div className="mt-2 text-xs text-red-600">{translate.error}</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
