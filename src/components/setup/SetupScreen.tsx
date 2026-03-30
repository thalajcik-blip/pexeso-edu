import { useGameStore } from '../../store/gameStore'
import { DECKS } from '../../data/decks'
import { TRANSLATIONS } from "../../data/translations"
import { DEFAULT_NAMES } from '../../types/game'
import { Avatar } from '../auth/Avatar'
import type { DeckId, BoardSize } from '../../types/game'
import type { Language } from '../../data/translations'
import { THEMES } from '../../data/themes'
import { useEffect, useRef, useState } from 'react'
import { supabase, fetchCustomDeckFull } from '../../services/supabase'
import { useAuthStore } from '../../store/authStore'
import TermsModal from '../modals/TermsModal'
import PrivacyModal from '../modals/PrivacyModal'
import { buildChallengeBanner } from '../../services/shareService'
import { AssignedDecksBanner } from '../student/AssignedDecksBanner'

const SIZES: { id: BoardSize; labelKey: 'sizeLarge' | 'sizeMedium' | 'sizeSmall'; grid: string }[] = [
  { id: 'small',  labelKey: 'sizeSmall',  grid: '4×4' },
  { id: 'medium', labelKey: 'sizeMedium', grid: '6×6' },
  { id: 'large',  labelKey: 'sizeLarge',  grid: '8×8' },
]

const QUESTION_COUNTS = [5, 10, 15, 20, 0] // 0 = all
const TIME_LIMITS = [5, 10, 20, 30] // seconds

const LANGUAGES: { id: Language; label: string; flag: string; code: string }[] = [
  { id: 'cs', label: 'Čeština',   flag: '🇨🇿', code: 'CZ' },
  { id: 'sk', label: 'Slovenčina', flag: '🇸🇰', code: 'SK' },
  { id: 'en', label: 'English',   flag: '🇬🇧', code: 'EN' },
]

type CustomDeckMeta = {
  id: string
  title: string
  thumbnail: string | null
  supported_modes: string[]
  deck_type: 'image' | 'audio'
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
    gameMode, setGameMode,
    lightningQuestionCount, setLightningQuestionCount,
    lightningTimeLimit, setLightningTimeLimit,
    startLightningGame,
    challengeScore, challengeTime, challengeFrom,
  } = useGameStore()

  const [customDecks, setCustomDecks] = useState<CustomDeckMeta[]>([])
  const [langDropdownOpen, setLangDropdownOpen] = useState(false)
  const langBtnRef = useRef<HTMLButtonElement>(null)
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
      .select('id, title, status, supported_modes, thumbnail_url, deck_type')
      .eq('status', 'approved')
      .eq('language', language)
      .then(({ data }) => {
        if (!data) return
        // Use thumbnail_url if set; fallback to first card image only for image decks without thumbnail
        Promise.all(
          data.map(async (d: { id: string; title: string; supported_modes: string[] | null; thumbnail_url: string | null; deck_type?: string }) => {
            const deckType: 'image' | 'audio' = d.deck_type === 'audio' ? 'audio' : 'image'
            if (deckType === 'audio') {
              return {
                id: d.id,
                title: d.title,
                thumbnail: d.thumbnail_url ?? null,
                supported_modes: ['lightning'],
                deck_type: deckType,
              }
            }
            if (d.thumbnail_url) {
              return {
                id: d.id,
                title: d.title,
                thumbnail: d.thumbnail_url,
                supported_modes: d.supported_modes ?? ['pexequiz', 'lightning'],
                deck_type: deckType,
              }
            }
            const { data: cards } = await supabase
              .from('custom_cards')
              .select('image_url')
              .eq('deck_id', d.id)
              .order('sort_order')
              .limit(1)
            return {
              id: d.id,
              title: d.title,
              thumbnail: cards?.[0]?.image_url ?? null,
              supported_modes: d.supported_modes ?? ['pexequiz', 'lightning'],
              deck_type: deckType,
            }
          })
        ).then(setCustomDecks)
      })
  }, [language])

  async function handleSelectCustomDeck(meta: CustomDeckMeta) {
    const full = await fetchCustomDeckFull(meta.id)
    if (!full) return
    full.title = meta.title
    selectDeck(meta.id, full)
    // Audio deck → force lightning mode
    if (meta.deck_type === 'audio' && gameMode === 'pexequiz') setGameMode('lightning')
  }

  const tr = TRANSLATIONS[language]
  const tc = THEMES[theme]

  const selectedCustomMeta = customDecks.find(cd => cd.id === selectedDeckId)
  const isAudioDeck = selectedCustomMeta?.deck_type === 'audio'

  const { profile, openAuthModal, signOut, openSettingsModal, openDashboardModal } = useAuthStore()
  const isTeacher    = profile?.roles?.some(r => r === 'teacher' || r === 'superadmin') ?? false
  const isSuperadmin = profile?.roles?.includes('superadmin') ?? false
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [termsOpen, setTermsOpen]   = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)

  const inactiveBtn = { background: tc.btnInactiveBg, borderColor: tc.btnInactiveBorder, color: tc.btnInactiveText }
  const activeBtn   = { background: tc.accentGradient, borderColor: tc.accent, color: tc.accentText }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen px-4 pb-6 gap-4" style={{ paddingTop: 'max(5vh, 1.5rem)' }}>

      {/* Header row: left = lang + theme, center = logo, right = sign in */}
      <div className="w-full grid items-start px-2 relative z-10" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
        {/* Left: lang picker + theme toggle */}
        <div className="flex items-center gap-1.5 -translate-y-6">
          <div className="relative">
            <button
              ref={langBtnRef}
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
                <div className="fixed inset-0 z-40" onClick={() => setLangDropdownOpen(false)} />
                <div
                  className="absolute left-0 top-full mt-1 z-50 rounded-lg border shadow-lg overflow-hidden"
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
          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-lg border text-sm transition-all"
            style={{ background: tc.btnInactiveBg, borderColor: tc.btnInactiveBorder }}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Center: logo */}
        <div className="flex items-center gap-2">
          <img src={theme === 'light' ? '/logo-light.svg' : '/logo.svg'} alt="Pexedu logo" className="w-10 h-10" />
          <h1 className="text-3xl font-semibold tracking-tight lowercase relative -top-0.5" style={{ color: tc.textMuted }}>
            Pexedu
          </h1>
        </div>

        {/* Right: sign in / profile dropdown */}
        <div className="flex items-center justify-end -translate-y-6">
          {profile ? (
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(o => !o)}
                className="flex items-center gap-1 rounded-lg border text-xs px-2 py-1.5 transition-opacity hover:opacity-80 max-w-28"
                style={{ background: tc.btnInactiveBg, borderColor: tc.btnInactiveBorder, color: tc.textMuted }}
              >
                <Avatar avatarId={profile.avatar_id ?? 0} size={18} className="rounded-full flex-shrink-0" />
                <span className="truncate max-w-16">{profile.username}</span>
                <span className="opacity-50 text-xs">▾</span>
              </button>
              {profileDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileDropdownOpen(false)} />
                  <div
                    className="absolute right-0 top-full mt-1 z-50 rounded-lg border shadow-lg overflow-hidden min-w-32"
                    style={{ background: tc.bg, borderColor: tc.btnInactiveBorder }}
                  >
                    <button
                      onClick={() => { setProfileDropdownOpen(false); openDashboardModal() }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left whitespace-nowrap hover:opacity-80"
                      style={{ color: tc.text }}
                    >
                      📊 {tr.dashboard}
                    </button>
                    <button
                      onClick={() => { setProfileDropdownOpen(false); openSettingsModal() }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left whitespace-nowrap hover:opacity-80"
                      style={{ color: tc.text }}
                    >
                      👤 {tr.settings}
                    </button>
                    {isTeacher && (
                      <button
                        onClick={() => { setProfileDropdownOpen(false); window.location.href = '/teacher' }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left whitespace-nowrap hover:opacity-80"
                        style={{ color: tc.text }}
                      >
                        🏫 {language === 'sk' ? 'Učiteľský dashboard' : language === 'en' ? 'Teacher dashboard' : 'Učitelský dashboard'}
                      </button>
                    )}
                    {isSuperadmin && (
                      <button
                        onClick={() => { setProfileDropdownOpen(false); localStorage.setItem('pexedu_last_context', 'admin'); window.location.href = '/admin' }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left whitespace-nowrap hover:opacity-80"
                        style={{ color: tc.text }}
                      >
                        ⚙️ Administrace
                      </button>
                    )}
                    <button
                      onClick={() => { setProfileDropdownOpen(false); signOut() }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left whitespace-nowrap hover:opacity-80"
                      style={{ color: tc.textMuted }}
                    >
                      ← {tr.signOut}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={openAuthModal}
              className="flex items-center gap-1 rounded-lg border text-xs px-2 py-1.5 transition-opacity hover:opacity-80"
              style={{ background: tc.btnInactiveBg, borderColor: tc.btnInactiveBorder, color: tc.textMuted }}
            >
              {tr.signIn}
            </button>
          )}
        </div>
      </div>

      {/* Challenge banner */}
      {challengeScore !== null && (
        <div
          className="w-full max-w-md rounded-2xl px-4 py-3 text-sm font-medium text-center"
          style={{
            background: theme === 'dark' ? 'rgba(249,215,78,0.1)' : 'rgba(249,215,78,0.2)',
            border: '1.5px solid rgba(249,215,78,0.5)',
            color: theme === 'dark' ? '#f9d74e' : '#92600a',
          }}
        >
          {buildChallengeBanner(challengeScore, language, challengeFrom ?? undefined, challengeTime ?? undefined)}
        </div>
      )}

      <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={{ background: tc.surface, border: `1px solid ${tc.surfaceBorder}` }}>

        {/* 1. Game Mode */}
        <div>
          <div className="text-xs uppercase tracking-widest mb-3" style={{ color: tc.textMuted }}>{tr.gameModeLabel}</div>
          <div className="flex gap-3">
            {([['pexequiz', '🃏', tr.modePexeQuiz], ['lightning', '🔥', tr.modeLightning]] as const).map(([mode, icon, label]) => {
              const disabled = mode === 'pexequiz' && isAudioDeck
              return (
                <button
                  key={mode}
                  onClick={() => !disabled && setGameMode(mode)}
                  disabled={disabled}
                  className="flex-1 py-2.5 rounded-xl border-2 font-bold transition-all flex items-center justify-center gap-2"
                  style={disabled ? { ...inactiveBtn, opacity: 0.35, cursor: 'not-allowed' } : gameMode === mode ? activeBtn : { ...inactiveBtn, cursor: 'pointer' }}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {profile && <AssignedDecksBanner />}

        {/* 2. Deck */}
        <div>
          <div className="text-xs uppercase tracking-widest mb-3" style={{ color: tc.textMuted }}>{tr.deckLabel}</div>
          <div className="relative">
            <div ref={deckScrollRef} className="deck-scroll flex gap-3 overflow-x-scroll pb-3">
              {DECKS.map(deck => (
                <button
                  key={deck.id}
                  onClick={() => selectDeck(deck.id as DeckId)}
                  className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer flex-shrink-0"
                  style={{ ...(selectedDeckId === deck.id ? activeBtn : inactiveBtn), width: 96 }}
                >
                  <span className="text-3xl leading-none">{deck.icon}</span>
                  <div className="flex items-center justify-center w-full text-center text-xs leading-tight" style={{ minHeight: '2.5em' }}>
                    {tr.deckNames[deck.id as DeckId]}
                  </div>
                </button>
              ))}
              {customDecks.filter(cd => cd.supported_modes.includes(gameMode)).map(cd => (
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
                  <div className="flex items-center justify-center w-full text-center text-xs leading-tight line-clamp-2" style={{ minHeight: '2.5em' }}>
                    {cd.title}
                  </div>
                </button>
              ))}
            </div>
            <div className="absolute right-0 top-0 bottom-3 w-10 pointer-events-none" style={{ background: `linear-gradient(to right, transparent, ${tc.surface})` }} />
          </div>
        </div>

        {/* 3. Settings — conditional on mode */}
        {gameMode === 'pexequiz' ? (
          <>
            {/* Board size */}
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
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5, 6].map(n => (
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
                    <Avatar avatarId={i === 0 && profile?.avatar_id != null ? profile.avatar_id : i} size={24} className="rounded-full flex-shrink-0" />
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
          </>
        ) : (
          <>
            {/* Question count */}
            <div>
              <div className="text-xs uppercase tracking-widest mb-3" style={{ color: tc.textMuted }}>{tr.questionCountLabel}</div>
              <div className="flex gap-1.5">
                {QUESTION_COUNTS.map(n => (
                  <button
                    key={n}
                    onClick={() => setLightningQuestionCount(n)}
                    className="flex-1 py-2.5 rounded-xl border-2 font-bold transition-all cursor-pointer text-sm"
                    style={lightningQuestionCount === n ? activeBtn : inactiveBtn}
                  >
                    {n === 0 ? tr.questionCountAll : n}
                  </button>
                ))}
              </div>
            </div>

            {/* Time limit */}
            <div>
              <div className="text-xs uppercase tracking-widest mb-3" style={{ color: tc.textMuted }}>{tr.timeLimitLabel}</div>
              <div className="flex gap-3">
                {TIME_LIMITS.map(t => (
                  <button
                    key={t}
                    onClick={() => setLightningTimeLimit(t)}
                    className="flex-1 py-2.5 rounded-xl border-2 font-bold transition-all cursor-pointer"
                    style={lightningTimeLimit === t ? activeBtn : inactiveBtn}
                  >
                    {t}s
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* CTA buttons */}
        <div className="flex gap-3">
          {gameMode === 'pexequiz' ? (
            <>
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
            </>
          ) : (
            <>
              <button
                onClick={startLightningGame}
                className="flex-1 py-3.5 rounded-xl text-base font-bold transition-all hover:-translate-y-0.5 cursor-pointer"
                style={{ background: tc.accentGradient, color: tc.accentText, boxShadow: `0 4px 20px ${tc.accentGlow}` }}
              >
                {tr.soloQuizBtn}
              </button>
              <button
                onClick={goToLobby}
                className="flex-1 py-3.5 rounded-xl text-base font-bold transition-all hover:-translate-y-0.5 cursor-pointer"
                style={{ background: tc.accentGradient, color: tc.accentText, boxShadow: `0 4px 20px ${tc.accentGlow}` }}
              >
                {tr.onlineBtn}
              </button>
            </>
          )}
        </div>

      </div>

      <div className="flex flex-col items-center gap-1 pb-2 pt-1">
        <div className="flex flex-wrap justify-center items-center gap-x-2 gap-y-1 text-xs" style={{ color: tc.textFaint }}>
          <button onClick={openRules} className="transition-opacity opacity-60 hover:opacity-90">
            {tr.rulesLink}
          </button>
          <span className="opacity-40">·</span>
          <a href="/leaderboard" className="transition-opacity opacity-60 hover:opacity-90">
            {tr.leaderboardLink}
          </a>
          <span className="opacity-40">·</span>
          <button onClick={() => setTermsOpen(true)} className="transition-opacity opacity-60 hover:opacity-90">
            {tr.termsLink}
          </button>
          <span className="opacity-40">·</span>
          <button onClick={() => setPrivacyOpen(true)} className="transition-opacity opacity-60 hover:opacity-90">
            {tr.privacyLink}
          </button>
          <span className="opacity-40">·</span>
          <span className="opacity-40">© {new Date().getFullYear()} teamplayer.cz · v{__APP_VERSION__}</span>
        </div>
      </div>

      {termsOpen && <TermsModal onClose={() => setTermsOpen(false)} />}
      {privacyOpen && <PrivacyModal onClose={() => setPrivacyOpen(false)} />}
    </div>
  )
}
