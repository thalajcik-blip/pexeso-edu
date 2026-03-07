import { useState, useEffect } from 'react'
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
  const phase          = useGameStore(s => s.phase)
  const turnTime       = useGameStore(s => s.turnTime)
  const timeoutTurn    = useGameStore(s => s.timeoutTurn)
  const tr = TRANSLATIONS[language]
  const tc = THEMES[theme]
  const isMyTurn = !isOnline || myPlayerIndex === currentPlayer

  const [timeLeft, setTimeLeft] = useState(turnTime)

  // Reset + run countdown on new turn
  useEffect(() => {
    if (!isOnline || !isMyTurn || phase !== 'playing' || turnTime === 0) {
      setTimeLeft(turnTime)
      return
    }
    setTimeLeft(turnTime)
    const start = Date.now()
    const interval = setInterval(() => {
      const remaining = turnTime - Math.floor((Date.now() - start) / 1000)
      if (remaining <= 0) {
        clearInterval(interval)
        setTimeLeft(0)
        timeoutTurn()
      } else {
        setTimeLeft(remaining)
      }
    }, 200)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, phase])

  // Non-active player: just show a static bar so they see the same timer visually
  const [otherTimeLeft, setOtherTimeLeft] = useState(turnTime)
  useEffect(() => {
    if (!isOnline || isMyTurn || phase !== 'playing' || turnTime === 0) {
      setOtherTimeLeft(turnTime)
      return
    }
    setOtherTimeLeft(turnTime)
    const start = Date.now()
    const interval = setInterval(() => {
      const remaining = Math.max(0, turnTime - Math.floor((Date.now() - start) / 1000))
      setOtherTimeLeft(remaining)
    }, 200)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, phase])

  const displayTime = isMyTurn ? timeLeft : otherTimeLeft
  const showTimer = isOnline && phase === 'playing' && turnTime > 0
  const timerFraction = turnTime > 0 ? displayTime / turnTime : 1
  const timerColor = displayTime <= 5 ? tc.errorColor : displayTime <= 10 ? '#f97316' : tc.accent

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

      <div className="text-center mb-1 text-sm min-h-[1.4em]" style={{ color: tc.textDim }}>
        {turnMessage
          ? <span dangerouslySetInnerHTML={{ __html: turnMessage }} />
          : isMyTurn
            ? <span dangerouslySetInnerHTML={{ __html: t(tr, 'onTurn', { name: `<strong style="color:${players[currentPlayer]?.color}">${players[currentPlayer]?.name}</strong>` }) }} />
            : <span style={{ color: tc.textFaint }}>{tr.waitingForTurn.replace('{name}', players[currentPlayer]?.name ?? '')}</span>
        }
      </div>

      {/* Turn timer bar */}
      {showTimer && (
        <div className="flex items-center gap-2 justify-center mb-2 px-4">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: tc.scorePillBg }}>
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{ width: `${timerFraction * 100}%`, background: timerColor }}
            />
          </div>
          <span className="text-xs font-bold tabular-nums w-6 text-right" style={{ color: timerColor }}>
            {displayTime}
          </span>
        </div>
      )}
    </>
  )
}
