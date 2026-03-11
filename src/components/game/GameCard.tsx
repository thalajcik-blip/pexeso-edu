import { memo } from 'react'
import type { CardData } from '../../types/game'
import { useGameStore } from '../../store/gameStore'
import { THEMES } from '../../data/themes'

interface Props {
  card: CardData
}

const EMOJI_SIZE: Record<string, string> = {
  large:  'clamp(1.4rem, 8vw,  3rem)',
  medium: 'clamp(1.8rem, 10vw, 3.8rem)',
  small:  'clamp(2.4rem, 15vw, 4.5rem)',
}

const GameCard = memo(function GameCard({ card }: Props) {
  const flipCard = useGameStore(s => s.flipCard)
  const selectedSize = useGameStore(s => s.selectedSize)
  const theme = useGameStore(s => s.theme)
  const players = useGameStore(s => s.players)
  const tc = THEMES[theme]

  const isFlipped  = card.state === 'flipped'
  const isMatched  = card.state === 'matched'
  const isWrong    = card.state === 'wrong'
  const isHidden   = card.state === 'hidden'

  const outerClass = [
    'aspect-square',
    isHidden && 'card-hoverable',
    isFlipped && 'card-flipped',
    isMatched && 'card-matched',
    isWrong   && 'card-wrong',
    !isMatched && 'cursor-pointer',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={outerClass}
      style={{ perspective: '700px' }}
      onClick={() => flipCard(card.id)}
    >
      <div className="card-inner" style={{ width: '100%', height: '100%', position: 'relative', borderRadius: '6px' }}>
        {/* Back */}
        <div
          className="card-back absolute inset-0 flex items-center justify-center rounded-[6px]"
          style={{
            background: tc.cardBackGradient,
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <span className="absolute inset-[3px] rounded-[4px]" style={{ border: '1px solid rgba(255,255,255,0.07)' }} />
        </div>
        {/* Front */}
        <div
          className="card-front absolute inset-0 flex items-center justify-center rounded-[6px] overflow-hidden"
          style={{
            background: isMatched ? tc.cardMatched : isWrong ? tc.errorBg : tc.cardFront,
            fontSize: EMOJI_SIZE[selectedSize],
            opacity: isMatched ? 0.65 : 1,
          }}
        >
          {card.symbol.startsWith('http') ? (
            <img src={card.symbol} alt="" className="w-full h-full object-cover" draggable={false} />
          ) : card.symbol}
          {isMatched && card.matchedBy !== undefined && players[card.matchedBy] && (
            players.length === 1
              ? card.quizCorrect !== undefined && (
                  <span
                    className="absolute top-0.5 right-0.5 font-bold leading-none"
                    style={{
                      fontSize: 'clamp(8px, 1.5vw, 13px)',
                      color: card.quizCorrect ? '#4ade80' : '#f87171',
                    }}
                  >
                    {card.quizCorrect ? '✓' : '✗'}
                  </span>
                )
              : <span
                  className="absolute top-1 right-1 rounded-full"
                  style={{
                    width: 'clamp(6px, 1.2vw, 10px)',
                    height: 'clamp(6px, 1.2vw, 10px)',
                    background: players[card.matchedBy].color,
                    opacity: 0.9,
                  }}
                />
          )}
        </div>
      </div>
    </div>
  )
})

export default GameCard
