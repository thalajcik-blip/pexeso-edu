import { useGameStore } from '../../store/gameStore'
import { TRANSLATIONS, pluralize } from '../../data/translations'
import { THEMES } from '../../data/themes'

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣']

export default function WinModal() {
  const players = useGameStore(s => s.players)
  const language = useGameStore(s => s.language)
  const theme = useGameStore(s => s.theme)
  const playAgain = useGameStore(s => s.playAgain)
  const resetToSetup = useGameStore(s => s.resetToSetup)
  const tr = TRANSLATIONS[language]
  const tc = THEMES[theme]

  const sorted = [...players].sort((a, b) => b.score - a.score)
  const maxScore = sorted[0]?.score ?? 0
  const winners = sorted.filter(p => p.score === maxScore)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: tc.winOverlayBg }}>
      <div className="pop-in rounded-2xl p-10 text-center"
        style={{ background: 'linear-gradient(160deg, #0d1b2a 0%, #1a237e 100%)', border: '2px solid #f9d74e', boxShadow: '0 0 60px rgba(249,215,78,0.2)', color: '#ffffff' }}>

        <div className="text-4xl mb-1">🎉</div>
        <div className="text-2xl font-bold mb-1" style={{ color: '#f9d74e' }}>{tr.gameOver}</div>
        <div className="text-xs uppercase tracking-widest mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>{tr.results}</div>

        {winners.length > 1
          ? <div className="text-lg mb-4" style={{ color: '#f9d74e' }}>{tr.tie}</div>
          : <div className="text-lg mb-4" style={{ color: '#f9d74e' }}
              dangerouslySetInnerHTML={{ __html: tr.winner.replace('{name}', `<strong>${winners[0].name}</strong>`) }}
            />
        }

        <div className="space-y-3 text-left">
          {sorted.map((p, i) => (
            <div key={i}>
              <div className="text-base">
                {MEDALS[i]} <span style={{ color: p.color }}>{p.name}</span>: <strong>{p.score} {language === 'en' ? 'pts' : 'bodů'}</strong>
              </div>
              <div className="text-xs pl-6 mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                🃏 {pluralize(p.pairs, tr, 'pairOne', 'pairFew', 'pairMany')} &nbsp;+&nbsp; 🧠 {pluralize(p.quizzes, tr, 'quizOne', 'quizFew', 'quizMany')}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={playAgain}
          className="mt-8 px-10 py-2.5 rounded-xl font-bold transition-transform hover:scale-105"
          style={{ background: '#f9d74e', color: '#0d1b2a' }}
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
