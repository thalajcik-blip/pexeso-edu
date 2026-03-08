import { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { useGameStore } from '../../store/gameStore'
import { TRANSLATIONS, pluralize } from '../../data/translations'
import { THEMES } from '../../data/themes'

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣']

export default function WinModal() {
  const players          = useGameStore(s => s.players)
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

  useEffect(() => {
    const end = Date.now() + 2500
    const frame = () => {
      confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#f9d74e', '#ffffff', '#1a237e'] })
      confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#f9d74e', '#ffffff', '#1a237e'] })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }, [])

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
              dangerouslySetInnerHTML={{ __html: tr.winner.replace('{name}', `<strong>${winners[0].name}</strong>`) }}
            />
        }

        <div className="space-y-3 text-left">
          {sorted.map((p, i) => (
            <div key={i}>
              <div className="text-base">
                {MEDALS[i]} <span style={{ color: p.color }}>{p.name}</span>: <strong>{p.score} {language === 'en' ? 'pts' : 'bodů'}</strong>
              </div>
              <div className="text-xs pl-6 mt-0.5" style={{ color: tc.textFaint }}>
                🃏 {pluralize(p.pairs, tr, 'pairOne', 'pairFew', 'pairMany')} &nbsp;+&nbsp; 🧠 {pluralize(p.quizzes, tr, 'quizOne', 'quizFew', 'quizMany')}
              </div>
            </div>
          ))}
        </div>

        {/* Host: Play Again (highlighted if guest requested rematch) */}
        {(!isOnline || isHost) && (
          <button
            onClick={playAgain}
            className="mt-8 px-10 py-2.5 rounded-xl font-bold transition-transform hover:scale-105"
            style={{
              background: rematchRequested ? tc.text : tc.accent,
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
                style={{ background: tc.accent, color: tc.accentText }}
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
