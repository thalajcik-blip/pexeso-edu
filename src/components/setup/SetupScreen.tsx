import { useGameStore } from '../../store/gameStore'
import { DECKS } from '../../data/decks'
import { DEFAULT_NAMES, PLAYER_COLORS } from '../../types/game'
import type { DeckId, BoardSize } from '../../types/game'

const SIZES: { id: BoardSize; label: string; sub: string }[] = [
  { id: 'large',  label: '8×8', sub: 'Velké' },
  { id: 'medium', label: '6×6', sub: 'Střední' },
  { id: 'small',  label: '4×4', sub: 'Malé' },
]

export default function SetupScreen() {
  const {
    selectedDeckId, selectDeck,
    selectedSize, selectSize,
    numPlayers, setNumPlayers,
    playerNames, setPlayerName,
    startGame, openRules,
  } = useGameStore()

  return (
    <div className="flex flex-col items-center justify-start min-h-screen px-4 pb-28 gap-4" style={{ paddingTop: 'max(5vh, 1.5rem)' }}>
      <h1 className="text-5xl font-bold tracking-tight" style={{ color: '#f9d74e', textShadow: '0 0 40px rgba(249,215,78,0.4)' }}>
        QuizMatch
      </h1>

      <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
        {/* Deck */}
        <div>
          <div className="text-xs uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>Sada karet</div>
          <div className="grid grid-cols-4 gap-3">
            {DECKS.map(deck => (
              <button
                key={deck.id}
                onClick={() => selectDeck(deck.id as DeckId)}
                className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 text-sm font-semibold transition-all"
                style={selectedDeckId === deck.id
                  ? { background: '#f9d74e', borderColor: '#f9d74e', color: '#0d1b2a' }
                  : { background: 'transparent', borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }
                }
              >
                <span className="text-3xl leading-none">{deck.icon}</span>
                <span className="text-xs">{deck.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Size */}
        <div>
          <div className="text-xs uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>Velikost hrací plochy</div>
          <div className="flex gap-3">
            {SIZES.map(s => (
              <button
                key={s.id}
                onClick={() => selectSize(s.id)}
                className="flex-1 py-2.5 rounded-xl border-2 font-bold transition-all"
                style={selectedSize === s.id
                  ? { background: '#f9d74e', borderColor: '#f9d74e', color: '#0d1b2a' }
                  : { background: 'transparent', borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }
                }
              >
                {s.label}
                <div className="text-xs font-normal opacity-70">{s.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Player count */}
        <div>
          <div className="text-xs uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>Počet hráčů</div>
          <div className="flex gap-3">
            {[2, 3, 4].map(n => (
              <button
                key={n}
                onClick={() => setNumPlayers(n)}
                className="flex-1 py-2.5 rounded-xl border-2 text-xl font-bold transition-all"
                style={numPlayers === n
                  ? { background: '#f9d74e', borderColor: '#f9d74e', color: '#0d1b2a' }
                  : { background: 'transparent', borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }
                }
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Player names */}
        <div>
          <div className="text-xs uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>Jména hráčů</div>
          <div className="flex flex-col gap-2">
            {Array.from({ length: numPlayers }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: PLAYER_COLORS[i] }} />
                <input
                  className="flex-1 rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)' }}
                  value={playerNames[i]}
                  placeholder={DEFAULT_NAMES[i]}
                  onChange={e => setPlayerName(i, e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#f9d74e'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.13)'}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={startGame}
          className="w-full py-3.5 rounded-xl text-lg font-bold transition-all hover:-translate-y-0.5"
          style={{ background: '#f9d74e', color: '#0d1b2a', boxShadow: '0 4px 20px rgba(249,215,78,0.3)' }}
        >
          Začít hru →
        </button>
      </div>

      <button onClick={openRules} className="text-sm opacity-35 hover:opacity-70 transition-opacity">
        📖 Pravidla hry
      </button>
    </div>
  )
}
