import { useGameStore } from '../../store/gameStore'
import { TRANSLATIONS, t } from '../../data/translations'

export default function ScoreBoard() {
  const players = useGameStore(s => s.players)
  const currentPlayer = useGameStore(s => s.currentPlayer)
  const turnMessage = useGameStore(s => s.turnMessage)
  const language = useGameStore(s => s.language)
  const tr = TRANSLATIONS[language]

  return (
    <>
      <div className="flex gap-2 justify-center flex-wrap mb-2">
        {players.map((p, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border-2 text-sm transition-all"
            style={i === currentPlayer
              ? { borderColor: 'rgba(249,215,78,0.7)', background: 'rgba(249,215,78,0.1)' }
              : { borderColor: 'transparent', background: 'rgba(255,255,255,0.04)' }
            }
          >
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
            <span className="font-medium">{p.name}</span>
            <span className="font-bold" style={{ color: '#f9d74e', marginLeft: '0.25rem' }}>{p.score} b.</span>
          </div>
        ))}
      </div>

      <div className="text-center mb-2 text-sm min-h-[1.4em]" style={{ color: 'rgba(255,255,255,0.6)' }}>
        {turnMessage
          ? <span dangerouslySetInnerHTML={{ __html: turnMessage }} />
          : <span dangerouslySetInnerHTML={{ __html: t(tr, 'onTurn', { name: `<strong style="color:${players[currentPlayer]?.color}">${players[currentPlayer]?.name}</strong>` }) }} />
        }
      </div>
    </>
  )
}
