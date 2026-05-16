import { useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import QRCode from 'react-qr-code'
import confetti from 'canvas-confetti'
import { usePubQuizStore } from '../store/pubQuizStore'
import { loadSession, loadRounds, loadTeams, joinChannel, broadcast } from '../services/pubQuizService'
import { DECKS } from '../data/decks'
import { useGameStore } from '../store/gameStore'
import { PQ_TR } from './pubQuizTranslations'
import { YouTubePlayer } from '../components/quiz/YouTubePlayer'
import { extractYouTubeId } from '../utils/youtube'

const LABEL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

export default function DisplayView() {
  const { sessionCode } = useParams<{ sessionCode: string }>()
  const containerRef = useRef<HTMLDivElement>(null)
  const lang = useGameStore(s => s.language)
  const t = PQ_TR[lang] ?? PQ_TR.cs

  const {
    sessionId, status, teams, currentRound, currentQuestion, quizName,
    currentQuestionData, timerRemaining, timerSeconds, answeredTeamIds,
    roundScores, revealedCount, rounds,
    initSession, setRounds, applyEvent,
  } = usePubQuizStore()

  useEffect(() => {
    if (!sessionCode) return
    ;(async () => {
      const session = await loadSession(sessionCode)
      if (!session) return
      if (!sessionId) {
        const [dbTeams, dbRounds] = await Promise.all([loadTeams(session.id), loadRounds(session.id)])
        initSession(session.id, sessionCode, null, session.name ?? '')
        setRounds(dbRounds)
        usePubQuizStore.setState({ teams: dbTeams, status: session.status as any })
      }
      joinChannel(sessionCode, applyEvent)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCode])

  useEffect(() => {
    if (status !== 'finished') return
    const sorted = [...teams].sort((a, b) => b.totalScore - a.totalScore)
    const total = sorted.length
    sorted.slice().reverse().forEach((_, idx) => {
      const place = total - idx
      const delay = idx * 1200
      const intensity = place / total
      setTimeout(() => {
        confetti({
          particleCount: Math.round(40 + intensity * 160),
          spread: 50 + intensity * 80,
          startVelocity: 25 + intensity * 25,
          origin: { x: 0.5, y: 0.6 },
          gravity: 0.9,
        })
      }, delay)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  function requestFullscreen() {
    document.documentElement.requestFullscreen?.()
  }

  const timerPercent = timerSeconds > 0 && timerRemaining !== null
    ? 100 - (timerRemaining / timerSeconds) * 100
    : 0

  const timerColor = timerRemaining !== null && timerRemaining <= 5
    ? '#ef4444'
    : timerRemaining !== null && timerRemaining <= 10
      ? '#f97316'
      : '#f9d74e'

  const currentRoundData = rounds[currentRound - 1]

  // ── LOBBY ─────────────────────────────────────────────────────────────────

  if (status === 'lobby') {
    return (
      <div
        ref={containerRef}
        className="min-h-screen bg-[#0d1b2a] flex flex-col items-center justify-center cursor-pointer select-none"
        onClick={requestFullscreen}
      >
        <div className="text-center px-8">
          <div className="text-8xl mb-6">🎯</div>
          <h1 className="text-6xl font-black text-white mb-4">{quizName || t.pubQuizName}</h1>
          <p className="text-[#8899aa] text-xl mb-8">{t.joinOnPhone}</p>
          <div className="flex items-center justify-center gap-10 mb-8">
            <div className="bg-[#1a2a3a] rounded-3xl px-12 py-6 inline-block">
              <p className="text-[#8899aa] text-sm mb-2">{t.code}</p>
              <div className="text-6xl font-mono font-black text-[#f9d74e] tracking-widest">{sessionCode}</div>
            </div>
            <div className="bg-white rounded-2xl p-3">
              <QRCode value={`${window.location.origin}/pub-quiz/play/${sessionCode}`} size={150} />
            </div>
          </div>
          <p className="text-[#8899aa]">{t.teamsCount(teams.length)}</p>
          <div className="flex flex-wrap gap-4 justify-center mt-4">
            {teams.map(team => (
              <div key={team.id} className="flex items-center gap-2 bg-[#1a2a3a] rounded-xl px-4 py-2">
                <span className="text-2xl">{team.avatar}</span>
                <span className="text-white font-bold">{team.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── ROUND INTRO ───────────────────────────────────────────────────────────

  if (status === 'round_intro') {
    const deck = DECKS.find(d => d.id === currentRoundData?.setSlug)
    return (
      <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#8899aa] text-2xl mb-4">{t.roundOf(currentRound, rounds.length)}</p>
          <div className="text-9xl mb-6">{deck?.icon ?? '❓'}</div>
          <h2 className="text-6xl font-black text-white mb-4">
            {currentRoundData?.gameMode === 'bleskovy_kviz' ? t.lightningQuiz : t.pexeQuiz}
          </h2>
          <p className="text-[#8899aa] text-2xl">{deck?.label}</p>
          {currentRoundData?.doublePoints && (
            <p className="text-[#f9d74e] text-xl font-bold mt-2">{t.doublePointsDisplay}</p>
          )}
        </div>
      </div>
    )
  }

  // ── PAUSED ────────────────────────────────────────────────────────────────

  if (status === 'question_paused') {
    return (
      <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center">
        <div className="text-center">
          <div className="text-9xl mb-6">⏸</div>
          <h2 className="text-5xl font-black text-white mb-4">{t.shortPause}</h2>
          <div className="text-4xl text-[#8899aa]">🎯 {quizName || t.pubQuizName}</div>
        </div>
      </div>
    )
  }

  // ── VIDEO PLAYING ─────────────────────────────────────────────────────────

  if (status === 'video_playing') {
    const q = currentQuestionData
    const vid = q?.youtubeUrl ? extractYouTubeId(q.youtubeUrl) : null
    return (
      <div className="min-h-screen bg-[#0d1b2a] flex flex-col items-center justify-center gap-4 px-4">
        {vid ? (
          <div style={{ width: 'min(92vw, calc(82vh * (16/9)))', maxWidth: '92vw' }}>
            <YouTubePlayer
              videoId={vid}
              startSec={q?.youtubeStartSec ?? 0}
              endSec={q?.youtubeEndSec ?? 30}
              onEnded={() => { broadcast({ type: 'video_ended' }); applyEvent({ type: 'video_ended' }) }}
            />
          </div>
        ) : (
          <div className="text-[#f9d74e] text-4xl">{t.loadingVideo}</div>
        )}
        <button
          onClick={() => { broadcast({ type: 'video_ended' }); applyEvent({ type: 'video_ended' }) }}
          className="text-sm text-[#8899aa] opacity-40 hover:opacity-70 transition-opacity"
        >
          {t.skip}
        </button>
      </div>
    )
  }

  // ── REVEAL VIDEO PLAYING ──────────────────────────────────────────────────

  if (status === 'video_playing_reveal') {
    const q = currentQuestionData
    const vid = q?.youtubeUrl2 ? extractYouTubeId(q.youtubeUrl2) : null
    return (
      <div className="min-h-screen bg-[#0d1b2a] flex flex-col items-center justify-center gap-4 px-4">
        {vid ? (
          <div style={{ width: 'min(92vw, calc(82vh * (16/9)))', maxWidth: '92vw' }}>
            <YouTubePlayer
              videoId={vid}
              startSec={q?.youtubeStartSec2 ?? 0}
              endSec={q?.youtubeEndSec2 ?? 30}
              onEnded={() => { broadcast({ type: 'reveal_video_ended' }); applyEvent({ type: 'reveal_video_ended' }) }}
            />
          </div>
        ) : (
          <div className="text-[#f9d74e] text-4xl">{t.loadingVideo}</div>
        )}
        <button
          onClick={() => { broadcast({ type: 'reveal_video_ended' }); applyEvent({ type: 'reveal_video_ended' }) }}
          className="text-sm text-[#8899aa] opacity-40 hover:opacity-70 transition-opacity"
        >
          {t.skip}
        </button>
      </div>
    )
  }

  // ── QUESTION ACTIVE ───────────────────────────────────────────────────────

  if (status === 'question_active') {
    const q = currentQuestionData
    if (!q) {
      return (
        <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center">
          <div className="text-[#f9d74e] text-4xl">{t.preparingQuestion}</div>
        </div>
      )
    }

    const answered = answeredTeamIds.size
    const total = teams.length

    return (
      <div className="min-h-screen bg-[#0d1b2a] flex flex-col p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-[#8899aa] text-xl">
              {t.roundShort(currentRound, rounds.length)} · {t.questionShort(currentQuestion, currentRoundData?.questionCount ?? 0)}
            </span>
          </div>
          {timerRemaining !== null && (
            <div className="flex items-center gap-3">
              <div
                className="text-5xl font-mono font-black"
                style={{ color: timerColor }}
              >
                {timerRemaining}s
              </div>
            </div>
          )}
        </div>

        {timerSeconds > 0 && (
          <div className="w-full h-3 bg-[#1a2a3a] rounded-full mb-8 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${timerPercent}%`, backgroundColor: timerColor }}
            />
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center">
          {q.imageUrl ? (
            <img src={q.imageUrl} alt={q.label} className="w-40 h-40 object-cover rounded-2xl mb-6" />
          ) : q.symbol ? (
            <div className="text-8xl mb-6">{q.symbol}</div>
          ) : null}
          <p className="text-[#8899aa] text-2xl mb-4">{q.question}</p>

          <div className="grid grid-cols-2 gap-4 w-full max-w-4xl mb-8">
            {q.options.map((opt, i) => (
              <div
                key={i}
                className="bg-[#1a2a3a] rounded-2xl p-5 flex items-center gap-4"
              >
                <span
                  className="text-2xl font-black w-10 h-10 flex items-center justify-center rounded-xl text-[#0d1b2a]"
                  style={{ backgroundColor: ['#ef4444', '#3b82f6', '#22c55e', '#eab308'][i] ?? '#8899aa' }}
                >
                  {LABEL_LETTERS[i]}
                </span>
                <span className="text-white text-xl font-medium">{opt}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="w-64 h-4 bg-[#1a2a3a] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#f9d74e] rounded-full transition-all"
                style={{ width: total > 0 ? `${(answered / total) * 100}%` : '0%' }}
              />
            </div>
            <span className="text-white text-xl font-bold">
              {t.answeredDisplay(answered, total)}
            </span>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          {[...teams].sort((a, b) => b.totalScore - a.totalScore).slice(0, 6).map(team => (
            <div key={team.id} className="flex items-center gap-2 bg-[#1a2a3a] rounded-xl px-3 py-2">
              <span className="text-xl">{team.avatar}</span>
              <div>
                <p className="text-white text-sm font-bold">{team.name}</p>
                <p className="text-[#f9d74e] text-xs font-black">{team.totalScore} b</p>
              </div>
              {answeredTeamIds.has(team.id) && <span className="text-[#22c55e]">✓</span>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── ROUND RESULTS ─────────────────────────────────────────────────────────

  if (status === 'round_results') {
    const sorted = [...roundScores].sort((a, b) => a.position - b.position)
    const revealed = sorted.slice(sorted.length - revealedCount).reverse()
    const unrevealed = sorted.slice(0, sorted.length - revealedCount).reverse()
    const maxScore = sorted[0]?.score ?? 1

    const overallSorted = [...teams].sort((a, b) => b.totalScore - a.totalScore)
    const maxTotal = overallSorted[0]?.totalScore ?? 1

    return (
      <div className="min-h-screen bg-[#0d1b2a] flex p-8 gap-8">
        <div className="flex-1">
          <h2 className="text-3xl font-black text-white mb-6">{t.roundResultsTitle(currentRound)}</h2>
          <div className="space-y-3">
            {revealed.map(s => (
              <div key={s.teamId} className="flex items-center gap-4 bg-[#1a2a3a] rounded-2xl p-4">
                <span className="text-3xl w-10">
                  {s.position === 1 ? '🥇' : s.position === 2 ? '🥈' : s.position === 3 ? '🥉' : `${s.position}.`}
                </span>
                <span className="text-3xl">{s.avatar}</span>
                <span className="text-white font-bold text-xl flex-1">{s.teamName}</span>
                <div className="text-right">
                  <p className="text-[#f9d74e] font-black text-2xl">{t.points(s.score)}</p>
                  <div
                    className="h-2 rounded-full bg-[#f9d74e] mt-1"
                    style={{ width: `${Math.round((s.score / maxScore) * 120)}px` }}
                  />
                </div>
              </div>
            ))}
            {unrevealed.map((_, i) => (
              <div key={`u-${i}`} className="flex items-center gap-4 bg-[#1a2a3a] rounded-2xl p-4 opacity-40">
                <span className="text-3xl w-10">🎭</span>
                <span className="text-3xl">❓</span>
                <span className="text-[#8899aa] font-bold text-xl flex-1">???</span>
                <p className="text-[#8899aa] font-black text-2xl">{t.unknownPoints}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="w-72">
          <h3 className="text-xl font-black text-white mb-4">{t.overallScore}</h3>
          <div className="space-y-3">
            {overallSorted.map((team, i) => (
              <div key={team.id} className="flex items-center gap-3 bg-[#1a2a3a] rounded-xl p-3">
                <span className="text-lg w-6">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                <span className="text-xl">{team.avatar}</span>
                <div className="flex-1">
                  <p className="text-white text-sm font-bold truncate">{team.name}</p>
                  <div className="w-full h-2 bg-[#0d1b2a] rounded-full mt-1">
                    <div
                      className="h-full rounded-full bg-[#f9d74e]"
                      style={{ width: `${(team.totalScore / maxTotal) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-[#f9d74e] font-black text-sm">{team.totalScore}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (status === 'finished') {
    const sorted = [...teams].sort((a, b) => b.totalScore - a.totalScore)
    return (
      <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center p-8">
        <div className="text-center w-full max-w-2xl">
          <div className="text-8xl mb-6">🏆</div>
          <h2 className="text-6xl font-black text-white mb-8">{t.finalResults}</h2>
          <div className="space-y-4">
            {sorted.map((team, i) => (
              <div
                key={team.id}
                className={`flex items-center gap-4 rounded-2xl p-5 ${i === 0 ? 'bg-[#f9d74e]/10 border-2 border-[#f9d74e]' : 'bg-[#1a2a3a]'}`}
              >
                <span className="text-4xl w-12">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                </span>
                <span className="text-4xl">{team.avatar}</span>
                <span className={`flex-1 text-left font-black text-2xl ${i === 0 ? 'text-[#f9d74e]' : 'text-white'}`}>
                  {team.name}
                </span>
                <span className={`font-black text-3xl ${i === 0 ? 'text-[#f9d74e]' : 'text-white'}`}>
                  {team.totalScore}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center">
      <div className="text-[#f9d74e] text-2xl">{t.loading}</div>
    </div>
  )
}
