import { useGameStore } from '../../store/gameStore'
import { DECKS } from '../../data/decks'
import { TRANSLATIONS } from "../../data/translations"
import { DEFAULT_NAMES, PLAYER_COLORS } from '../../types/game'
import type { DeckId, BoardSize } from '../../types/game'
import type { Language } from '../../data/translations'

const SIZES: { id: BoardSize; labelKey: 'sizeLarge' | 'sizeMedium' | 'sizeSmall'; grid: string }[] = [
  { id: 'large',  labelKey: 'sizeLarge',  grid: '8×8' },
  { id: 'medium', labelKey: 'sizeMedium', grid: '6×6' },
  { id: 'small',  labelKey: 'sizeSmall',  grid: '4×4' },
]

const LANGUAGES: { id: Language; label: string; flag: string }[] = [
  { id: 'cs', label: 'Čeština',   flag: '🇨🇿' },
  { id: 'sk', label: 'Slovenčina', flag: '🇸🇰' },
  { id: 'en', label: 'English',   flag: '🇬🇧' },
]

export default function SetupScreen() {
  const {
    language, setLanguage,
    selectedDeckId, selectDeck,
    selectedSize, selectSize,
    numPlayers, setNumPlayers,
    playerNames, setPlayerName,
    startGame, openRules,
  } = useGameStore()

  const tr = TRANSLATIONS[language]

  return (
    <div className="flex flex-col items-center justify-start min-h-screen px-4 pb-28 gap-4" style={{ paddingTop: 'max(5vh, 1.5rem)' }}>
      <h1 className="text-5xl font-bold tracking-tight" style={{ color: '#f9d74e', textShadow: '0 0 40px rgba(249,215,78,0.4)' }}>
        QuizMatch
      </h1>

      {/* Language selector */}
      <div className="flex gap-2">
        {LANGUAGES.map(lang => (
          <button
            key={lang.id}
            onClick={() => setLanguage(lang.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all"
            style={language === lang.id
              ? { background: '#f9d74e', borderColor: '#f9d74e', color: '#0d1b2a' }
              : { background: 'transparent', borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.55)' }
            }
          >
            <span>{lang.flag}</span>
            <span>{lang.label}</span>
          </button>
        ))}
      </div>

      <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
        {/* Deck */}
        <div>
          <div className="text-xs uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>{tr.deckLabel}</div>
          <div className="grid grid-cols-4 gap-3">
            {DECKS.map(deck => (
              <button
                key={deck.id}
                onClick={() => selectDeck(deck.id as DeckId)}
                className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer"
                style={selectedDeckId === deck.id
                  ? { background: '#f9d74e', borderColor: '#f9d74e', color: '#0d1b2a' }
                  : { background: 'transparent', borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }
                }
              >
                <span className="text-3xl leading-none">{deck.icon}</span>
                <span className="text-xs">{tr.deckNames[deck.id as DeckId]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Size */}
        <div>
          <div className="text-xs uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>{tr.sizeLabel}</div>
          <div className="flex gap-3">
            {SIZES.map(s => (
              <button
                key={s.id}
                onClick={() => selectSize(s.id)}
                className="flex-1 py-2.5 rounded-xl border-2 font-bold transition-all cursor-pointer"
                style={selectedSize === s.id
                  ? { background: '#f9d74e', borderColor: '#f9d74e', color: '#0d1b2a' }
                  : { background: 'transparent', borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }
                }
              >
                {s.grid}
                <div className="text-xs font-normal opacity-70">{tr[s.labelKey]}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Player count */}
        <div>
          <div className="text-xs uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>{tr.playersLabel}</div>
          <div className="flex gap-3">
            {[2, 3, 4].map(n => (
              <button
                key={n}
                onClick={() => setNumPlayers(n)}
                className="flex-1 py-2.5 rounded-xl border-2 text-xl font-bold transition-all cursor-pointer"
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
          <div className="text-xs uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>{tr.namesLabel}</div>
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

        <button
          onClick={startGame}
          className="w-full py-3.5 rounded-xl text-lg font-bold transition-all hover:-translate-y-0.5 cursor-pointer"
          style={{ background: '#f9d74e', color: '#0d1b2a', boxShadow: '0 4px 20px rgba(249,215,78,0.3)' }}
        >
          {tr.startBtn}
        </button>
      </div>

      <button onClick={openRules} className="text-sm opacity-35 hover:opacity-70 transition-opacity">
        {tr.rulesLink}
      </button>
    </div>
  )
}
