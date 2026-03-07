import type { CardData } from '../../types/game'
import { useGameStore } from '../../store/gameStore'

interface Props {
  card: CardData
}

const EMOJI_SIZE: Record<string, string> = {
  large:  'clamp(1.4rem, 8vw,  3rem)',
  medium: 'clamp(1.8rem, 10vw, 3.8rem)',
  small:  'clamp(2.4rem, 15vw, 4.5rem)',
}

export default function GameCard({ card }: Props) {
  const flipCard = useGameStore(s => s.flipCard)
  const selectedSize = useGameStore(s => s.selectedSize)

  const isFlipped  = card.state === 'flipped'
  const isMatched  = card.state === 'matched'
  const isHidden   = card.state === 'hidden'

  const outerClass = [
    'aspect-square overflow-hidden',
    isHidden && 'card-hoverable',
    isFlipped && 'card-flipped',
    isMatched && 'card-matched',
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
            background: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #1a237e 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: '1.1rem',
            color: 'rgba(255,255,255,0.15)',
          }}
        >
          🎴
          <span className="absolute inset-[3px] rounded-[4px]" style={{ border: '1px solid rgba(255,255,255,0.07)' }} />
        </div>
        {/* Front */}
        <div
          className="card-front absolute inset-0 flex items-center justify-center rounded-[6px]"
          style={{
            background: isMatched ? '#e8f5e9' : '#f0f4ff',
            fontSize: EMOJI_SIZE[selectedSize],
            opacity: isMatched ? 0.65 : 1,
          }}
        >
          {card.symbol}
        </div>
      </div>
    </div>
  )
}
