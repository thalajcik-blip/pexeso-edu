import { useState, useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '../../store/gameStore'
import { TRANSLATIONS, t, pluralize } from '../../data/translations'
import { THEMES } from '../../data/themes'
import { soundTick } from '../../services/audioService'
import { trunc } from '../../utils'

export default function ScoreBoard() {
  const players        = useGameStore(s => s.players)
  const soloMoves      = useGameStore(s => s.soloMoves)
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
  const emojiReactions  = useGameStore(s => s.emojiReactions)
  const playerIds       = useGameStore(s => s.playerIds)
  const isMyTurn = !isOnline || myPlayerIndex === currentPlayer

  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string; playerIndex: number }[]>([])
  const floatIdRef = useRef(0)

  // Flash "Je tvůj tah!" when turn switches to me
  const [showYourTurnFlash, setShowYourTurnFlash] = useState(false)
  const prevCurrentPlayer = useRef<number | null>(null)
  useEffect(() => {
    if (
      isOnline &&
      phase === 'playing' &&
      isMyTurn &&
      prevCurrentPlayer.current !== null &&
      prevCurrentPlayer.current !== currentPlayer
    ) {
      setShowYourTurnFlash(true)
      const timer = setTimeout(() => setShowYourTurnFlash(false), 2000)
      prevCurrentPlayer.current = currentPlayer
      return () => clearTimeout(timer)
    }
    prevCurrentPlayer.current = currentPlayer
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer])

  const removeFloat = useCallback((id: number) => {
    setFloatingEmojis(prev => prev.filter(e => e.id !== id))
  }, [])

  useEffect(() => {
    const entries = Object.entries(emojiReactions)
    if (entries.length === 0) return
    entries.forEach(([pid, emoji]) => {
      const playerIndex = playerIds.indexOf(pid)
      if (playerIndex < 0) return
      const id = floatIdRef.current++
      setFloatingEmojis(prev => [...prev, { id, emoji, playerIndex }])
      setTimeout(() => removeFloat(id), 1400)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emojiReactions])

  const [timeLeft, setTimeLeft] = useState(turnTime)
  const prevTurnTime = useRef<number | null>(null)

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

  // Tick sound in last 5 seconds of turn
  useEffect(() => {
    if (!isOnline || phase !== 'playing' || turnTime === 0) return
    if (displayTime > 0 && displayTime <= 5 && prevTurnTime.current !== null && displayTime < prevTurnTime.current) {
      soundTick(displayTime <= 2)
    }
    prevTurnTime.current = displayTime
  }, [displayTime, isOnline, phase, turnTime])
  const showTimer = isOnline && phase === 'playing' && turnTime > 0
  const timerColor = displayTime <= 5 ? tc.errorColor : displayTime <= 10 ? '#f97316' : tc.accent

  return (
    <>
      <div className="flex gap-2 justify-center flex-wrap mb-2">
        {players.map((p, i) => {
          return (
            <div
              key={i}
              className="relative flex items-center gap-2 px-3.5 py-1.5 rounded-full border-2 text-sm transition-all"
              style={i === currentPlayer
                ? { borderColor: tc.accentBorderActive, background: tc.accentBgActive }
                : { borderColor: 'transparent', background: tc.scorePillBg }
              }
            >
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
              <span className="font-medium">{trunc(p.name)}</span>
              {players.length === 1
                ? <span key={`${i}-${p.quizzes}-${p.wrongQuizzes}`} className="score-pop font-bold" style={{ color: tc.accent, marginLeft: '0.25rem' }}>
                    🧠 {p.quizzes}/{p.quizzes + p.wrongQuizzes}
                  </span>
                : <span key={`${i}-${p.score}`} className="score-pop font-bold" style={{ color: tc.accent, marginLeft: '0.25rem' }}>
                    {p.score} b.
                  </span>
              }
              {floatingEmojis.filter(fe => fe.playerIndex === i).map(fe => (
                <span key={fe.id} className="emoji-float">{fe.emoji}</span>
              ))}
            </div>
          )
        })}
      </div>

      <div className="text-center mb-1 text-sm min-h-[1.4em]" style={{ color: tc.textDim }}>
        {players.length === 1
          ? <span style={{ color: tc.textMuted }}>
              🔄 {pluralize(soloMoves, tr, 'moveOne', 'moveFew', 'moveMany')}
            </span>
          : turnMessage
            ? <span dangerouslySetInnerHTML={{ __html: turnMessage }} />
            : isMyTurn
              ? <span dangerouslySetInnerHTML={{ __html: t(tr, 'onTurn', { name: `<strong style="color:${players[currentPlayer]?.color}">${trunc(players[currentPlayer]?.name ?? '')}</strong>` }) }} />
              : <span style={{ color: tc.textFaint }}>{tr.waitingForTurn.replace('{name}', trunc(players[currentPlayer]?.name ?? ''))}</span>
        }
      </div>

      {/* Your turn flash */}
      {showYourTurnFlash && (
        <div
          className="your-turn-flash"
          style={{ color: tc.accent, borderColor: tc.accentBorderActive, background: tc.accentBgActive }}
        >
          {tr.yourTurn}
        </div>
      )}

      {/* Turn timer bar */}
      {showTimer && (
        <div className="flex items-center gap-2 justify-center mb-2 px-4">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: tc.scorePillBg }}>
            <div
              key={`timer-${currentPlayer}-${phase}`}
              className="h-full rounded-full"
              style={{
                width: '100%',
                background: timerColor,
                animation: `timer-fill ${turnTime}s linear forwards`,
              }}
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
