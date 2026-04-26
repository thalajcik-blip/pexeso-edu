import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePubQuizStore } from '../store/pubQuizStore'
import { loadSession, loadTeams, joinChannel } from '../services/pubQuizService'
import { TEAM_COLORS, TEAM_AVATARS } from '../types/pubQuiz'

const LABEL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

export default function TeamView() {
  const { sessionCode } = useParams<{ sessionCode: string }>()

  const {
    sessionId, status, teams, currentRound, currentQuestion,
    currentQuestionData, timerRemaining, answeredTeamIds, roundScores,
    revealedCount, myTeamId, selectedAnswer, hasSubmitted,
    initSession, applyEvent,
    teamJoin, teamSelectAnswer, teamSubmitAnswer, teamChangeAnswer,
  } = usePubQuizStore()

  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(TEAM_AVATARS[0])
  const [color, setColor] = useState(TEAM_COLORS[0])
  const [sessionLoading, setSessionLoading] = useState(true)
  const [sessionNotFound, setSessionNotFound] = useState(false)

  // Load session
  useEffect(() => {
    if (!sessionCode) return
    ;(async () => {
      const session = await loadSession(sessionCode)
      if (!session) { setSessionNotFound(true); setSessionLoading(false); return }

      // Restore sessionId if reloading
      if (!sessionId) {
        const existingTeams = await loadTeams(session.id)
        initSession(session.id, sessionCode, null)
        usePubQuizStore.setState({ teams: existingTeams, status: session.status as any })
      }

      joinChannel(sessionCode, applyEvent)
      setSessionLoading(false)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCode])

  async function handleJoin() {
    if (!name.trim()) { setJoinError('Zadej název týmu.'); return }
    if (teams.length >= 8) { setJoinError('Maximálně 8 týmů.'); return }
    if (teams.some(t => t.name.toLowerCase() === name.trim().toLowerCase())) {
      setJoinError('Tento název týmu je již obsazen.'); return
    }
    setJoining(true)
    setJoinError('')
    const ok = await teamJoin(name.trim(), avatar, color)
    if (!ok) { setJoinError('Přihlášení selhalo, zkus to znovu.'); setJoining(false) }
  }

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center">
        <div className="text-[#f9d74e] text-xl">Načítání...</div>
      </div>
    )
  }

  if (sessionNotFound) {
    return (
      <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-white mb-2">Session nenalezena</h2>
          <p className="text-[#8899aa]">Zkontroluj kód a zkus to znovu.</p>
        </div>
      </div>
    )
  }

  // ── JOIN FORM ─────────────────────────────────────────────────────────────

  if (!myTeamId) {
    return (
      <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🎯</div>
            <h1 className="text-2xl font-black text-white">Pub Kvíz</h1>
            <p className="text-[#8899aa] text-sm">{sessionCode}</p>
          </div>

          <div className="bg-[#1a2a3a] rounded-2xl p-6">
            <label className="text-[#8899aa] text-sm block mb-1">Název týmu</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              maxLength={20}
              placeholder="Naše skvělý tým..."
              className="w-full bg-[#0d1b2a] text-white rounded-xl px-4 py-3 mb-4 border border-[#2a3a4a] focus:border-[#f9d74e] outline-none"
            />

            <label className="text-[#8899aa] text-sm block mb-2">Avatar týmu</label>
            <div className="grid grid-cols-6 gap-2 mb-4">
              {TEAM_AVATARS.map(a => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`text-2xl p-2 rounded-xl ${avatar === a ? 'bg-[#f9d74e]/20 ring-2 ring-[#f9d74e]' : 'bg-[#0d1b2a]'}`}
                >
                  {a}
                </button>
              ))}
            </div>

            <label className="text-[#8899aa] text-sm block mb-2">Barva týmu</label>
            <div className="flex gap-2 mb-6">
              {TEAM_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-8 h-8 rounded-full ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a2a3a]' : ''}`}
                />
              ))}
            </div>

            {joinError && (
              <p className="text-[#ef4444] text-sm mb-3">{joinError}</p>
            )}

            <button
              onClick={handleJoin}
              disabled={joining || !name.trim()}
              className="w-full py-4 bg-[#f9d74e] text-[#0d1b2a] font-black rounded-xl text-lg disabled:opacity-50"
            >
              {joining ? 'Přihlašování...' : `${avatar} Přihlásit se`}
            </button>
          </div>

          {/* Existing teams */}
          {teams.length > 0 && (
            <div className="mt-4 bg-[#1a2a3a] rounded-2xl p-4">
              <p className="text-[#8899aa] text-sm mb-2">Již přihlášené týmy ({teams.length}/8)</p>
              {teams.map(t => (
                <div key={t.id} className="flex items-center gap-2 py-1">
                  <span>{t.avatar}</span>
                  <span className="text-white text-sm">{t.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── LOBBY WAIT ────────────────────────────────────────────────────────────

  if (status === 'lobby') {
    const myTeam = teams.find(t => t.id === myTeamId)
    return (
      <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="text-6xl mb-4">{myTeam?.avatar}</div>
          <h2 className="text-2xl font-black text-white mb-1">{myTeam?.name}</h2>
          <p className="text-[#8899aa] mb-6">Čekáme na start od kvízmastera...</p>

          <div className="bg-[#1a2a3a] rounded-2xl p-4">
            <p className="text-[#8899aa] text-sm mb-2">Přihlášené týmy ({teams.length}/8)</p>
            {teams.map(t => (
              <div key={t.id} className="flex items-center gap-2 py-1">
                <span>{t.avatar}</span>
                <span className={`text-sm ${t.id === myTeamId ? 'text-[#f9d74e] font-bold' : 'text-white'}`}>{t.name}</span>
                {t.id === myTeamId && <span className="text-xs text-[#8899aa]">(ty)</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── ROUND INTRO ───────────────────────────────────────────────────────────

  if (status === 'round_intro') {
    return (
      <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-5xl mb-3">⏳</div>
          <h2 className="text-2xl font-black text-white mb-2">Kolo {currentRound}</h2>
          <p className="text-[#8899aa]">Kvízmaster spouští kolo...</p>
        </div>
      </div>
    )
  }

  // ── PAUSED ────────────────────────────────────────────────────────────────

  if (status === 'question_paused') {
    return (
      <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">⏸</div>
          <h2 className="text-xl font-bold text-white mb-2">Kvízmaster pozastavil hru</h2>
          <p className="text-[#8899aa]">Počkej chvíli...</p>
        </div>
      </div>
    )
  }

  // ── QUESTION ACTIVE ───────────────────────────────────────────────────────

  if (status === 'question_active') {
    const q = currentQuestionData

    if (!q) {
      return (
        <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center">
          <div className="text-[#8899aa]">Otázka se načítá...</div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-[#0d1b2a] p-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-[#8899aa] text-sm">Kolo {currentRound} · Otázka {currentQuestion}</p>
          {timerRemaining !== null && (
            <div className={`text-2xl font-mono font-black ${timerRemaining <= 5 ? 'text-[#ef4444]' : 'text-[#f9d74e]'}`}>
              {timerRemaining}s
            </div>
          )}
        </div>

        {/* Question card */}
        <div className="bg-[#1a2a3a] rounded-2xl p-5 mb-4 text-center">
          {q.imageUrl && (
            <img src={q.imageUrl} alt={q.label} className="w-20 h-20 object-cover rounded-xl mx-auto mb-3" />
          )}
          {!q.imageUrl && q.symbol && <div className="text-6xl mb-3">{q.symbol}</div>}
          <p className="text-white font-medium">{q.question}</p>
        </div>

        {/* Answer options */}
        <div className="grid grid-cols-2 gap-3 mb-4 flex-1">
          {q.options.map((opt, i) => {
            const isSelected = selectedAnswer === opt
            return (
              <button
                key={i}
                onClick={() => !hasSubmitted && teamSelectAnswer(opt)}
                disabled={hasSubmitted}
                className={`
                  rounded-2xl p-4 text-left font-bold text-base transition-all
                  ${isSelected
                    ? 'bg-[#f9d74e] text-[#0d1b2a]'
                    : hasSubmitted
                      ? 'bg-[#1a2a3a] text-[#8899aa] opacity-60'
                      : 'bg-[#1a2a3a] text-white hover:bg-[#2a3a4a] active:scale-95'}
                `}
              >
                <span className="text-sm opacity-60 block">{LABEL_LETTERS[i]}</span>
                {opt}
              </button>
            )
          })}
        </div>

        {/* Submit / submitted */}
        {!hasSubmitted ? (
          <button
            onClick={teamSubmitAnswer}
            disabled={!selectedAnswer}
            className="w-full py-4 bg-[#f9d74e] text-[#0d1b2a] font-black rounded-2xl text-lg disabled:opacity-40"
          >
            Potvrdit odpověď
          </button>
        ) : (
          <div className="text-center">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-white font-bold mb-1">Odpověď odeslána!</p>
            <p className="text-[#8899aa] text-sm mb-3">
              Odpovědělo: {answeredTeamIds.size}/{teams.length} týmů
            </p>
            <button
              onClick={teamChangeAnswer}
              className="text-[#8899aa] text-sm underline"
            >
              Změnit odpověď
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── ROUND RESULTS ─────────────────────────────────────────────────────────

  if (status === 'round_results') {
    const sorted = [...roundScores].sort((a, b) => a.position - b.position)
    // Show from last to first as they get revealed
    const revealed = sorted.slice(sorted.length - revealedCount).reverse()

    return (
      <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-black text-white text-center mb-6">
            🏆 Výsledky Kola {currentRound}
          </h2>
          <div className="bg-[#1a2a3a] rounded-2xl p-5 space-y-3 mb-4">
            {revealed.map(s => (
              <div key={s.teamId} className={`flex items-center gap-3 ${s.teamId === myTeamId ? 'text-[#f9d74e]' : ''}`}>
                <span className="text-2xl w-8">
                  {s.position === 1 ? '🥇' : s.position === 2 ? '🥈' : s.position === 3 ? '🥉' : `${s.position}.`}
                </span>
                <span className="text-2xl">{s.avatar}</span>
                <span className={`flex-1 font-bold ${s.teamId === myTeamId ? 'text-[#f9d74e]' : 'text-white'}`}>{s.teamName}</span>
                <span className="font-black">{s.score}</span>
              </div>
            ))}
            {/* Unrevealed */}
            {sorted.slice(0, sorted.length - revealedCount).reverse().map((_, i) => (
              <div key={`h-${i}`} className="flex items-center gap-3 opacity-30">
                <span className="text-2xl w-8">???</span>
                <span className="text-2xl">🎭</span>
                <span className="text-[#8899aa] flex-1">???</span>
              </div>
            ))}
          </div>
          <p className="text-center text-[#8899aa] text-sm">Čekáme na kvízmastera...</p>
        </div>
      </div>
    )
  }

  // ── FINISHED ──────────────────────────────────────────────────────────────

  if (status === 'finished') {
    const sorted = [...teams].sort((a, b) => b.totalScore - a.totalScore)
    const myPosition = sorted.findIndex(t => t.id === myTeamId) + 1
    const myTeam = teams.find(t => t.id === myTeamId)

    return (
      <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="text-6xl mb-2">{myPosition === 1 ? '🏆' : myPosition === 2 ? '🥈' : myPosition === 3 ? '🥉' : '🎯'}</div>
          <p className="text-[#8899aa] mb-1">{myTeam?.avatar} {myTeam?.name}</p>
          <h2 className="text-3xl font-black text-white mb-1">
            {myPosition}. místo
          </h2>
          <p className="text-[#f9d74e] text-2xl font-bold mb-6">{myTeam?.totalScore} bodů</p>

          <div className="bg-[#1a2a3a] rounded-2xl p-5 space-y-3">
            {sorted.map((t, i) => (
              <div key={t.id} className={`flex items-center gap-3 ${t.id === myTeamId ? '' : ''}`}>
                <span className="text-xl w-6">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                <span className="text-xl">{t.avatar}</span>
                <span className={`flex-1 text-left font-bold ${t.id === myTeamId ? 'text-[#f9d74e]' : 'text-white'}`}>{t.name}</span>
                <span className={`font-black ${t.id === myTeamId ? 'text-[#f9d74e]' : 'text-white'}`}>{t.totalScore}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return null
}
