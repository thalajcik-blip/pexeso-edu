import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { TRANSLATIONS } from '../../data/translations'
import { SIZE_CONFIG } from '../../types/game'
import { THEMES } from '../../data/themes'
import { isMuted, toggleMuted } from '../../services/audioService'
import GameCard from './GameCard'
import ScoreBoard from './ScoreBoard'

export default function GameBoard() {
  const cards = useGameStore(s => s.cards)
  const selectedSize = useGameStore(s => s.selectedSize)
  const language = useGameStore(s => s.language)
  const theme = useGameStore(s => s.theme)
  const resetToSetup = useGameStore(s => s.resetToSetup)
  const toggleTheme = useGameStore(s => s.toggleTheme)
  const openRules = useGameStore(s => s.openRules)
  const debugEndGame = useGameStore(s => s.debugEndGame)
  const tr = TRANSLATIONS[language]
  const tc = THEMES[theme]
  const cols = SIZE_CONFIG[selectedSize].cols
  const [muted, setMuted] = useState(isMuted)

  return (
    <div className="px-4 pt-3 pb-4">
      <ScoreBoard />

      <div className="flex justify-center items-center gap-4 mb-1.5">
        <button
          onClick={resetToSetup}
          className="text-xs px-3 py-1 rounded-md transition-colors"
          style={{ background: tc.newGameBg, border: `1px solid ${tc.newGameBorder}`, color: tc.newGameText }}
        >
          {tr.newGame}
        </button>
        <button
          onClick={toggleTheme}
          className="text-xs px-2 py-1 rounded-md transition-colors"
          style={{ background: tc.newGameBg, border: `1px solid ${tc.newGameBorder}`, color: tc.newGameText }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button
          onClick={() => setMuted(toggleMuted())}
          className="text-xs px-2 py-1 rounded-md transition-colors"
          style={{ background: tc.newGameBg, border: `1px solid ${tc.newGameBorder}`, color: tc.newGameText }}
        >
          {muted ? '🔇' : '🔊'}
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

      <div className="rounded-xl py-2 px-1" style={{ background: tc.cardGridBg, overflow: 'clip' }}>
        <div
          className="grid w-full mx-auto"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: 'clamp(2px, 0.5vw, 4px)',
            maxWidth: 'min(95vw, 600px, calc(100dvh - 220px))',
          }}
        >
          {cards.map(card => (
            <GameCard key={card.id} card={card} />
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-0.5 py-3">
        <button onClick={openRules} className="text-sm transition-opacity opacity-35 hover:opacity-70">
          {tr.rulesLink}
        </button>
        <p className="text-xs" style={{ color: tc.textFaint }}>
          © {new Date().getFullYear()} teamplayer.cz
        </p>
      </div>
    </div>
  )
}
