import { useGameStore } from '../../store/gameStore'
import { DECKS } from '../../data/decks'
import { TRANSLATIONS } from "../../data/translations"
import { DEFAULT_NAMES, PLAYER_COLORS } from '../../types/game'
import type { DeckId, BoardSize } from '../../types/game'
import type { Language } from '../../data/translations'
import { THEMES } from '../../data/themes'
import { useEffect, useRef, useState } from 'react'
import { supabase, fetchCustomDeckFull } from '../../services/supabase'

const SIZES: { id: BoardSize; labelKey: 'sizeLarge' | 'sizeMedium' | 'sizeSmall'; grid: string }[] = [
  { id: 'small',  labelKey: 'sizeSmall',  grid: '4×4' },
  { id: 'medium', labelKey: 'sizeMedium', grid: '6×6' },
  { id: 'large',  labelKey: 'sizeLarge',  grid: '8×8' },
]

const LANGUAGES: { id: Language; label: string; flag: string }[] = [
  { id: 'cs', label: 'Čeština',   flag: '🇨🇿' },
  { id: 'sk', label: 'Slovenčina', flag: '🇸🇰' },
  { id: 'en', label: 'English',   flag: '🇬🇧' },
]

type CustomDeckMeta = {
  id: string
  title: string
  thumbnail: string | null
}


export default function SetupScreen() {
  const {
    language, setLanguage,
    theme, toggleTheme,
    selectedDeckId, selectDeck,
    selectedSize, selectSize,
    numPlayers, setNumPlayers,
    playerNames, setPlayerName,
    startGame, openRules, goToLobby,
  } = useGameStore()

  const [customDecks, setCustomDecks] = useState<CustomDeckMeta[]>([])
  const deckScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = deckScrollRef.current
    if (!el) return
    const handler = (e: WheelEvent) => { e.preventDefault(); el.scrollLeft += e.deltaY }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  useEffect(() => {
    supabase
      .from('custom_decks')
      .select('id, title, status')
      .eq('status', 'approved')
      .eq('language', language)
      .then(({ data }) => {
        if (!data) return
        // Fetch first card thumbnail for each deck
        Promise.all(
          data.map(async (d: { id: string; title: string }) => {
            const { data: cards } = await supabase
              .from('custom_cards')
              .select('image_url')
              .eq('deck_id', d.id)
              .order('sort_order')
              .limit(1)
            return { id: d.id, title: d.title, thumbnail: cards?.[0]?.image_url ?? null }
          })
        ).then(setCustomDecks)
      })
  }, [language])

  async function handleSelectCustomDeck(meta: CustomDeckMeta) {
    const full = await fetchCustomDeckFull(meta.id)
    if (!full) return
    full.title = meta.title
    selectDeck(meta.id, full)
  }

  const tr = TRANSLATIONS[language]
  const tc = THEMES[theme]

  const inactiveBtn = { background: tc.btnInactiveBg, borderColor: tc.btnInactiveBorder, color: tc.btnInactiveText }
  const activeBtn   = { background: tc.accentGradient, borderColor: tc.accent, color: tc.accentText }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen px-4 pb-6 gap-4" style={{ paddingTop: 'max(5vh, 1.5rem)' }}>

      {/* Top-right controls */}
      <div className="fixed top-3 right-3 flex items-center gap-1.5 z-50">
        <div className="relative">
          <select
            value={language}
            onChange={e => setLanguage(e.target.value as Language)}
            className="rounded-lg border text-sm pl-2 pr-7 py-1.5 outline-none cursor-pointer appearance-none"
            style={{ background: tc.btnInactiveBg, borderColor: tc.btnInactiveBorder, color: tc.btnInactiveText }}
          >
            {LANGUAGES.map(lang => (
              <option key={lang.id} value={lang.id}>{lang.flag} {lang.id.toUpperCase()}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs opacity-50" style={{ color: tc.btnInactiveText }}>▾</span>
        </div>
        <button
          onClick={toggleTheme}
          className="w-8 h-8 flex items-center justify-center rounded-lg border text-sm transition-all"
          style={{ background: tc.btnInactiveBg, borderColor: tc.btnInactiveBorder }}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <img src={theme === 'light' ? '/logo-light.svg' : '/logo.svg'} alt="Pexedu logo" className="w-10 h-10" />
        <h1 className="text-3xl font-semibold tracking-tight lowercase relative -top-0.5" style={{ color: tc.textMuted }}>
          Pexedu
        </h1>
      </div>

      <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={{ background: tc.surface, border: `1px solid ${tc.surfaceBorder}` }}>
        {/* Deck */}
        <div>
          <div className="text-xs uppercase tracking-widest mb-3" style={{ color: tc.textMuted }}>{tr.deckLabel}</div>
          <div
            ref={deckScrollRef}
            className="deck-scroll flex gap-3 overflow-x-auto pb-2"
          >
            {DECKS.map(deck => (
              <button
                key={deck.id}
                onClick={() => selectDeck(deck.id as DeckId)}
                className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer flex-shrink-0"
                style={{ ...( selectedDeckId === deck.id ? activeBtn : inactiveBtn), width: 96 }}
              >
                <span className="text-3xl leading-none">{deck.icon}</span>
                <span className="text-xs">{tr.deckNames[deck.id as DeckId]}</span>
              </button>
            ))}
            {customDecks.map(cd => (
              <button
                key={cd.id}
                onClick={() => handleSelectCustomDeck(cd)}
                className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer overflow-hidden flex-shrink-0"
                style={{ ...(selectedDeckId === cd.id ? activeBtn : inactiveBtn), width: 96 }}
              >
                {cd.thumbnail ? (
                  <img src={cd.thumbnail} alt="" className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <span className="text-3xl leading-none">🃏</span>
                )}
                <span className="text-xs truncate w-full text-center">{cd.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Size */}
        <div>
          <div className="text-xs uppercase tracking-widest mb-3" style={{ color: tc.textMuted }}>{tr.sizeLabel}</div>
          <div className="flex gap-3">
            {SIZES.map(s => (
              <button
                key={s.id}
                onClick={() => selectSize(s.id)}
                className="flex-1 py-2.5 rounded-xl border-2 font-bold transition-all cursor-pointer"
                style={selectedSize === s.id ? activeBtn : inactiveBtn}
              >
                {s.grid}
                <div className="text-xs font-normal opacity-70">{tr[s.labelKey]}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Player count */}
        <div>
          <div className="text-xs uppercase tracking-widest mb-3" style={{ color: tc.textMuted }}>{tr.playersLabel}</div>
          <div className="flex gap-3">
            {[2, 3, 4, 5, 6].map(n => (
              <button
                key={n}
                onClick={() => setNumPlayers(n)}
                className="flex-1 py-2.5 rounded-xl border-2 text-xl font-bold transition-all cursor-pointer"
                style={numPlayers === n ? activeBtn : inactiveBtn}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Player names */}
        <div>
          <div className="text-xs uppercase tracking-widest mb-3" style={{ color: tc.textMuted }}>{tr.namesLabel}</div>
          <div className="flex flex-col gap-2">
            {Array.from({ length: numPlayers }, (_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: PLAYER_COLORS[i] }} />
                <input
                  className="flex-1 rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                  style={{ background: tc.inputBg, border: `1px solid ${tc.inputBorder}`, color: tc.text }}
                  value={playerNames[i]}
                  placeholder={DEFAULT_NAMES[i]}
                  maxLength={20}
                  onChange={e => setPlayerName(i, e.target.value)}
                  onFocus={e => e.target.style.borderColor = tc.accent}
                  onBlur={e => {
                    e.target.style.borderColor = tc.inputBorder
                    if (!playerNames[i].trim()) setPlayerName(i, DEFAULT_NAMES[i])
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={startGame}
            className="flex-1 py-3.5 rounded-xl text-base font-bold transition-all hover:-translate-y-0.5 cursor-pointer"
            style={{ background: tc.accentGradient, color: tc.accentText, boxShadow: `0 4px 20px ${tc.accentGlow}` }}
          >
            {tr.localBtn}
          </button>
          <button
            onClick={goToLobby}
            className="flex-1 py-3.5 rounded-xl text-base font-bold transition-all hover:-translate-y-0.5 cursor-pointer"
            style={{ background: tc.accentGradient, color: tc.accentText, boxShadow: `0 4px 20px ${tc.accentGlow}` }}
          >
            {tr.onlineBtn}
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-0.5 pb-2 pt-1">
        <button onClick={openRules} className="text-sm transition-opacity opacity-35 hover:opacity-70">
          {tr.rulesLink}
        </button>
        <p className="text-xs" style={{ color: tc.textFaint }}>
          © {new Date().getFullYear()} teamplayer.cz · v{__APP_VERSION__}
        </p>
      </div>
    </div>
  )
}
