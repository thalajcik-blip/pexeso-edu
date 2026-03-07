import { useGameStore } from '../../store/gameStore'
import { SIZE_CONFIG } from '../../types/game'
import GameCard from './GameCard'
import ScoreBoard from './ScoreBoard'

export default function GameBoard() {
  const cards = useGameStore(s => s.cards)
  const selectedSize = useGameStore(s => s.selectedSize)
  const resetToSetup = useGameStore(s => s.resetToSetup)
  const openRules = useGameStore(s => s.openRules)
  const debugEndGame = useGameStore(s => s.debugEndGame)
  const cols = SIZE_CONFIG[selectedSize].cols

  return (
    <div className="px-4 pt-3 pb-16">
      <ScoreBoard />

      <div className="flex justify-center items-center gap-4 mb-1.5">
        <button
          onClick={resetToSetup}
          className="text-xs px-3 py-1 rounded-md transition-colors"
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.45)' }}
        >
          ↺ Nová hra
        </button>
        {import.meta.env.DEV && (
          <button
            onClick={debugEndGame}
            className="text-xs px-3 py-1 rounded-md"
            style={{ background: 'rgba(255,0,0,0.15)', border: '1px solid rgba(255,0,0,0.3)', color: 'rgba(255,100,100,0.8)' }}
          >
            ⚡ Debug
          </button>
        )}
      </div>

      <div
        className="overflow-auto"
        style={{ maxHeight: 'calc(100vh - 155px)', scrollbarGutter: 'stable' }}
      >
        <div
          className="grid w-full mx-auto"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: 'clamp(2px, 0.5vw, 4px)',
            maxWidth: 'min(95vw, 600px)',
          }}
        >
          {cards.map(card => (
            <GameCard key={card.id} card={card} />
          ))}
        </div>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 flex flex-col items-center gap-0.5 pb-2 pt-1 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(13,27,42,0.95) 60%, transparent)' }}
      >
        <button
          onClick={openRules}
          className="text-sm pointer-events-auto transition-opacity opacity-35 hover:opacity-70"
        >
          📖 Pravidla hry
        </button>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
          © {new Date().getFullYear()} teamplayer.cz
        </p>
      </div>
    </div>
  )
}
