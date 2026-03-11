import { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { useGameStore } from '../../store/gameStore'
import { TRANSLATIONS, pluralize } from '../../data/translations'
import { THEMES } from '../../data/themes'
import { trunc } from '../../utils'

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣']

export default function WinModal() {
  const players          = useGameStore(s => s.players)
  const soloMoves        = useGameStore(s => s.soloMoves)
  const language         = useGameStore(s => s.language)
  const theme            = useGameStore(s => s.theme)
  const isOnline         = useGameStore(s => s.isOnline)
  const isHost           = useGameStore(s => s.isHost)
  const playAgain        = useGameStore(s => s.playAgain)
  const resetToSetup     = useGameStore(s => s.resetToSetup)
  const requestRematch   = useGameStore(s => s.requestRematch)
  const rematchRequested = useGameStore(s => s.rematchRequested)
  const tr = TRANSLATIONS[language]
  const tc = THEMES[theme]

  const isSolo = players.length === 1

  useEffect(() => {
    const colors = theme === 'light'
      ? ['#6d41a1', '#ffffff', '#c4a8e8']
      : ['#f9d74e', '#ffffff', '#1a237e']
    const end = Date.now() + 2500
    const frame = () => {
      confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors })
      confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }, [])

  if (isSolo) {
    const p = players[0]
    const totalQuizzes = p.quizzes + p.wrongQuizzes
    const accuracy = totalQuizzes > 0 ? Math.round(p.quizzes / totalQuizzes * 100) : 100
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: tc.winOverlayBg }}>
        <div className="pop-in rounded-2xl p-10 text-center"
          style={{ background: tc.modalSurface, border: `2px solid ${tc.accent}`, boxShadow: `0 0 60px ${tc.accentGlow}`, color: tc.text }}>

          <div className="text-4xl mb-1">🎉</div>
          <div className="text-2xl font-bold mb-1" style={{ color: tc.accent }}>{tr.soloGameOver}</div>
          <div className="text-xs uppercase tracking-widest mb-8" style={{ color: tc.textMuted }}>{trunc(p.name)}</div>

          <div className="flex flex-col gap-4 text-left mb-2">
            <div className="flex items-center justify-between gap-8">
              <span style={{ color: tc.textMuted }}>{tr.soloMovesLabel}</span>
              <span className="text-xl font-bold" style={{ color: tc.accent }}>
                {pluralize(soloMoves, tr, 'moveOne', 'moveFew', 'moveMany')}
              </span>
            </div>
            <div className="flex items-center justify-between gap-8">
              <span style={{ color: tc.textMuted }}>{tr.soloQuizLabel}</span>
              <span className="text-xl font-bold" style={{ color: tc.accent }}>
                {p.quizzes}/{totalQuizzes} <span className="text-base font-normal" style={{ color: tc.textDim }}>({accuracy}%)</span>
              </span>
            </div>
          </div>

          <button
            onClick={playAgain}
            className="mt-8 px-10 py-2.5 rounded-xl font-bold transition-transform hover:scale-105"
            style={{ background: tc.accentGradient, color: tc.accentText }}
          >
            {tr.playAgain}
          </button>

          <button
            onClick={resetToSetup}
            className="block mx-auto mt-3 text-sm transition-opacity opacity-35 hover:opacity-70"
          >
            {tr.playerSettings}
          </button>
        </div>
      </div>
    )
  }

  const sorted = [...players].sort((a, b) => b.score - a.score)
  const maxScore = sorted[0]?.score ?? 0
  const winners = sorted.filter(p => p.score === maxScore)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: tc.winOverlayBg }}>
      <div className="pop-in rounded-2xl p-10 text-center"
        style={{ background: tc.modalSurface, border: `2px solid ${tc.accent}`, boxShadow: `0 0 60px ${tc.accentGlow}`, color: tc.text }}>

        <div className="text-4xl mb-1">🎉</div>
        <div className="text-2xl font-bold mb-1" style={{ color: tc.accent }}>{tr.gameOver}</div>
        <div className="text-xs uppercase tracking-widest mb-6" style={{ color: tc.textMuted }}>{tr.results}</div>

        {winners.length > 1
          ? <div className="text-lg mb-4" style={{ color: tc.accent }}>{tr.tie}</div>
          : <div className="text-lg mb-4" style={{ color: tc.accent }}
              dangerouslySetInnerHTML={{ __html: tr.winner.replace('{name}', `<strong>${trunc(winners[0].name)}</strong>`) }}
            />
        }

        <div className="space-y-3 text-left">
          {sorted.map((p, i) => {
            const rank = sorted.filter(other => other.score > p.score).length
            return (<div key={i}>
              <div className="text-base">
                {MEDALS[rank]} <span style={{ color: p.color }}>{trunc(p.name)}</span>: <strong>{p.score} {language === 'en' ? 'pts' : 'bodů'}</strong>
              </div>
              <div className="text-xs pl-6 mt-0.5" style={{ color: tc.textDim }}>
                🃏 {pluralize(p.pairs, tr, 'pairOne', 'pairFew', 'pairMany')} &nbsp;+&nbsp; 🧠 {pluralize(p.quizzes, tr, 'quizOne', 'quizFew', 'quizMany')}
                {(p.quizzes + p.wrongQuizzes) > 0 && (
                  <span style={{ color: tc.textMuted }}>
                    {' '}· {Math.round(p.quizzes / (p.quizzes + p.wrongQuizzes) * 100)}%
                  </span>
                )}
              </div>
            </div>)
          })}
        </div>

        {/* Host: Play Again (highlighted if guest requested rematch) */}
        {(!isOnline || isHost) && (
          <button
            onClick={playAgain}
            className="mt-8 px-10 py-2.5 rounded-xl font-bold transition-transform hover:scale-105"
            style={{
              background: rematchRequested ? tc.text : tc.accentGradient,
              color: rematchRequested ? tc.bg : tc.accentText,
              boxShadow: rematchRequested ? `0 0 16px ${tc.accentGlow}` : undefined,
            }}
          >
            {rematchRequested ? '⚡ ' : ''}{tr.playAgain}
          </button>
        )}

        {/* Guest: Rematch request button */}
        {isOnline && !isHost && (
          rematchRequested
            ? <div className="mt-8 text-sm" style={{ color: tc.textMuted }}>
                {tr.rematchWaiting}
              </div>
            : <button
                onClick={requestRematch}
                className="mt-8 px-10 py-2.5 rounded-xl font-bold transition-transform hover:scale-105"
                style={{ background: tc.accentGradient, color: tc.accentText }}
              >
                {tr.rematchRequest}
              </button>
        )}

        <button
          onClick={resetToSetup}
          className="block mx-auto mt-3 text-sm transition-opacity opacity-35 hover:opacity-70"
        >
          {isOnline ? tr.leaveRoom : tr.playerSettings}
        </button>
      </div>
    </div>
  )
}
