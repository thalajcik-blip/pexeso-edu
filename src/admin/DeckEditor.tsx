import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import CardModal, { type CardData } from './CardModal'
import BulkUploadModal from './BulkUploadModal'
import AdminSelect from './AdminSelect'

type Deck = {
  id: string
  title: string
  description: string | null
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  is_private: boolean
  private_code: string | null
  language: 'cs' | 'sk' | 'en'
  difficulty: 'easy' | 'medium' | 'hard'
}

type Props = {
  deckId: string | null  // null = new deck
  isSuperadmin: boolean
  onBack: () => void
}

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export default function DeckEditor({ deckId, isSuperadmin, onBack }: Props) {
  const [deck, setDeck]         = useState<Deck | null>(null)
  const [title, setTitle]       = useState('')
  const [desc, setDesc]         = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [language, setLanguage]     = useState<Deck['language']>('cs')
  const [difficulty, setDifficulty] = useState<Deck['difficulty']>('medium')
  const [status, setStatus]         = useState<Deck['status']>('draft')
  const [cards, setCards]       = useState<CardData[]>([])
  const [editCard, setEditCard]   = useState<CardData | 'new' | null>(null)
  const [bulkOpen, setBulkOpen]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [loading, setLoading]   = useState(!!deckId)
  const [saved, setSaved]       = useState(false)
  const [sort, setSort] = useState<'default' | 'newest' | 'oldest' | 'az' | 'za'>('default')
  const [translating, setTranslating]   = useState(false)
  const [translateProgress, setTranslateProgress] = useState<{ done: number; total: number } | null>(null)
  const [translateError, setTranslateError] = useState('')

  useEffect(() => {
    if (!deckId) return
    Promise.all([
      supabase.from('custom_decks').select('*').eq('id', deckId).single(),
      supabase.from('custom_cards').select('*').eq('deck_id', deckId).order('sort_order'),
    ]).then(([{ data: d }, { data: c }]) => {
      if (d) {
        setDeck(d)
        setTitle(d.title)
        setDesc(d.description ?? '')
        setIsPrivate(d.is_private)
        setLanguage(d.language ?? 'cs')
        setDifficulty(d.difficulty ?? 'medium')
        setStatus(d.status)
      }
      setCards(c ?? [])
      setLoading(false)
    })
  }, [deckId])

  async function saveDeck(): Promise<string | null> {
    setSaving(true)
    setSaved(false)
    const payload = {
      title: title.trim(),
      description: desc.trim() || null,
      is_private:  isPrivate,
      private_code: isPrivate ? (deck?.private_code ?? generateCode()) : null,
      language,
      difficulty,
      status,
      updated_at: new Date().toISOString(),
    }

    if (deck) {
      await supabase.from('custom_decks').update(payload).eq('id', deck.id)
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      return deck.id
    } else {
      const { data, error } = await supabase.from('custom_decks').insert(payload).select().single()
      setSaving(false)
      if (error || !data) return null
      setDeck(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      return data.id
    }
  }

  async function translateAll() {
    if (!deck || cards.length === 0) return
    const ALL_LANGS = ['cs', 'sk', 'en']
    const targetLangs = ALL_LANGS.filter(l => l !== deck.language)
    const translatableCards = cards.filter(c => c.quiz_question && c.quiz_correct && c.quiz_options?.length)
    if (translatableCards.length === 0) return

    setTranslating(true)
    setTranslateError('')
    setTranslateProgress({ done: 0, total: translatableCards.length })

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    for (let i = 0; i < translatableCards.length; i++) {
      const card = translatableCards[i]
      const existingTranslations: Record<string, unknown> = (card as CardData & { translations?: Record<string, unknown> }).translations ?? {}
      const newTranslations = { ...existingTranslations }

      for (const targetLang of targetLangs) {
        if (newTranslations[targetLang]) continue // already translated
        try {
          const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-quiz`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({
                label: card.label,
                quiz_question: card.quiz_question,
                quiz_options: card.quiz_options,
                quiz_correct: card.quiz_correct,
                fun_fact: card.fun_fact,
                source_lang: deck.language,
                target_lang: targetLang,
              }),
            }
          )
          if (res.ok) {
            const translated = await res.json()
            if (!translated.error) newTranslations[targetLang] = translated
          }
        } catch (e) {
          console.error(`Translation failed for card ${card.id}, lang ${targetLang}:`, e)
        }
      }

      await supabase.from('custom_cards').update({ translations: newTranslations }).eq('id', card.id!)
      setTranslateProgress({ done: i + 1, total: translatableCards.length })
    }

    setTranslating(false)
    setTranslateProgress(null)
    reloadCards()
  }

  async function deleteCard(cardId: string) {
    if (!confirm('Smazat tuto kartičku?')) return
    await supabase.from('custom_cards').delete().eq('id', cardId)
    setCards(prev => prev.filter(c => c.id !== cardId))
  }

  function reloadCards() {
    if (!deck) return
    supabase.from('custom_cards').select('*').eq('deck_id', deck.id).order('sort_order')
      .then(({ data }) => setCards(data ?? []))
  }

  const currentDeckId = deck?.id ?? null

  async function handleExport() {
    if (!deck) return
    const { data: allCards } = await supabase
      .from('custom_cards')
      .select('image_url, label, quiz_question, quiz_options, quiz_correct, fun_fact, sort_order')
      .eq('deck_id', deck.id)
      .order('sort_order')
    const payload = {
      version: 1,
      title: deck.title,
      description: deck.description,
      language: deck.language,
      difficulty: deck.difficulty,
      is_private: deck.is_private,
      cards: allCards ?? [],
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${deck.title.toLowerCase().replace(/\s+/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const sortedCards = [...cards].sort((a, b) => {
    if (sort === 'newest') return (b.created_at ?? '') > (a.created_at ?? '') ? 1 : -1
    if (sort === 'oldest') return (a.created_at ?? '') > (b.created_at ?? '') ? 1 : -1
    if (sort === 'az') return (a.label ?? '').localeCompare(b.label ?? '', 'cs')
    if (sort === 'za') return (b.label ?? '').localeCompare(a.label ?? '', 'cs')
    return a.sort_order - b.sort_order  // default
  })

  if (loading) return <div className="text-gray-400 text-sm p-8">Načítání…</div>

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          ← Zpět
        </button>
        <h1 className="text-xl font-bold text-gray-800">
          {deck ? 'Upravit sadu' : 'Nová sada'}
        </h1>
        {isSuperadmin && deck && (
          <div className="ml-auto flex items-center gap-2">
            {translateProgress && (
              <span className="text-xs text-indigo-500">
                Překládám {translateProgress.done}/{translateProgress.total}…
              </span>
            )}
            {translateError && (
              <span className="text-xs text-red-500">{translateError}</span>
            )}
            <button
              onClick={translateAll}
              disabled={translating || cards.filter(c => c.quiz_question).length === 0}
              className="text-xs px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 transition-colors"
            >
              {translating ? '⏳ Překládám…' : '🌐 Přeložit vše'}
            </button>
            <button
              onClick={handleExport}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              ↓ Export JSON
            </button>
          </div>
        )}
      </div>

      {/* Deck metadata */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Název *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="např. Dinosauři"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Popis <span className="text-gray-300">(volitelné)</span></label>
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            rows={2}
            placeholder="Krátký popis sady…"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
          />
        </div>

        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Jazyk sady</label>
            <AdminSelect value={language} onChange={e => setLanguage(e.target.value as Deck['language'])}>
              <option value="cs">🇨🇿 Čeština</option>
              <option value="sk">🇸🇰 Slovenčina</option>
              <option value="en">🇬🇧 English</option>
            </AdminSelect>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Obtížnost kvízu</label>
            <AdminSelect value={difficulty} onChange={e => setDifficulty(e.target.value as Deck['difficulty'])}>
              <option value="easy">🟢 Snadná</option>
              <option value="medium">🟡 Střední</option>
              <option value="hard">🔴 Těžká</option>
            </AdminSelect>
          </div>

          {isSuperadmin && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <AdminSelect value={status} onChange={e => setStatus(e.target.value as Deck['status'])}>
                <option value="draft">Koncept</option>
                <option value="pending">Čeká na schválení</option>
                <option value="approved">Schváleno</option>
                <option value="rejected">Zamítnuto</option>
              </AdminSelect>
            </div>
          )}

          <div className="flex items-center gap-2 pb-0.5">
            <input
              id="private"
              type="checkbox"
              checked={isPrivate}
              onChange={e => setIsPrivate(e.target.checked)}
              className="accent-indigo-600"
            />
            <label htmlFor="private" className="text-sm text-gray-700">Soukromá sada</label>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={saveDeck}
            disabled={saving || !title.trim()}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Ukládání…' : deck ? 'Uložit změny' : 'Vytvořit sadu'}
          </button>
          {saved && <span className="text-xs text-green-600">✓ Uloženo</span>}
        </div>
      </div>

      {/* Cards section */}
      {(deck || currentDeckId) && (
        <div>
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h2 className="font-semibold text-gray-700">
              Kartičky <span className="text-gray-400 font-normal">({cards.length})</span>
            </h2>
            <div className="flex items-center gap-2">
              {cards.length > 1 && (
                <AdminSelect
                  value={sort}
                  onChange={e => setSort(e.target.value as typeof sort)}
                  className="text-xs text-gray-600"
                >
                  <option value="default">Pořadí (výchozí)</option>
                  <option value="newest">Nejnovější první</option>
                  <option value="oldest">Nejstarší první</option>
                  <option value="az">Abecedně A–Z</option>
                  <option value="za">Abecedně Z–A</option>
                </AdminSelect>
              )}
              <button
                onClick={() => setBulkOpen(true)}
                className="px-4 py-2 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition-colors"
              >
                + Hromadně
              </button>
              <button
                onClick={() => setEditCard('new')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                + Kartičku
              </button>
            </div>
          </div>

          {cards.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
              <div className="text-3xl mb-2">🃏</div>
              <div className="text-sm">Zatím žádné kartičky</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {sortedCards.map((card) => (
                <div key={card.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden group">
                  <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                    <img src={card.image_url} alt={card.label ?? ''} className="w-full h-full object-contain p-2" />
                  </div>
                  <div className="p-2">
                    {card.label && <div className="text-xs font-medium text-gray-700 truncate">{card.label}</div>}
                    {card.quiz_question && <div className="text-xs text-gray-400 truncate mt-0.5">🧠 {card.quiz_question}</div>}
                    <div className="flex gap-1 mt-2">
                      <button
                        onClick={() => setEditCard(card)}
                        className="flex-1 text-xs py-1 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        Upravit
                      </button>
                      <button
                        onClick={() => card.id && deleteCard(card.id)}
                        className="text-xs px-2 py-1 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!deck && !currentDeckId && (
        <div className="text-sm text-gray-400 text-center py-8">
          Nejprve vytvořte sadu, pak budete moci přidávat kartičky.
        </div>
      )}

      {/* Bulk upload modal */}
      {bulkOpen && currentDeckId && (
        <BulkUploadModal
          deckId={currentDeckId}
          language={language}
          difficulty={difficulty}
          startIndex={cards.length}
          onDone={() => { setBulkOpen(false); reloadCards() }}
          onClose={() => setBulkOpen(false)}
        />
      )}

      {/* Card modal */}
      {editCard && currentDeckId && (
        <CardModal
          deckId={currentDeckId}
          language={language}
          difficulty={difficulty}
          card={editCard === 'new' ? undefined : editCard}
          sortOrder={cards.length}
          onSave={() => { setEditCard(null); reloadCards() }}
          onClose={() => setEditCard(null)}
        />
      )}
    </div>
  )
}
