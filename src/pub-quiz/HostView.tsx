import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePubQuizStore } from '../store/pubQuizStore'
import { loadSession, loadRounds, loadTeams, joinChannel, broadcast } from '../services/pubQuizService'
import { supabase } from '../services/supabase'
import { DECKS } from '../data/decks'
import { useGameStore } from '../store/gameStore'
import { PQ_TR } from './pubQuizTranslations'
import type { RoundScore } from '../types/pubQuiz'
import { soundFlip, soundOpponentAnswered, soundTick, soundQuizTimeout, soundMatch, soundWin } from '../services/audioService'

const LABEL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

export default function HostView() {
  const { sessionCode } = useParams<{ sessionCode: string }>()
  const navigate = useNavigate()
  const lang = useGameStore(s => s.language)
  const t = PQ_TR[lang] ?? PQ_TR.cs

  const store = usePubQuizStore()
  const {
    status, rounds, teams, currentRound, currentQuestion, quizName,
    currentQuestionData, timerRemaining, answeredTeamIds, roundScores,
    revealedCount,
    initSession, setRounds, applyEvent,
    hostStartSession, hostStartQuestion,
    hostActivateQuestion, hostStartRevealVideo,
    hostPauseQuestion, hostResumeQuestion, hostEndQuestion,
    hostRevealNextTeam, hostNextRound, reset,
  } = store

  const [loading, setLoading] = useState(true)
  const [customDeckNames, setCustomDeckNames] = useState<Record<string, string>>({})

  const prevStatus = useRef(status)
  const prevAnsweredCount = useRef(0)
  const prevTimer = useRef<number | null>(null)
  const prevRevealed = useRef(0)

  useEffect(() => {
    if (status === 'question_active' && prevStatus.current !== 'question_active') soundFlip()
    if (status === 'finished' && prevStatus.current !== 'finished') soundWin()
    prevStatus.current = status
  }, [status])

  useEffect(() => {
    if (answeredTeamIds.size > prevAnsweredCount.current) soundOpponentAnswered()
    prevAnsweredCount.current = answeredTeamIds.size
  }, [answeredTeamIds.size])

  useEffect(() => {
    if (status !== 'question_active' || timerRemaining === null) return
    if (prevTimer.current !== null && timerRemaining < prevTimer.current) {
      if (timerRemaining <= 0) soundQuizTimeout()
      else soundTick(timerRemaining <= 5)
    }
    prevTimer.current = timerRemaining
  }, [timerRemaining, status])

  useEffect(() => {
    if (status === 'round_results' && revealedCount > prevRevealed.current) soundMatch()
    prevRevealed.current = revealedCount
  }, [revealedCount, status])

  useEffect(() => {
    if (!sessionCode) return
    ;(async () => {
      let session = await loadSession(sessionCode)
      if (!session) { navigate('/create'); return }

      if (!store.sessionId) {
        const dbRounds = await loadRounds(session.id)
        const dbTeams = await loadTeams(session.id)
        initSession(session.id, sessionCode, session.host_id, session.name ?? '')
        setRounds(dbRounds)
        usePubQuizStore.setState({ teams: dbTeams })
      }

      joinChannel(sessionCode, applyEvent)

      supabase.from('custom_decks').select('id, title').eq('status', 'approved').then(({ data }) => {
        if (data) setCustomDeckNames(Object.fromEntries(data.map(d => [d.id, d.title])))
      })

      setLoading(false)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCode])

  const playUrl = `${window.location.origin}/pub-quiz/play/${sessionCode}`
  const displayUrl = `${window.location.origin}/pub-quiz/display/${sessionCode}`
  const currentRoundData = rounds[currentRound - 1]
  const totalQuestions = currentRoundData?.questionCount ?? 0
  const isLastRound = currentRound >= rounds.length

  const handleEndQuestion = useCallback(async () => {
    await hostEndQuestion()
    const s = usePubQuizStore.getState()
    const total = s.rounds[s.currentRound - 1]?.questionCount ?? 0
    if (s.currentQuestion >= total) {
      const sorted = [...s.teams]
        .sort((a, b) => b.totalScore - a.totalScore)
        .map((team, i) => ({ teamId: team.id, teamName: team.name, avatar: team.avatar, color: team.color, score: team.totalScore, position: i + 1 }))
      usePubQuizStore.setState({ status: 'round_results', roundScores: sorted, revealedCount: 0 })
      broadcast({ type: 'round_results_reveal', roundNumber: s.currentRound, scores: sorted, revealedCount: 0 })
    }
  }, [hostEndQuestion])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center">
        <div className="text-[#f9d74e] text-xl">{t.loading}</div>
      </div>
    )
  }

  // ── LOBBY ─────────────────────────────────────────────────────────────────

  if (status === 'lobby') {
    return (
      <div className="min-h-screen bg-[#0d1b2a] p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-white">🎯 {quizName || t.pubQuizName} {t.hostSuffix}</h1>
            <div className="flex gap-2">
              <a
                href={displayUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 bg-[#1a2a3a] text-white rounded-xl text-sm"
              >
                {t.projector}
              </a>
            </div>
          </div>

          {/* Session code */}
          <div className="bg-[#1a2a3a] rounded-2xl p-6 mb-6 text-center">
            <p className="text-[#8899aa] text-sm mb-2">{t.sessionCodeDesc}</p>
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
              {t.copyLink}
            </button>
          </div>

          {/* Rounds summary */}
          <div className="bg-[#1a2a3a] rounded-2xl p-5 mb-6">
            <h2 className="text-white font-semibold mb-3">{t.rounds} ({rounds.length})</h2>
            {rounds.map((r, i) => {
              const deck = DECKS.find(d => d.id === r.setSlug)
              return (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-[#2a3a4a] last:border-0">
                  <span className="text-[#f9d74e] font-bold w-8">#{i + 1}</span>
                  <span className="text-white text-sm flex-1">
                    {r.gameMode === 'bleskovy_kviz' ? '⚡' : '🃏'} {deck?.icon} {deck?.label ?? r.customDeckName ?? (r.customDeckId ? customDeckNames[r.customDeckId] : undefined) ?? '?'}
                    {' — '}{t.questions(r.questionCount)}
                    {r.doublePoints && <span className="ml-2 text-[#f9d74e] text-xs">×2</span>}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Teams */}
          <div className="bg-[#1a2a3a] rounded-2xl p-5 mb-6">
            <h2 className="text-white font-semibold mb-3">
              {t.teamsTitle} ({teams.length}/8)
              {teams.length === 0 && <span className="text-[#8899aa] font-normal text-sm ml-2">{t.waitingForTeams}</span>}
            </h2>
            <div className="space-y-2">
              {teams.map(team => (
                <div key={team.id} className="flex items-center gap-3 py-2">
                  <span className="text-2xl">{team.avatar}</span>
                  <span className="text-white font-medium">{team.name}</span>
                  <span className="ml-auto text-[#8899aa] text-sm" style={{ color: team.color }}>●</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={hostStartSession}
            disabled={teams.length === 0 || rounds.length === 0}
            className="w-full py-4 bg-[#f9d74e] text-[#0d1b2a] font-black rounded-2xl text-xl disabled:opacity-40"
          >
            {t.startSession}
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
        <div className="max-lg w-full text-center">
          <p className="text-[#8899aa] mb-2">{t.roundOf(currentRound, rounds.length)}</p>
          <h2 className="text-4xl font-black text-white mb-2">
            {round?.gameMode === 'bleskovy_kviz' ? '⚡' : '🃏'} {deck?.icon ?? ''} {deck?.label ?? ''}
          </h2>
          <p className="text-[#8899aa] mb-8">{t.questions(round?.questionCount ?? 0)}{round?.doublePoints ? t.doublePointsBadge : ''}</p>

          {currentRound > 1 && teams.length > 0 && (
            <div className="bg-[#1a2a3a] rounded-2xl p-4 mb-8">
              <p className="text-[#8899aa] text-sm mb-3">{t.totalScore}</p>
              {[...teams].sort((a, b) => b.totalScore - a.totalScore).map((team, i) => (
                <div key={team.id} className="flex items-center gap-2 py-1">
                  <span className="text-[#8899aa] w-6">{i + 1}.</span>
                  <span className="text-xl">{team.avatar}</span>
                  <span className="text-white flex-1 text-left">{team.name}</span>
                  <span className="text-[#f9d74e] font-bold">{team.totalScore}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => hostStartQuestion(0)}
            className="w-full py-4 bg-[#f9d74e] text-[#0d1b2a] font-black rounded-2xl text-xl"
          >
            {t.startFirstQuestion}
          </button>
        </div>
      </div>
    )
  }

  // ── VIDEO PLAYING ─────────────────────────────────────────────────────────

  if (status === 'video_playing') {
    const q = currentQuestionData
    return (
      <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center">
          <div className="text-6xl mb-4">▶️</div>
          <h2 className="text-2xl font-black text-white mb-2">{t.videoPlayingHost}</h2>
          {q && <p className="text-[#8899aa] mb-2 text-sm">{q.question}</p>}
          <p className="text-[#8899aa] mb-8 text-xs">{t.correctAnswer(q?.correct ?? '')}</p>
          <button
            onClick={hostActivateQuestion}
            className="w-full py-4 bg-[#f9d74e] text-[#0d1b2a] font-black rounded-2xl text-xl"
          >
            {t.startQuestion}
          </button>
        </div>
      </div>
    )
  }

  // ── REVEAL VIDEO PLAYING ──────────────────────────────────────────────────

  if (status === 'video_playing_reveal') {
    const q = currentQuestionData
    return (
      <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center">
          <div className="text-6xl mb-4">🎬</div>
          <h2 className="text-2xl font-black text-white mb-2">{t.revealVideoPlayingHost}</h2>
          {q && <p className="text-[#8899aa] mb-8 text-sm">{t.correctAnswer(q.correct)}</p>}
          <button
            onClick={() => { broadcast({ type: 'reveal_video_ended' }); applyEvent({ type: 'reveal_video_ended' }) }}
            className="text-sm text-[#8899aa] opacity-40 hover:opacity-70 transition-opacity"
          >
            {t.skip}
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
    const questionIdx = currentQuestion - 1

    return (
      <div className="min-h-screen bg-[#0d1b2a] p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[#8899aa] text-sm">{t.roundShort(currentRound, rounds.length)}</p>
              <p className="text-white font-bold">{t.questionShort(currentQuestion, totalQuestions)}</p>
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
              {t.gamePaused}
            </div>
          )}

          {q && (
            <div className="bg-[#1a2a3a] rounded-2xl p-5 mb-4">
              {q.imageUrl && (
                <img src={q.imageUrl} alt={q.label} className="w-16 h-16 object-cover rounded-lg mb-3" />
              )}
              {!q.imageUrl && q.symbol && <div className="text-5xl mb-3">{q.symbol}</div>}
              <p className="text-[#8899aa] text-sm mb-1">{q.question}</p>
              <p className="text-white font-medium mb-4">{t.correctAnswer(q.correct)}</p>

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

          <div className="bg-[#1a2a3a] rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-semibold">{t.teamAnswers}</p>
              <p className="text-[#8899aa] text-sm">{answered}/{teams.length}</p>
            </div>
            <div className="space-y-2">
              {teams.map(team => {
                const hasAnswered = answeredTeamIds.has(team.id)
                return (
                  <div key={team.id} className="flex items-center gap-3">
                    <span className="text-xl">{team.avatar}</span>
                    <span className="text-white flex-1">{team.name}</span>
                    <span>{hasAnswered ? '✅' : '⏳'}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {q?.youtubeUrl2 && (answeredTeamIds.size >= teams.length || timerRemaining === 0) && (
            <button
              onClick={hostStartRevealVideo}
              className="w-full py-3 bg-[#06b6d4] text-white font-black rounded-xl mb-3"
            >
              {t.startRevealVideo}
            </button>
          )}

          <div className="flex gap-3">
            {!isPaused ? (
              <button
                onClick={hostPauseQuestion}
                className="flex-1 py-3 bg-[#2a3a4a] text-white font-bold rounded-xl"
              >
                {t.pause}
              </button>
            ) : (
              <button
                onClick={hostResumeQuestion}
                className="flex-1 py-3 bg-[#2a3a4a] text-white font-bold rounded-xl"
              >
                {t.resume}
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
                {t.nextQuestion}
              </button>
            ) : (
              <button
                onClick={handleEndQuestion}
                className="flex-1 py-3 bg-[#a855f7] text-white font-black rounded-xl"
              >
                {t.roundResultsBtn}
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
    const revealed = sorted.slice(sorted.length - revealedCount).reverse()
    const allRevealed = revealedCount >= sorted.length

    return (
      <div className="min-h-screen bg-[#0d1b2a] p-6">
        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl font-black text-white text-center mb-6">
            {t.roundResultsTitle(currentRound)}
          </h2>

          <div className="bg-[#1a2a3a] rounded-2xl p-5 mb-6 space-y-3">
            {revealed.map((s: RoundScore) => (
              <div key={s.teamId} className="flex items-center gap-3 animate-pulse-once">
                <span className="text-2xl w-8">
                  {s.position === 1 ? '🥇' : s.position === 2 ? '🥈' : s.position === 3 ? '🥉' : `${s.position}.`}
                </span>
                <span className="text-2xl">{s.avatar}</span>
                <span className="text-white font-bold flex-1">{s.teamName}</span>
                <span className="text-[#f9d74e] font-black">{t.points(s.score)}</span>
              </div>
            ))}

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
                {t.revealNext}
              </button>
            )}
            {allRevealed && !isLastRound && (
              <button
                onClick={hostNextRound}
                className="flex-1 py-4 bg-[#f9d74e] text-[#0d1b2a] font-black rounded-xl text-lg"
              >
                {t.continueToRound(currentRound + 1)}
              </button>
            )}
            {allRevealed && isLastRound && (
              <button
                onClick={() => store.hostFinishSession()}
                className="flex-1 py-4 bg-[#f9d74e] text-[#0d1b2a] font-black rounded-xl text-lg"
              >
                {t.showFinalResults}
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
          <h2 className="text-3xl font-black text-white mb-8">{t.finalResults}</h2>

          <div className="bg-[#1a2a3a] rounded-2xl p-6 mb-8 space-y-4">
            {sorted.map((team, i) => (
              <div key={team.id} className="flex items-center gap-3">
                <span className="text-2xl w-8">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                </span>
                <span className="text-2xl">{team.avatar}</span>
                <span className="text-white font-bold flex-1 text-left">{team.name}</span>
                <span className="text-[#f9d74e] font-black text-xl">{team.totalScore}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => { reset(); navigate('/create') }}
            className="px-8 py-4 bg-[#f9d74e] text-[#0d1b2a] font-black rounded-2xl text-lg"
          >
            {t.newPubQuiz}
          </button>
        </div>
      </div>
    )
  }

  return null
}
