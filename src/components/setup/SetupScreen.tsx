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

const LANGUAGES: { id: Language; label: string; flag: string; code: string }[] = [
  { id: 'cs', label: 'Čeština',   flag: '🇨🇿', code: 'CZ' },
  { id: 'sk', label: 'Slovenčina', flag: '🇸🇰', code: 'SK' },
  { id: 'en', label: 'English',   flag: '🇬🇧', code: 'EN' },
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
  const [langDropdownOpen, setLangDropdownOpen] = useState(false)
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

      {/* Header row: logo centered, controls top-right */}
      <div className="w-full grid items-start px-2" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
        <div />
        <div className="flex items-center gap-2">
          <img src={theme === 'light' ? '/logo-light.svg' : '/logo.svg'} alt="Pexedu logo" className="w-10 h-10" />
          <h1 className="text-3xl font-semibold tracking-tight lowercase relative -top-0.5" style={{ color: tc.textMuted }}>
            Pexedu
          </h1>
        </div>
        <div className="flex items-center gap-1.5 justify-end -translate-y-6">
          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-lg border text-sm transition-all"
            style={{ background: tc.btnInactiveBg, borderColor: tc.btnInactiveBorder }}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <div className="relative">
            {/* Custom dropdown: mobile = flag only trigger, desktop = flag + code trigger; both show flag + label in options */}
            <button
              onClick={() => setLangDropdownOpen(o => !o)}
              className="flex items-center gap-1 rounded-lg border text-sm px-2 py-1.5 cursor-pointer"
              style={{ background: tc.btnInactiveBg, borderColor: tc.btnInactiveBorder, color: tc.btnInactiveText }}
            >
              <span>{LANGUAGES.find(l => l.id === language)?.flag}</span>
              <span className="hidden sm:inline">{LANGUAGES.find(l => l.id === language)?.code}</span>
              <span className="text-xs opacity-50">▾</span>
            </button>
            {langDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setLangDropdownOpen(false)} />
                <div
                  className="absolute right-0 top-full mt-1 z-20 rounded-lg border shadow-lg overflow-hidden"
                  style={{ background: tc.bg, borderColor: tc.btnInactiveBorder }}
                >
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.id}
                      onClick={() => { setLanguage(lang.id); setLangDropdownOpen(false) }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left whitespace-nowrap"
                      style={{
                        color: lang.id === language ? tc.accent : tc.btnInactiveText,
                        background: lang.id === language ? 'rgba(128,128,128,0.15)' : 'transparent',
                      }}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={{ background: tc.surface, border: `1px solid ${tc.surfaceBorder}` }}>
        {/* Deck */}
        <div>
          <div className="text-xs uppercase tracking-widest mb-3" style={{ color: tc.textMuted }}>{tr.deckLabel}</div>
          <div className="relative">
            <div
              ref={deckScrollRef}
              className="deck-scroll flex gap-3 overflow-x-scroll pb-3"
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
                <span className="text-xs line-clamp-2 w-full text-center leading-tight">{cd.title}</span>
              </button>
            ))}
            </div>
            {/* Fade hint — indicates more content to scroll */}
            <div
              className="absolute right-0 top-0 bottom-3 w-10 pointer-events-none"
              style={{ background: `linear-gradient(to right, transparent, ${tc.surface})` }}
            />
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
