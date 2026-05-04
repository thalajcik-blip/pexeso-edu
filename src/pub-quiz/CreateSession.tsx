import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { usePubQuizStore } from '../store/pubQuizStore'
import { createSession, joinChannel } from '../services/pubQuizService'
import { supabase } from '../services/supabase'
import { DECKS } from '../data/decks'
import { useGameStore } from '../store/gameStore'
import { PQ_TR } from './pubQuizTranslations'
import type { PubQuizRound } from '../types/pubQuiz'

type CustomDeckOption = { id: string; title: string }

const DEFAULT_ROUND: Omit<PubQuizRound, 'roundNumber' | 'status'> = {
  gameMode: 'bleskovy_kviz',
  setSlug: 'flags',
  questionCount: 10,
  timerSeconds: 20,
  doublePoints: false,
}

function deckSelectValue(round: Omit<PubQuizRound, 'roundNumber' | 'status'>): string {
  if (round.customDeckId) return `custom:${round.customDeckId}`
  return round.setSlug ?? DECKS[0].id
}

function applyDeckSelection(value: string): Partial<Omit<PubQuizRound, 'roundNumber' | 'status'>> {
  if (value.startsWith('custom:')) return { customDeckId: value.slice(7), setSlug: undefined }
  return { setSlug: value, customDeckId: undefined }
}

interface Props {
  onCreated?: (code: string) => void
  embedded?: boolean
}

export default function CreateSession({ onCreated, embedded = false }: Props) {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const { initSession, setRounds, applyEvent } = usePubQuizStore()
  const lang = useGameStore(s => s.language)
  const t = PQ_TR[lang] ?? PQ_TR.cs

  const [quizName, setQuizName] = useState('')
  const [rounds, setLocalRounds] = useState<Omit<PubQuizRound, 'roundNumber' | 'status'>[]>([
    { ...DEFAULT_ROUND },
  ])
  const [customDecks, setCustomDecks] = useState<CustomDeckOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { isLoading } = useAuthStore()
  const isTeacher = profile?.roles?.includes('teacher') || profile?.roles?.includes('superadmin') || profile?.roles?.includes('admin')

  useEffect(() => {
    supabase
      .from('custom_decks')
      .select('id, title')
      .eq('status', 'approved')
      .order('title')
      .then(({ data }) => {
        if (data) setCustomDecks(data)
      })
  }, [])

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
    if (!user) { setError(t.errorMustBeLoggedIn); return }
    if (!isTeacher) { setError(t.errorTeacherOnly); return }
    if (rounds.length === 0) { setError(t.errorAddRound); return }

    setLoading(true)
    setError('')
    const session = await createSession(user.id, quizName.trim() || undefined)
    if (!session) { setError(t.errorCreateFailed); setLoading(false); return }

    const fullRounds: PubQuizRound[] = rounds.map((r, i) => ({
      ...r,
      roundNumber: i + 1,
      status: 'pending',
      customDeckName: r.customDeckId
        ? customDecks.find(d => d.id === r.customDeckId)?.title
        : undefined,
    }))

    initSession(session.id, session.code, user.id, quizName.trim() || undefined)
    setRounds(fullRounds)
    joinChannel(session.code, applyEvent)
    if (onCreated) {
      onCreated(session.code)
    } else {
      navigate(`/host/${session.code}`)
    }
  }

  if (!embedded && isLoading) return null

  if (!embedded && (!user || !isTeacher)) {
    return (
      <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center p-6">
        <div className="bg-[#1a2a3a] rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h2 className="text-2xl font-bold text-white mb-2">{t.accessDeniedTitle}</h2>
          <p className="text-[#8899aa] mb-6">{t.accessDeniedDesc}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-[#f9d74e] text-[#0d1b2a] font-bold rounded-xl"
          >
            {t.backToPexedu}
          </button>
        </div>
      </div>
    )
  }

  const formBody = (
    <>
      {/* Quiz name */}
      <div className="bg-[#1a2a3a] rounded-2xl p-6 mb-6">
          <label className="text-[#8899aa] text-sm block mb-2">{t.quizNameLabel}</label>
          <input
            value={quizName}
            onChange={e => setQuizName(e.target.value)}
            maxLength={60}
            placeholder={t.quizNamePlaceholder}
            className="w-full bg-[#0d1b2a] text-white rounded-xl px-4 py-3 border border-[#2a3a4a] focus:border-[#f9d74e] outline-none"
          />
        </div>

        {/* Rounds */}
        <div className="bg-[#1a2a3a] rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">{t.rounds} ({rounds.length}/8)</h2>
            {rounds.length < 8 && (
              <button
                onClick={addRound}
                className="px-4 py-2 bg-[#f9d74e] text-[#0d1b2a] font-bold rounded-xl text-sm"
              >
                {t.addRound}
              </button>
            )}
          </div>

          {rounds.length === 0 && (
            <p className="text-[#8899aa] text-center py-4">{t.noRounds}</p>
          )}

          <div className="space-y-4">
            {rounds.map((round, i) => (
              <div key={i} className="bg-[#0d1b2a] rounded-xl p-4 relative">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-[#f9d74e] font-bold text-sm">{t.round} {i + 1}</span>
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
                    <label className="text-[#8899aa] text-xs mb-1 block">{t.gameModeLabel}</label>
                    <select
                      value={round.gameMode}
                      onChange={e => updateRound(i, { gameMode: e.target.value as PubQuizRound['gameMode'] })}
                      className="w-full bg-[#1a2a3a] text-white rounded-lg px-3 py-2 text-sm border border-[#2a3a4a]"
                    >
                      {(Object.entries(t.gameModeLabels) as [string, string][]).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  {/* Deck */}
                  <div>
                    <label className="text-[#8899aa] text-xs mb-1 block">{t.deckLabel}</label>
                    <select
                      value={deckSelectValue(round)}
                      onChange={e => updateRound(i, applyDeckSelection(e.target.value))}
                      className="w-full bg-[#1a2a3a] text-white rounded-lg px-3 py-2 text-sm border border-[#2a3a4a]"
                    >
                      <optgroup label={t.builtInDecks}>
                        {DECKS.map(d => (
                          <option key={d.id} value={d.id}>{d.icon} {d.label}</option>
                        ))}
                      </optgroup>
                      {customDecks.length > 0 && (
                        <optgroup label={t.customDecks}>
                          {customDecks.map(d => (
                            <option key={d.id} value={`custom:${d.id}`}>📚 {d.title}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>

                  {/* Question count */}
                  <div>
                    <label className="text-[#8899aa] text-xs mb-1 block">{t.questionCountLabel}</label>
                    <select
                      value={round.questionCount}
                      onChange={e => updateRound(i, { questionCount: Number(e.target.value) })}
                      className="w-full bg-[#1a2a3a] text-white rounded-lg px-3 py-2 text-sm border border-[#2a3a4a]"
                    >
                      {[5, 10, 15, 20].map(n => (
                        <option key={n} value={n}>{t.questions(n)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Timer */}
                  <div>
                    <label className="text-[#8899aa] text-xs mb-1 block">{t.timerLabel}</label>
                    <select
                      value={round.timerSeconds ?? 20}
                      onChange={e => updateRound(i, { timerSeconds: Number(e.target.value) })}
                      className="w-full bg-[#1a2a3a] text-white rounded-lg px-3 py-2 text-sm border border-[#2a3a4a]"
                    >
                      {[10, 15, 20, 30, 45, 60].map(n => (
                        <option key={n} value={n}>{t.seconds(n)}</option>
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
                      {t.doublePoints}
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
          {loading ? t.creating : t.createButton}
        </button>
    </>
  )

  if (embedded) {
    return <div className="max-w-2xl">{formBody}</div>
  }

  return (
    <div className="min-h-screen bg-[#0d1b2a] p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => window.location.href = '/'} className="text-[#8899aa] hover:text-white text-sm">
            {t.back}
          </button>
          <h1 className="text-2xl font-bold text-white">{t.newPubQuizTitle}</h1>
        </div>
        {formBody}
      </div>
    </div>
  )
}
