import { useEffect, useState } from 'react'
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
  created_at: string
}

const LANG_FLAG: Record<Deck['language'], string> = { cs: '🇨🇿', sk: '🇸🇰', en: '🇬🇧' }

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

export default function DeckList({ role, onNew, onEdit }: Props) {
  const [decks, setDecks]     = useState<Deck[]>([])
  const [loading, setLoading] = useState(true)

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

  useEffect(() => { load() }, [])

  if (loading) return <div className="text-gray-400 text-sm p-8">Načítání…</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Vlastní sady</h1>
        <button
          onClick={onNew}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          + Nová sada
        </button>
      </div>

      {decks.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">🃏</div>
          <div>Zatím žádné sady</div>
        </div>
      ) : (
        <div className="space-y-3">
          {decks.map(deck => (
            <div key={deck.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
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
          ))}
        </div>
      )}
    </div>
  )
}
