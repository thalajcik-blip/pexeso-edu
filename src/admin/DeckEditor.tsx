import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import CardModal, { type CardData } from './CardModal'
import BulkUploadModal from './BulkUploadModal'

type Deck = {
  id: string
  title: string
  description: string | null
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  is_private: boolean
  private_code: string | null
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
  const [status, setStatus]     = useState<Deck['status']>('draft')
  const [cards, setCards]       = useState<CardData[]>([])
  const [editCard, setEditCard]   = useState<CardData | 'new' | null>(null)
  const [bulkOpen, setBulkOpen]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [loading, setLoading]   = useState(!!deckId)
  const [saved, setSaved]       = useState(false)

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

  if (loading) return <div className="text-gray-400 text-sm p-8">Načítání…</div>

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          ← Zpět
        </button>
        <h1 className="text-xl font-bold text-gray-800">
          {deck ? 'Upravit deck' : 'Nový deck'}
        </h1>
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
            placeholder="Krátký popis decku…"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
          />
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <input
              id="private"
              type="checkbox"
              checked={isPrivate}
              onChange={e => setIsPrivate(e.target.checked)}
              className="accent-indigo-600"
            />
            <label htmlFor="private" className="text-sm text-gray-700">Soukromý deck</label>
          </div>

          {isSuperadmin && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600">Status:</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as Deck['status'])}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-400"
              >
                <option value="draft">Koncept</option>
                <option value="pending">Čeká na schválení</option>
                <option value="approved">Schváleno</option>
                <option value="rejected">Zamítnuto</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={saveDeck}
            disabled={saving || !title.trim()}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Ukládání…' : deck ? 'Uložit změny' : 'Vytvořit deck'}
          </button>
          {saved && <span className="text-xs text-green-600">✓ Uloženo</span>}
        </div>
      </div>

      {/* Cards section */}
      {(deck || currentDeckId) && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">
              Kartičky <span className="text-gray-400 font-normal">({cards.length})</span>
            </h2>
            <div className="flex gap-2">
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
                + Přidat kartičku
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
              {cards.map((card) => (
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
          Nejprve vytvořte deck, pak budete moci přidávat kartičky.
        </div>
      )}

      {/* Bulk upload modal */}
      {bulkOpen && currentDeckId && (
        <BulkUploadModal
          deckId={currentDeckId}
          startIndex={cards.length}
          onDone={() => { setBulkOpen(false); reloadCards() }}
          onClose={() => setBulkOpen(false)}
        />
      )}

      {/* Card modal */}
      {editCard && currentDeckId && (
        <CardModal
          deckId={currentDeckId}
          card={editCard === 'new' ? undefined : editCard}
          sortOrder={cards.length}
          onSave={() => { setEditCard(null); reloadCards() }}
          onClose={() => setEditCard(null)}
        />
      )}
    </div>
  )
}
