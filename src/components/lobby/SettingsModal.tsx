import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../../store/gameStore'
import { THEMES } from '../../data/themes'
import { TRANSLATIONS } from '../../data/translations'
import { DECKS } from '../../data/decks'
import type { DeckId, BoardSize } from '../../types/game'
import { supabase, fetchCustomDeckFull } from '../../services/supabase'
import type { CustomDeckData } from '../../types/game'

type CustomDeckMeta = { id: string; title: string; thumbnail: string | null }

const SIZES: { id: BoardSize; labelKey: 'sizeLarge' | 'sizeMedium' | 'sizeSmall'; grid: string }[] = [
  { id: 'small', labelKey: 'sizeSmall', grid: '4×4' },
  { id: 'medium', labelKey: 'sizeMedium', grid: '6×6' },
  { id: 'large', labelKey: 'sizeLarge', grid: '8×8' },
]
const QUESTION_COUNTS = [5, 10, 15, 20, 0]
const TIME_LIMITS = [5, 10, 20, 30]
const TURN_TIME_OPTIONS = [0, 10, 20, 30, 60]
const QUIZ_TIME_OPTIONS = [3, 5, 10, 15]

export default function SettingsModal() {
  const theme                 = useGameStore(s => s.theme)
  const language              = useGameStore(s => s.language)
  const selectedDeckId        = useGameStore(s => s.selectedDeckId)
  const customDeck            = useGameStore(s => s.customDeck)
  const selectedSize          = useGameStore(s => s.selectedSize)
  const gameMode              = useGameStore(s => s.gameMode)
  const lightningQuestionCount = useGameStore(s => s.lightningQuestionCount)
  const lightningTimeLimit    = useGameStore(s => s.lightningTimeLimit)
  const turnTime              = useGameStore(s => s.turnTime)
  const quizTime              = useGameStore(s => s.quizTime)
  const closeSettingsModal    = useGameStore(s => s.closeSettingsModal)
  const applyNewSettings      = useGameStore(s => s.applyNewSettings)

  const tc = THEMES[theme]
  const tr = TRANSLATIONS[language]

  // Local state — initialized from current store values
  const [localMode, setLocalMode]             = useState(gameMode)
  const [localDeckId, setLocalDeckId]         = useState(selectedDeckId)
  const [localCustomDeck, setLocalCustomDeck] = useState<CustomDeckData | null>(customDeck)
  const [localSize, setLocalSize]             = useState(selectedSize)
  const [localCount, setLocalCount]           = useState(lightningQuestionCount)
  const [localTimeLimit, setLocalTimeLimit]   = useState(lightningTimeLimit)
  const [localTurnTime, setLocalTurnTime]     = useState(turnTime)
  const [localQuizTime, setLocalQuizTime]     = useState(quizTime)
  const [customDecks, setCustomDecks]         = useState<CustomDeckMeta[]>([])

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

  const handleSelectCustomDeck = async (meta: CustomDeckMeta) => {
    const full = await fetchCustomDeckFull(meta.id)
    if (!full) return
    full.title = meta.title
    setLocalDeckId(meta.id)
    setLocalCustomDeck(full)
  }

  const handleSave = () => {
    applyNewSettings({
      deckId: localDeckId,
      customDeck: localCustomDeck,
      gameMode: localMode,
      size: localSize,
      lightningQuestionCount: localCount,
      lightningTimeLimit: localTimeLimit,
      turnTime: localTurnTime,
      quizTime: localQuizTime,
    })
  }

  const inactiveBtn = { background: tc.btnInactiveBg, borderColor: tc.btnInactiveBorder, color: tc.btnInactiveText }
  const activeBtn   = { background: tc.accentGradient, borderColor: tc.accent, color: tc.accentText }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: tc.overlayBg }}>
      <div
        className="w-full max-w-md rounded-2xl p-6 space-y-5 overflow-y-auto"
        style={{ background: tc.surface, border: `1px solid ${tc.surfaceBorder}`, maxHeight: '90vh' }}
      >
        <div className="text-base font-bold" style={{ color: tc.text }}>{tr.settingsModalTitle}</div>

        {/* Game Mode */}
        <div>
          <div className="text-xs uppercase tracking-widest mb-3" style={{ color: tc.textMuted }}>{tr.gameModeLabel}</div>
          <div className="flex gap-3">
            {([['pexequiz', '🃏', tr.modePexeQuiz], ['lightning', '🔥', tr.modeLightning]] as const).map(([mode, icon, label]) => (
              <button
                key={mode}
                onClick={() => setLocalMode(mode)}
                className="flex-1 py-2.5 rounded-xl border-2 font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                style={localMode === mode ? activeBtn : inactiveBtn}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Deck */}
        <div>
          <div className="text-xs uppercase tracking-widest mb-3" style={{ color: tc.textMuted }}>{tr.deckLabel}</div>
          <div className="relative">
            <div ref={deckScrollRef} className="deck-scroll flex gap-3 overflow-x-scroll pb-3">
              {DECKS.map(deck => (
                <button
                  key={deck.id}
                  onClick={() => { setLocalDeckId(deck.id); setLocalCustomDeck(null) }}
                  className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer flex-shrink-0"
                  style={{ ...(localDeckId === deck.id ? activeBtn : inactiveBtn), width: 96 }}
                >
                  <span className="text-3xl leading-none">{deck.icon}</span>
                  <div className="flex items-center justify-center w-full text-center text-xs leading-tight" style={{ minHeight: '2.5em' }}>
                    {tr.deckNames[deck.id as DeckId]}
                  </div>
                </button>
              ))}
              {customDecks.map(cd => (
                <button
                  key={cd.id}
                  onClick={() => handleSelectCustomDeck(cd)}
                  className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer overflow-hidden flex-shrink-0"
                  style={{ ...(localDeckId === cd.id ? activeBtn : inactiveBtn), width: 96 }}
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

        {/* Mode-specific settings */}
        {localMode === 'pexequiz' ? (
          <>
            {/* Board size */}
            <div>
              <div className="text-xs uppercase tracking-widest mb-3" style={{ color: tc.textMuted }}>{tr.sizeLabel}</div>
              <div className="flex gap-3">
                {SIZES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setLocalSize(s.id)}
                    className="flex-1 py-2.5 rounded-xl border-2 font-bold transition-all cursor-pointer"
                    style={localSize === s.id ? activeBtn : inactiveBtn}
                  >
                    {s.grid}
                    <div className="text-xs font-normal opacity-70">{tr[s.labelKey]}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Turn time */}
            <div>
              <div className="text-xs uppercase tracking-widest mb-1.5" style={{ color: tc.textMuted }}>{tr.turnTimeLabel}</div>
              <div className="flex gap-1.5 flex-wrap">
                {TURN_TIME_OPTIONS.map(t => (
                  <button
                    key={t}
                    onClick={() => setLocalTurnTime(t)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                    style={localTurnTime === t
                      ? { background: tc.accentBgActive, border: `1.5px solid ${tc.accentBorderActive}`, color: tc.accent }
                      : { background: tc.inputBg, border: `1.5px solid ${tc.inputBorder}`, color: tc.textDim }
                    }
                  >
                    {t === 0 ? tr.turnTimeOff : `${t}s`}
                  </button>
                ))}
              </div>
            </div>

            {/* Quiz time */}
            <div>
              <div className="text-xs uppercase tracking-widest mb-1.5" style={{ color: tc.textMuted }}>{tr.quizTimeLabel}</div>
              <div className="flex gap-1.5 flex-wrap">
                {QUIZ_TIME_OPTIONS.map(t => (
                  <button
                    key={t}
                    onClick={() => setLocalQuizTime(t)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                    style={localQuizTime === t
                      ? { background: tc.accentBgActive, border: `1.5px solid ${tc.accentBorderActive}`, color: tc.accent }
                      : { background: tc.inputBg, border: `1.5px solid ${tc.inputBorder}`, color: tc.textDim }
                    }
                  >
                    {t}s
                  </button>
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
                    onClick={() => setLocalCount(n)}
                    className="flex-1 py-2.5 rounded-xl border-2 font-bold transition-all cursor-pointer text-sm"
                    style={localCount === n ? activeBtn : inactiveBtn}
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
                    onClick={() => setLocalTimeLimit(t)}
                    className="flex-1 py-2.5 rounded-xl border-2 font-bold transition-all cursor-pointer"
                    style={localTimeLimit === t ? activeBtn : inactiveBtn}
                  >
                    {t}s
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* CTA buttons */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={closeSettingsModal}
            className="flex-1 py-3 rounded-xl border-2 font-bold transition-all cursor-pointer"
            style={inactiveBtn}
          >
            {tr.cancelBtn}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl font-bold transition-all hover:opacity-90 cursor-pointer"
            style={{ background: tc.accentGradient, color: tc.accentText, boxShadow: `0 4px 20px ${tc.accentGlow}` }}
          >
            {tr.saveAndGoToLobby}
          </button>
        </div>
      </div>
    </div>
  )
}
