import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePubQuizStore } from '../store/pubQuizStore'
import { loadSession, loadRounds, loadTeams, joinChannel, broadcast } from '../services/pubQuizService'
import { DECKS } from '../data/decks'
import type { RoundScore } from '../types/pubQuiz'

const LABEL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

export default function HostView() {
  const { sessionCode } = useParams<{ sessionCode: string }>()
  const navigate = useNavigate()

  const store = usePubQuizStore()
  const {
    status, rounds, teams, currentRound, currentQuestion,
    currentQuestionData, timerRemaining, answeredTeamIds, roundScores,
    revealedCount,
    initSession, setRounds, applyEvent,
    hostStartSession, hostStartQuestion,
    hostPauseQuestion, hostResumeQuestion, hostEndQuestion,
    hostRevealNextTeam, hostNextRound, reset,
  } = store

  const [loading, setLoading] = useState(true)
  const [qrOpen, setQrOpen] = useState(false)

  // Load session on mount
  useEffect(() => {
    if (!sessionCode) return
    ;(async () => {
      let session = await loadSession(sessionCode)
      if (!session) { navigate('/create'); return }

      // Try to restore from DB if store is empty
      if (!store.sessionId) {
        const dbRounds = await loadRounds(session.id)
        const dbTeams = await loadTeams(session.id)
        initSession(session.id, sessionCode, null)
        setRounds(dbRounds)
        usePubQuizStore.setState({ teams: dbTeams })
      }

      joinChannel(sessionCode, applyEvent)
      setLoading(false)
    })()

    return () => { /* channel cleanup handled on navigate away */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCode])

  const playUrl = `${window.location.origin}/pub-quiz/play/${sessionCode}`
  const displayUrl = `${window.location.origin}/pub-quiz/display/${sessionCode}`
  const currentRoundData = rounds[currentRound - 1]
  const totalQuestions = currentRoundData?.questionCount ?? 0
  const isLastRound = currentRound >= rounds.length

  // ── Round results scoring ─────────────────────────────────────────────────

  const handleEndQuestion = useCallback(async () => {
    await hostEndQuestion()
    // After scoring, show round results if this was the last question
    const q = store.currentQuestion
    const total = store.rounds[store.currentRound - 1]?.questionCount ?? 0
    if (q >= total) {
      // Build round scores for reveal
      const sorted = [...store.teams]
        .sort((a, b) => b.totalScore - a.totalScore)
        .map((t, i) => ({ teamId: t.id, teamName: t.name, avatar: t.avatar, color: t.color, score: t.totalScore, position: i + 1 }))
      usePubQuizStore.setState({ status: 'round_results', roundScores: sorted, revealedCount: 0 })
      broadcast({ type: 'round_results_reveal', roundNumber: store.currentRound, scores: sorted, revealedCount: 0 })
    }
  }, [hostEndQuestion, store])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center">
        <div className="text-[#f9d74e] text-xl">Načítání...</div>
      </div>
    )
  }

  // ── LOBBY ─────────────────────────────────────────────────────────────────

  if (status === 'lobby') {
    return (
      <div className="min-h-screen bg-[#0d1b2a] p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-white">🎯 Pub Kvíz — Host</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setQrOpen(!qrOpen)}
                className="px-3 py-2 bg-[#1a2a3a] text-white rounded-xl text-sm"
              >
                QR kód
              </button>
              <a
                href={displayUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 bg-[#1a2a3a] text-white rounded-xl text-sm"
              >
                📺 Projektor
              </a>
            </div>
          </div>

          {/* Session code */}
          <div className="bg-[#1a2a3a] rounded-2xl p-6 mb-6 text-center">
            <p className="text-[#8899aa] text-sm mb-2">Kód session — týmy zadají na telefonu</p>
            <div className="text-4xl font-mono font-black text-[#f9d74e] tracking-widest mb-3">
              {sessionCode}
            </div>
            <p className="text-[#8899aa] text-xs">
              {window.location.origin}/pub-quiz/play/
              <span className="text-white">{sessionCode}</span>
            </p>
            <button
              onClick={() => navigator.clipboard.writeText(playUrl)}
              className="mt-3 px-4 py-2 bg-[#0d1b2a] text-[#8899aa] rounded-xl text-sm hover:text-white"
            >
              📋 Kopírovat odkaz
            </button>
          </div>

          {/* Rounds summary */}
          <div className="bg-[#1a2a3a] rounded-2xl p-5 mb-6">
            <h2 className="text-white font-semibold mb-3">Kola ({rounds.length})</h2>
            {rounds.map((r, i) => {
              const deck = DECKS.find(d => d.id === r.setSlug)
              return (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-[#2a3a4a] last:border-0">
                  <span className="text-[#f9d74e] font-bold w-8">#{i + 1}</span>
                  <span className="text-white text-sm flex-1">
                    {r.gameMode === 'bleskovy_kviz' ? '⚡' : '🃏'} {deck?.icon} {deck?.label ?? r.customDeckId ?? '?'}
                    {' — '}{r.questionCount} otázek
                    {r.doublePoints && <span className="ml-2 text-[#f9d74e] text-xs">×2</span>}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Teams */}
          <div className="bg-[#1a2a3a] rounded-2xl p-5 mb-6">
            <h2 className="text-white font-semibold mb-3">
              Týmy ({teams.length}/8)
              {teams.length === 0 && <span className="text-[#8899aa] font-normal text-sm ml-2">— čekáme na přihlášení</span>}
            </h2>
            <div className="space-y-2">
              {teams.map(t => (
                <div key={t.id} className="flex items-center gap-3 py-2">
                  <span className="text-2xl">{t.avatar}</span>
                  <span className="text-white font-medium">{t.name}</span>
                  <span className="ml-auto text-[#8899aa] text-sm" style={{ color: t.color }}>●</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={hostStartSession}
            disabled={teams.length === 0 || rounds.length === 0}
            className="w-full py-4 bg-[#f9d74e] text-[#0d1b2a] font-black rounded-2xl text-xl disabled:opacity-40"
          >
            🚀 Spustit Pub Kvíz
          </button>
        </div>
      </div>
    )
  }

  // ── ROUND INTRO ───────────────────────────────────────────────────────────

  if (status === 'round_intro') {
    const round = rounds[currentRound - 1]
    const deck = DECKS.find(d => d.id === round?.setSlug)
    return (
      <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center">
          <p className="text-[#8899aa] mb-2">Kolo {currentRound} z {rounds.length}</p>
          <h2 className="text-4xl font-black text-white mb-2">
            {round?.gameMode === 'bleskovy_kviz' ? '⚡' : '🃏'} {deck?.icon ?? ''} {deck?.label ?? ''}
          </h2>
          <p className="text-[#8899aa] mb-8">{round?.questionCount} otázek{round?.doublePoints ? ' · dvojité body 🔥' : ''}</p>

          {/* Scores so far */}
          {currentRound > 1 && teams.length > 0 && (
            <div className="bg-[#1a2a3a] rounded-2xl p-4 mb-8">
              <p className="text-[#8899aa] text-sm mb-3">Celkové skóre</p>
              {[...teams].sort((a, b) => b.totalScore - a.totalScore).map((t, i) => (
                <div key={t.id} className="flex items-center gap-2 py-1">
                  <span className="text-[#8899aa] w-6">{i + 1}.</span>
                  <span className="text-xl">{t.avatar}</span>
                  <span className="text-white flex-1 text-left">{t.name}</span>
                  <span className="text-[#f9d74e] font-bold">{t.totalScore}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => hostStartQuestion(0)}
            className="w-full py-4 bg-[#f9d74e] text-[#0d1b2a] font-black rounded-2xl text-xl"
          >
            ▶ Spustit 1. otázku
          </button>
        </div>
      </div>
    )
  }

  // ── QUESTION ACTIVE / PAUSED ──────────────────────────────────────────────

  if (status === 'question_active' || status === 'question_paused') {
    const q = currentQuestionData
    const answered = answeredTeamIds.size
    const isPaused = status === 'question_paused'
    const questionIdx = currentQuestion - 1  // 0-indexed for next

    return (
      <div className="min-h-screen bg-[#0d1b2a] p-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[#8899aa] text-sm">Kolo {currentRound}/{rounds.length}</p>
              <p className="text-white font-bold">Otázka {currentQuestion}/{totalQuestions}</p>
            </div>
            <div className="text-right">
              {timerRemaining !== null && timerRemaining > 0 && (
                <div className={`text-3xl font-mono font-black ${timerRemaining <= 5 ? 'text-[#ef4444]' : 'text-[#f9d74e]'}`}>
                  {timerRemaining}s
                </div>
              )}
            </div>
          </div>

          {isPaused && (
            <div className="bg-[#2a1a0a] border border-[#f97316] rounded-xl p-3 mb-4 text-center text-[#f97316] font-bold">
              ⏸ Hra pozastavena
            </div>
          )}

          {/* Question for host (shows correct answer) */}
          {q && (
            <div className="bg-[#1a2a3a] rounded-2xl p-5 mb-4">
              {q.imageUrl && (
                <img src={q.imageUrl} alt={q.label} className="w-16 h-16 object-cover rounded-lg mb-3" />
              )}
              {!q.imageUrl && q.symbol && <div className="text-5xl mb-3">{q.symbol}</div>}
              <p className="text-[#8899aa] text-sm mb-1">{q.question}</p>
              <p className="text-white font-medium mb-4">Správná odpověď: <span className="text-[#22c55e] font-bold">{q.correct}</span></p>

              <div className="grid grid-cols-2 gap-2">
                {q.options.map((opt, i) => (
                  <div
                    key={i}
                    className={`rounded-xl p-3 text-sm ${opt === q.correct ? 'bg-[#22c55e]/20 border border-[#22c55e] text-[#22c55e]' : 'bg-[#0d1b2a] text-[#8899aa]'}`}
                  >
                    <span className="font-bold mr-2">{LABEL_LETTERS[i]})</span>{opt}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Answer status */}
          <div className="bg-[#1a2a3a] rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-semibold">Odpovědi týmů</p>
              <p className="text-[#8899aa] text-sm">{answered}/{teams.length}</p>
            </div>
            <div className="space-y-2">
              {teams.map(t => {
                const hasAnswered = answeredTeamIds.has(t.id)
                return (
                  <div key={t.id} className="flex items-center gap-3">
                    <span className="text-xl">{t.avatar}</span>
                    <span className="text-white flex-1">{t.name}</span>
                    <span>{hasAnswered ? '✅' : '⏳'}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            {!isPaused ? (
              <button
                onClick={hostPauseQuestion}
                className="flex-1 py-3 bg-[#2a3a4a] text-white font-bold rounded-xl"
              >
                ⏸ Pauza
              </button>
            ) : (
              <button
                onClick={hostResumeQuestion}
                className="flex-1 py-3 bg-[#2a3a4a] text-white font-bold rounded-xl"
              >
                ▶ Pokračovat
              </button>
            )}

            {currentQuestion < totalQuestions ? (
              <button
                onClick={async () => {
                  await hostEndQuestion()
                  hostStartQuestion(questionIdx + 1)
                }}
                className="flex-2 flex-1 py-3 bg-[#f9d74e] text-[#0d1b2a] font-black rounded-xl"
              >
                ▶ Další otázka
              </button>
            ) : (
              <button
                onClick={handleEndQuestion}
                className="flex-1 py-3 bg-[#a855f7] text-white font-black rounded-xl"
              >
                📊 Výsledky kola
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── ROUND RESULTS ─────────────────────────────────────────────────────────

  if (status === 'round_results') {
    const sorted = [...roundScores].sort((a, b) => a.position - b.position)
    const revealed = sorted.slice(sorted.length - revealedCount).reverse() // reveal from last place
    const allRevealed = revealedCount >= sorted.length

    return (
      <div className="min-h-screen bg-[#0d1b2a] p-6">
        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl font-black text-white text-center mb-6">
            🏆 Výsledky — Kolo {currentRound}
          </h2>

          <div className="bg-[#1a2a3a] rounded-2xl p-5 mb-6 space-y-3">
            {revealed.map((s: RoundScore) => (
              <div key={s.teamId} className="flex items-center gap-3 animate-pulse-once">
                <span className="text-2xl w-8">
                  {s.position === 1 ? '🥇' : s.position === 2 ? '🥈' : s.position === 3 ? '🥉' : `${s.position}.`}
                </span>
                <span className="text-2xl">{s.avatar}</span>
                <span className="text-white font-bold flex-1">{s.teamName}</span>
                <span className="text-[#f9d74e] font-black">{s.score} bodů</span>
              </div>
            ))}

            {/* Unrevealed slots */}
            {sorted.slice(0, sorted.length - revealedCount).reverse().map((_, i) => (
              <div key={`hidden-${i}`} className="flex items-center gap-3 opacity-40">
                <span className="text-2xl w-8">???</span>
                <span className="text-2xl">🎭</span>
                <span className="text-[#8899aa] flex-1">???</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            {!allRevealed && (
              <button
                onClick={hostRevealNextTeam}
                className="flex-1 py-3 bg-[#a855f7] text-white font-bold rounded-xl"
              >
                Odhalit další tým ▼
              </button>
            )}
            {allRevealed && !isLastRound && (
              <button
                onClick={hostNextRound}
                className="flex-1 py-4 bg-[#f9d74e] text-[#0d1b2a] font-black rounded-xl text-lg"
              >
                Pokračovat na Kolo {currentRound + 1} →
              </button>
            )}
            {allRevealed && isLastRound && (
              <button
                onClick={() => store.hostFinishSession()}
                className="flex-1 py-4 bg-[#f9d74e] text-[#0d1b2a] font-black rounded-xl text-lg"
              >
                🏁 Zobrazit finální výsledky
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── FINISHED ──────────────────────────────────────────────────────────────

  if (status === 'finished') {
    const sorted = [...teams].sort((a, b) => b.totalScore - a.totalScore)
    return (
      <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-3xl font-black text-white mb-8">Finální výsledky</h2>

          <div className="bg-[#1a2a3a] rounded-2xl p-6 mb-8 space-y-4">
            {sorted.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3">
                <span className="text-2xl w-8">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                </span>
                <span className="text-2xl">{t.avatar}</span>
                <span className="text-white font-bold flex-1 text-left">{t.name}</span>
                <span className="text-[#f9d74e] font-black text-xl">{t.totalScore}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => { reset(); navigate('/create') }}
            className="px-8 py-4 bg-[#f9d74e] text-[#0d1b2a] font-black rounded-2xl text-lg"
          >
            🔄 Nový Pub Kvíz
          </button>
        </div>
      </div>
    )
  }

  return null
}
