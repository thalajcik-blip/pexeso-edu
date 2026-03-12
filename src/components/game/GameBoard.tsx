import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../../store/gameStore'
import { TRANSLATIONS } from '../../data/translations'
import { SIZE_CONFIG } from '../../types/game'
import { THEMES } from '../../data/themes'
import { isMuted, toggleMuted } from '../../services/audioService'
import GameCard from './GameCard'
import ScoreBoard from './ScoreBoard'

const EMOJI_OPTS = ['👍', '😱', '🎉', '😂', '🔥', '😅']

export default function GameBoard() {
  const cards = useGameStore(s => s.cards)
  const selectedSize = useGameStore(s => s.selectedSize)
  const language = useGameStore(s => s.language)
  const theme = useGameStore(s => s.theme)
  const resetToSetup = useGameStore(s => s.resetToSetup)
  const toggleTheme = useGameStore(s => s.toggleTheme)
  const openRules = useGameStore(s => s.openRules)
  const debugEndGame = useGameStore(s => s.debugEndGame)
  const isOnline = useGameStore(s => s.isOnline)
  const phase = useGameStore(s => s.phase)
  const sendEmojiReact = useGameStore(s => s.sendEmojiReact)
  const tr = TRANSLATIONS[language]
  const tc = THEMES[theme]
  const cols = SIZE_CONFIG[selectedSize].cols
  const [muted, setMuted] = useState(isMuted)
  const [menuOpen, setMenuOpen] = useState(false)
  const [emojiCooldown, setEmojiCooldown] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <div className="px-4 pt-3 pb-4">

      {/* Settings button — fixed top-right */}
      <div ref={menuRef} className="fixed top-3 right-3 z-30">
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="w-8 h-8 flex items-center justify-center rounded-full text-base transition-opacity"
          style={{ background: tc.scorePillBg, opacity: menuOpen ? 1 : 0.5 }}
        >
          ⚙️
        </button>

        {menuOpen && (
          <div
            className="absolute top-10 right-0 rounded-xl py-1 min-w-[180px] shadow-xl"
            style={{ background: tc.modalSurface, border: `1px solid ${tc.surfaceBorder}` }}
          >
            {[
              { icon: '↺', label: tr.newGame, onClick: () => { resetToSetup(); setMenuOpen(false) } },
              { icon: theme === 'dark' ? '☀️' : '🌙', label: theme === 'dark' ? tr.lightMode : tr.darkMode, onClick: () => { toggleTheme(); setMenuOpen(false) } },
              { icon: muted ? '🔇' : '🔊', label: muted ? tr.soundOn : tr.soundOff, onClick: () => { setMuted(toggleMuted()); setMenuOpen(false) } },
            ].map(({ icon, label, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className="w-full flex items-center px-4 py-2.5 text-sm transition-opacity hover:opacity-70"
                style={{ color: tc.text }}
              >
                <span className="inline-block w-6 shrink-0">{icon}</span>
                {label}
              </button>
            ))}
            {import.meta.env.DEV && (
              <button
                onClick={() => { debugEndGame(); setMenuOpen(false) }}
                className="w-full flex items-center px-4 py-2.5 text-sm"
                style={{ color: 'rgba(255,100,100,0.8)' }}
              >
                <span className="inline-block w-6 shrink-0">⚡</span>Debug
              </button>
            )}
          </div>
        )}
      </div>

      <ScoreBoard />

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

      {/* Emoji reactions — online only, below grid for easier mobile reach */}
      {isOnline && (phase === 'playing' || phase === 'quiz') && (
        <div className="flex justify-center gap-2 pt-3">
          {EMOJI_OPTS.map(e => (
            <button
              key={e}
              onClick={() => {
                if (emojiCooldown) return
                setEmojiCooldown(true)
                sendEmojiReact(e)
                setTimeout(() => setEmojiCooldown(false), 2000)
              }}
              className="text-xl leading-none px-2 py-1.5 rounded-xl transition-opacity"
              style={{ background: tc.scorePillBg, opacity: emojiCooldown ? 0.4 : 1 }}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col items-center gap-0.5 py-3">
        <button onClick={openRules} className="text-sm transition-opacity opacity-50 hover:opacity-70">
          {tr.rulesLink}
        </button>
        <p className="text-xs" style={{ color: tc.textFaint }}>
          © {new Date().getFullYear()} teamplayer.cz · v{__APP_VERSION__}
        </p>
      </div>
    </div>
  )
}
