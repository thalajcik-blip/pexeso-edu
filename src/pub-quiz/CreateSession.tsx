import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { usePubQuizStore } from '../store/pubQuizStore'
import { createSession, joinChannel } from '../services/pubQuizService'
import { supabase } from '../services/supabase'
import { DECKS } from '../data/decks'
import { useGameStore } from '../store/gameStore'
import { PQ_TR } from './pubQuizTranslations'
import type { PubQuizRound } from '../types/pubQuiz'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const LANG_FLAG: Record<string, string> = { cs: '🇨🇿', sk: '🇸🇰', en: '🇬🇧' }

type CustomDeckOption = { id: string; title: string; language: string }

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

function DeckCombobox({ value, onValueChange, builtInLabel, customLabel, customDecks }: {
  value: string
  onValueChange: (val: string) => void
  builtInLabel: string
  customLabel: string
  customDecks: CustomDeckOption[]
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  const selectedIcon = value.startsWith('custom:')
    ? (LANG_FLAG[customDecks.find(d => d.id === value.slice(7))?.language ?? ''] ?? '📖')
    : (DECKS.find(d => d.id === value)?.icon ?? '📖')
  const selectedLabel = value.startsWith('custom:')
    ? (customDecks.find(d => d.id === value.slice(7))?.title ?? '')
    : (DECKS.find(d => d.id === value)?.label ?? '')

  const q = search.toLowerCase()
  const filteredBuiltIn = DECKS.filter(d => !q || d.label.toLowerCase().includes(q))
  const filteredCustom = customDecks.filter(d => !q || d.title.toLowerCase().includes(q))

  function pick(val: string) {
    onValueChange(val)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={open ? search : `${selectedIcon} ${selectedLabel}`}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => { setSearch(''); setOpen(true) }}
          placeholder="Vyhledat sadu…"
          className="pr-7"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[10px]">▾</span>
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {filteredBuiltIn.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{builtInLabel}</div>
              {filteredBuiltIn.map(d => (
                <button
                  key={d.id}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); pick(d.id) }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 ${value === d.id ? 'text-indigo-600 font-medium bg-indigo-50' : 'text-gray-900'}`}
                >
                  <span>{d.icon}</span><span>{d.label}</span>
                </button>
              ))}
            </>
          )}
          {filteredCustom.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{customLabel}</div>
              {filteredCustom.map(d => (
                <button
                  key={d.id}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); pick(`custom:${d.id}`) }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 ${value === `custom:${d.id}` ? 'text-indigo-600 font-medium bg-indigo-50' : 'text-gray-900'}`}
                >
                  <span>{LANG_FLAG[d.language] ?? '📖'}</span><span>{d.title}</span>
                </button>
              ))}
            </>
          )}
          {filteredBuiltIn.length === 0 && filteredCustom.length === 0 && (
            <div className="px-3 py-4 text-sm text-gray-400 text-center">Žádné výsledky</div>
          )}
        </div>
      )}
    </div>
  )
}

interface Props {
  onCreated?: (code: string) => void
  embedded?: boolean
}

export default function CreateSession({ onCreated, embedded = false }: Props) {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const { initSession, setRounds, applyEvent } = usePubQuizStore()
  const lang = useGameStore(st => st.language)
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
      .select('id, title, language')
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

  // Style tokens: light admin (embedded) vs dark standalone
  const cls = embedded ? {
    section:     'border border-gray-200 rounded-xl p-6 mb-4 bg-white',
    sectionTitle:'text-base font-semibold text-gray-900',
    label:       'text-sm font-medium text-gray-700 block mb-1.5',
    roundCard:   'border border-gray-100 rounded-lg p-4 bg-gray-50',
    roundLabel:  'text-sm font-semibold text-indigo-600',
    fieldLabel:  'text-xs font-medium text-gray-500 mb-1 block',
    checkLabel:  'text-gray-600 text-sm',
    removeBtn:   'text-gray-400 hover:text-red-500 text-sm',
    noRounds:    'text-gray-400 text-center py-4 text-sm',
    error:       'bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4 text-sm',
  } : {
    section:     'bg-[#1a2a3a] rounded-2xl p-6 mb-6',
    sectionTitle:'text-lg font-semibold text-white',
    label:       'text-[#8899aa] text-sm block mb-2',
    roundCard:   'bg-[#0d1b2a] rounded-xl p-4 relative',
    roundLabel:  'text-[#f9d74e] font-bold text-sm',
    fieldLabel:  'text-[#8899aa] text-xs mb-1 block',
    checkLabel:  'text-[#8899aa] text-sm',
    removeBtn:   'text-[#8899aa] hover:text-[#ef4444] text-sm ml-2',
    noRounds:    'text-[#8899aa] text-center py-4',
    error:       'bg-[#3a1a1a] border border-[#ef4444] text-[#ef4444] rounded-xl p-3 mb-4 text-sm',
  }

  const formBody = (
    <>
      {/* Quiz name */}
      <div className={cls.section}>
        <label className={cls.label}>{t.quizNameLabel}</label>
        {embedded ? (
          <Input
            value={quizName}
            onChange={e => setQuizName(e.target.value)}
            maxLength={60}
            placeholder={t.quizNamePlaceholder}
          />
        ) : (
          <input
            value={quizName}
            onChange={e => setQuizName(e.target.value)}
            maxLength={60}
            placeholder={t.quizNamePlaceholder}
            className="w-full bg-[#0d1b2a] text-white rounded-xl px-4 py-3 border border-[#2a3a4a] focus:border-[#f9d74e] outline-none"
          />
        )}
      </div>

      {/* Rounds */}
      <div className={cls.section}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={cls.sectionTitle}>{t.rounds} ({rounds.length}/8)</h2>
          {rounds.length < 8 && (
            embedded ? (
              <Button size="sm" variant="outline" onClick={addRound}>
                {t.addRound}
              </Button>
            ) : (
              <button
                onClick={addRound}
                className="px-4 py-2 bg-[#f9d74e] text-[#0d1b2a] font-bold rounded-xl text-sm"
              >
                {t.addRound}
              </button>
            )
          )}
        </div>

        {rounds.length === 0 && (
          <p className={cls.noRounds}>{t.noRounds}</p>
        )}

        <div className="space-y-3">
          {rounds.map((round, i) => (
            <div key={i} className={cls.roundCard}>
              <div className="flex items-start justify-between mb-3">
                <span className={cls.roundLabel}>{t.round} {i + 1}</span>
                <button onClick={() => removeRound(i)} className={cls.removeBtn}>✕</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Game mode */}
                <div>
                  <label className={cls.fieldLabel}>{t.gameModeLabel}</label>
                  {embedded ? (
                    <Select
                      value={round.gameMode}
                      onValueChange={val => updateRound(i, { gameMode: val as PubQuizRound['gameMode'] })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.entries(t.gameModeLabels) as [string, string][]).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <select
                      value={round.gameMode}
                      onChange={e => updateRound(i, { gameMode: e.target.value as PubQuizRound['gameMode'] })}
                      className="w-full bg-[#1a2a3a] text-white rounded-lg px-3 py-2 text-sm border border-[#2a3a4a]"
                    >
                      {(Object.entries(t.gameModeLabels) as [string, string][]).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Deck */}
                <div>
                  <label className={cls.fieldLabel}>{t.deckLabel}</label>
                  {embedded ? (
                    <DeckCombobox
                      value={deckSelectValue(round)}
                      onValueChange={val => updateRound(i, applyDeckSelection(val))}
                      builtInLabel={t.builtInDecks}
                      customLabel={t.customDecks}
                      customDecks={customDecks}
                    />
                  ) : (
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
                            <option key={d.id} value={`custom:${d.id}`}>{LANG_FLAG[d.language] ?? '📖'} {d.title}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  )}
                </div>

                {/* Question count */}
                <div>
                  <label className={cls.fieldLabel}>{t.questionCountLabel}</label>
                  {embedded ? (
                    <Select
                      value={String(round.questionCount)}
                      onValueChange={val => updateRound(i, { questionCount: Number(val) })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[5, 10, 15, 20].map(n => (
                          <SelectItem key={n} value={String(n)}>{t.questions(n)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <select
                      value={round.questionCount}
                      onChange={e => updateRound(i, { questionCount: Number(e.target.value) })}
                      className="w-full bg-[#1a2a3a] text-white rounded-lg px-3 py-2 text-sm border border-[#2a3a4a]"
                    >
                      {[5, 10, 15, 20].map(n => (
                        <option key={n} value={n}>{t.questions(n)}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Timer */}
                <div>
                  <label className={cls.fieldLabel}>{t.timerLabel}</label>
                  {embedded ? (
                    <Select
                      value={String(round.timerSeconds ?? 20)}
                      onValueChange={val => updateRound(i, { timerSeconds: Number(val) })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[10, 15, 20, 30, 45, 60].map(n => (
                          <SelectItem key={n} value={String(n)}>{t.seconds(n)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <select
                      value={round.timerSeconds ?? 20}
                      onChange={e => updateRound(i, { timerSeconds: Number(e.target.value) })}
                      className="w-full bg-[#1a2a3a] text-white rounded-lg px-3 py-2 text-sm border border-[#2a3a4a]"
                    >
                      {[10, 15, 20, 30, 45, 60].map(n => (
                        <option key={n} value={n}>{t.seconds(n)}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Double points */}
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id={`double-${i}`}
                    checked={round.doublePoints}
                    onChange={e => updateRound(i, { doublePoints: e.target.checked })}
                    className={embedded ? 'w-4 h-4 accent-indigo-600' : 'w-4 h-4 accent-[#f9d74e]'}
                  />
                  <label htmlFor={`double-${i}`} className={cls.checkLabel}>
                    {t.doublePoints}
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <div className={cls.error}>{error}</div>}

      {embedded ? (
        <Button
          onClick={handleCreate}
          disabled={loading || rounds.length === 0}
          className="w-full"
        >
          {loading ? t.creating : t.createButton}
        </Button>
      ) : (
        <button
          onClick={handleCreate}
          disabled={loading || rounds.length === 0}
          className="w-full py-4 bg-[#f9d74e] text-[#0d1b2a] font-bold rounded-2xl text-lg disabled:opacity-50"
        >
          {loading ? t.creating : t.createButton}
        </button>
      )}
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
