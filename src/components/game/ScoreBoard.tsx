import { useGameStore } from '../../store/gameStore'
import { TRANSLATIONS, t } from '../../data/translations'
import { THEMES } from '../../data/themes'

export default function ScoreBoard() {
  const players        = useGameStore(s => s.players)
  const currentPlayer  = useGameStore(s => s.currentPlayer)
  const turnMessage    = useGameStore(s => s.turnMessage)
  const language       = useGameStore(s => s.language)
  const theme          = useGameStore(s => s.theme)
  const isOnline       = useGameStore(s => s.isOnline)
  const myPlayerIndex  = useGameStore(s => s.myPlayerIndex)
  const tr = TRANSLATIONS[language]
  const tc = THEMES[theme]
  const isMyTurn = !isOnline || myPlayerIndex === currentPlayer

  return (
    <>
      <div className="flex gap-2 justify-center flex-wrap mb-2">
        {players.map((p, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border-2 text-sm transition-all"
            style={i === currentPlayer
              ? { borderColor: tc.accentBorderActive, background: tc.accentBgActive }
              : { borderColor: 'transparent', background: tc.scorePillBg }
            }
          >
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
            <span className="font-medium">{p.name}</span>
            <span className="font-bold" style={{ color: tc.accent, marginLeft: '0.25rem' }}>{p.score} b.</span>
          </div>
        ))}
      </div>

      <div className="text-center mb-2 text-sm min-h-[1.4em]" style={{ color: tc.textDim }}>
        {turnMessage
          ? <span dangerouslySetInnerHTML={{ __html: turnMessage }} />
          : isMyTurn
            ? <span dangerouslySetInnerHTML={{ __html: t(tr, 'onTurn', { name: `<strong style="color:${players[currentPlayer]?.color}">${players[currentPlayer]?.name}</strong>` }) }} />
            : <span style={{ color: tc.textFaint }}>{tr.waitingForTurn.replace('{name}', players[currentPlayer]?.name ?? '')}</span>
        }
      </div>
    </>
  )
}
