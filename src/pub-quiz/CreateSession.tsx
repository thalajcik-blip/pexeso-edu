import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { usePubQuizStore } from '../store/pubQuizStore'
import { createSession, joinChannel } from '../services/pubQuizService'
import { DECKS } from '../data/decks'
import type { PubQuizRound } from '../types/pubQuiz'

const GAME_MODE_LABELS = {
  pexequiz: 'PexeQuiz (100 bodů/otázka)',
  bleskovy_kviz: 'Bleskový kvíz (rychlost = body)',
}

const DEFAULT_ROUND: Omit<PubQuizRound, 'roundNumber' | 'status'> = {
  gameMode: 'bleskovy_kviz',
  setSlug: 'flags',
  questionCount: 10,
  doublePoints: false,
}

export default function CreateSession() {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const { initSession, setRounds, applyEvent } = usePubQuizStore()

  const [rounds, setLocalRounds] = useState<Omit<PubQuizRound, 'roundNumber' | 'status'>[]>([
    { ...DEFAULT_ROUND },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isTeacher = profile?.roles?.includes('teacher') || profile?.roles?.includes('superadmin') || profile?.roles?.includes('admin')

  function addRound() {
    if (rounds.length >= 8) return
    setLocalRounds(r => [...r, { ...DEFAULT_ROUND }])
  }

  function removeRound(i: number) {
    setLocalRounds(r => r.filter((_, idx) => idx !== i))
  }

  function updateRound(i: number, patch: Partial<typeof rounds[0]>) {
    setLocalRounds(r => r.map((round, idx) => idx === i ? { ...round, ...patch } : round))
  }

  async function handleCreate() {
    if (!user) { setError('Musíš být přihlášen jako učitel.'); return }
    if (!isTeacher) { setError('Pub Kvíz je dostupný pouze pro učitele.'); return }
    if (rounds.length === 0) { setError('Přidej alespoň jedno kolo.'); return }

    setLoading(true)
    setError('')
    const session = await createSession(user.id)
    if (!session) { setError('Nepodařilo se vytvořit session.'); setLoading(false); return }

    const fullRounds: PubQuizRound[] = rounds.map((r, i) => ({
      ...r,
      roundNumber: i + 1,
      status: 'pending',
    }))

    initSession(session.id, session.code, user.id)
    setRounds(fullRounds)
    joinChannel(session.code, applyEvent)
    navigate(`/host/${session.code}`)
  }

  if (!user || !isTeacher) {
    return (
      <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center p-6">
        <div className="bg-[#1a2a3a] rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h2 className="text-2xl font-bold text-white mb-2">Pub Kvíz je pro učitele</h2>
          <p className="text-[#8899aa] mb-6">Organizuj live kvízy pro celou třídu s projektorem a týmy.</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-[#f9d74e] text-[#0d1b2a] font-bold rounded-xl"
          >
            ← Zpět na Pexedu
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d1b2a] p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => window.location.href = '/'} className="text-[#8899aa] hover:text-white text-sm">
            ← Zpět
          </button>
          <h1 className="text-2xl font-bold text-white">🎯 Nový Pub Kvíz</h1>
        </div>

        {/* Rounds */}
        <div className="bg-[#1a2a3a] rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Kola ({rounds.length}/8)</h2>
            {rounds.length < 8 && (
              <button
                onClick={addRound}
                className="px-4 py-2 bg-[#f9d74e] text-[#0d1b2a] font-bold rounded-xl text-sm"
              >
                + Přidat kolo
              </button>
            )}
          </div>

          {rounds.length === 0 && (
            <p className="text-[#8899aa] text-center py-4">Zatím žádná kola. Přidej první.</p>
          )}

          <div className="space-y-4">
            {rounds.map((round, i) => (
              <div key={i} className="bg-[#0d1b2a] rounded-xl p-4 relative">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-[#f9d74e] font-bold text-sm">Kolo {i + 1}</span>
                  <button
                    onClick={() => removeRound(i)}
                    className="text-[#8899aa] hover:text-[#ef4444] text-sm ml-2"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Game mode */}
                  <div>
                    <label className="text-[#8899aa] text-xs mb-1 block">Herní mód</label>
                    <select
                      value={round.gameMode}
                      onChange={e => updateRound(i, { gameMode: e.target.value as PubQuizRound['gameMode'] })}
                      className="w-full bg-[#1a2a3a] text-white rounded-lg px-3 py-2 text-sm border border-[#2a3a4a]"
                    >
                      {Object.entries(GAME_MODE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  {/* Deck */}
                  <div>
                    <label className="text-[#8899aa] text-xs mb-1 block">Sada</label>
                    <select
                      value={round.setSlug ?? ''}
                      onChange={e => updateRound(i, { setSlug: e.target.value, customDeckId: undefined })}
                      className="w-full bg-[#1a2a3a] text-white rounded-lg px-3 py-2 text-sm border border-[#2a3a4a]"
                    >
                      {DECKS.map(d => (
                        <option key={d.id} value={d.id}>{d.icon} {d.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Question count */}
                  <div>
                    <label className="text-[#8899aa] text-xs mb-1 block">Počet otázek</label>
                    <select
                      value={round.questionCount}
                      onChange={e => updateRound(i, { questionCount: Number(e.target.value) })}
                      className="w-full bg-[#1a2a3a] text-white rounded-lg px-3 py-2 text-sm border border-[#2a3a4a]"
                    >
                      {[5, 10, 15, 20].map(n => (
                        <option key={n} value={n}>{n} otázek</option>
                      ))}
                    </select>
                  </div>

                  {/* Double points */}
                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id={`double-${i}`}
                      checked={round.doublePoints}
                      onChange={e => updateRound(i, { doublePoints: e.target.checked })}
                      className="w-4 h-4 accent-[#f9d74e]"
                    />
                    <label htmlFor={`double-${i}`} className="text-[#8899aa] text-sm">
                      Dvojité body (finálové kolo)
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-[#3a1a1a] border border-[#ef4444] text-[#ef4444] rounded-xl p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={loading || rounds.length === 0}
          className="w-full py-4 bg-[#f9d74e] text-[#0d1b2a] font-bold rounded-2xl text-lg disabled:opacity-50"
        >
          {loading ? 'Vytváření...' : '🚀 Vytvořit Pub Kvíz'}
        </button>
      </div>
    </div>
  )
}
