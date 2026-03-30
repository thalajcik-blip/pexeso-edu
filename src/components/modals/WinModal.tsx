import { useEffect, useMemo, useRef, useState } from 'react'
import { ScoreGauge } from '../ScoreGauge'
import confetti from 'canvas-confetti'
import { useGameStore } from '../../store/gameStore'
import { useAuthStore } from '../../store/authStore'
import { saveGameResult } from '../../services/gameService'
import { DECKS } from '../../data/decks'
import { TRANSLATIONS, pluralize } from '../../data/translations'
import { THEMES } from '../../data/themes'
import { trunc } from '../../utils'
import { Avatar } from '../auth/Avatar'
import { shareResult } from '../../services/shareService'

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣']

// ── Tier data ──────────────────────────────────────────────────────────────
type Tier = { icon: string; title: Record<string, string>; messages: Record<string, string[]> }

const PEXE_TIERS: Tier[] = [
  {
    icon: '🧠',
    title: { cs: 'Génius!', sk: 'Génius!', en: 'Genius!' },
    messages: {
      cs: ['Perfektní paměť i znalosti — to je kombinace!', 'Na 100 % správně! Mozek pracuje naplno.', 'Bezchybný výkon. Tebe se nic nevyhne!'],
      sk: ['Perfektná pamäť aj znalosti — to je kombinácia!', 'Na 100 % správne! Mozog pracuje naplno.', 'Bezchybný výkon. Teba sa nič nevyhne!'],
      en: ['Perfect memory and knowledge — what a combo!', '100% correct! Brain firing on all cylinders.', 'Flawless performance. Nothing gets past you!'],
    },
  },
  {
    icon: '🔥',
    title: { cs: 'Výborně!', sk: 'Výborne!', en: 'Excellent!' },
    messages: {
      cs: ['Skoro dokonalý! Jen kousek od maxima.', 'Skvělá paměť i znalosti — gratulujeme!', 'Téměř perfektní. Příště to dotáhneš!'],
      sk: ['Skoro dokonalý! Len kúsok od maxima.', 'Skvelá pamäť aj znalosti — gratulujeme!', 'Takmer perfektný. Nabudúce to dotiahneš!'],
      en: ['Almost perfect! Just a step from the top.', 'Great memory and knowledge — well done!', 'Nearly perfect. You\'ll get there next time!'],
    },
  },
  {
    icon: '⭐',
    title: { cs: 'Skvělé!', sk: 'Skvelé!', en: 'Great!' },
    messages: {
      cs: ['Dobrá práce! Mozek se zahřívá.', 'Tři čtvrtiny na výbornou — příště víc!', 'Solid výkon, paměť i kvíz šly dobře.'],
      sk: ['Dobrá práca! Mozog sa zahrieva.', 'Tri štvrtiny na výbornú — nabudúce viac!', 'Solid výkon, pamäť aj kvíz išli dobre.'],
      en: ['Good work! Brain warming up.', 'Three quarters excellent — more next time!', 'Solid performance, memory and quiz both good.'],
    },
  },
  {
    icon: '💪',
    title: { cs: 'Dobrý pokus!', sk: 'Dobrý pokus!', en: 'Good try!' },
    messages: {
      cs: ['Půlka tam — procvič a příště to zlomíš!', 'Rozehřívačka se povedla, příště víc!', 'Mozek se zahřívá. Zkus to znovu!'],
      sk: ['Polovica tam — precvič a nabudúce to zlomíš!', 'Rozcvička sa podarila, nabudúce viac!', 'Mozog sa zahrieva. Skús to znovu!'],
      en: ['Halfway there — practice and break through next time!', 'Good warm-up, go for more next time!', 'Brain warming up. Try again!'],
    },
  },
  {
    icon: '📚',
    title: { cs: 'Nevzdávej to!', sk: 'Nevzdávaj to!', en: "Don't give up!" },
    messages: {
      cs: ['Tohle téma chce trochu procvičit — dáš to!', 'Každý pokus tě posouvá blíž k cíli.', 'Zkus to znovu, mozek potřebuje čas!'],
      sk: ['Táto téma chce trochu precvičiť — dáš to!', 'Každý pokus ťa posúva bližšie k cieľu.', 'Skús to znovu, mozog potrebuje čas!'],
      en: ['This topic needs a bit more practice — you got this!', 'Every attempt gets you closer to the goal.', 'Try again, the brain needs time!'],
    },
  },
  {
    icon: '🚀',
    title: { cs: 'Výzva přijata!', sk: 'Výzva prijatá!', en: 'Challenge accepted!' },
    messages: {
      cs: ['Každý šampion začínal od nuly. Zkus to znovu!', 'Mozek se právě něco naučil. To se počítá!', 'Tuhle sadu ještě dobydneš, jen tak nevzdávej!'],
      sk: ['Každý šampión začínal od nuly. Skús to znovu!', 'Mozog sa práve niečo naučil. To sa počíta!', 'Túto sadu ešte dobydieš, tak nevzdávaj!'],
      en: ['Every champion started from zero. Try again!', 'Your brain just learned something. That counts!', "You'll conquer this deck yet — don't give up!"],
    },
  },
]

function getTierIdx(accuracy: number): number {
  if (accuracy === 100) return 0
  if (accuracy >= 90)   return 1
  if (accuracy >= 75)   return 2
  if (accuracy >= 50)   return 3
  if (accuracy >= 25)   return 4
  return 5
}

// ── Multiplayer contextual result data ─────────────────────────────────────
type MultiResult = 'champion' | 'winner' | 'close_loss' | 'loss' | 'tie'

const MULTI_RESULT_DATA: Record<MultiResult, Tier> = {
  champion: {
    icon: '🏆',
    title: { cs: 'Šampión!', sk: 'Šampión!', en: 'Champion!' },
    messages: {
      cs: ['Tohle byl rozdíl třídy — gratulujem!', 'Dominantní výkon. Soupeř nestačil!', 'Mozek na plný výkon — vyhráno!'],
      sk: ['Toto bol rozdiel triedy — gratulujeme!', 'Dominantný výkon. Súper nestačil!', 'Mozog na plný výkon — vyhraté!'],
      en: ['That was a class apart — congrats!', 'Dominant performance. The opponent had no chance!', 'Brain at full power — victory!'],
    },
  },
  winner: {
    icon: '🥇',
    title: { cs: 'Vítěz!', sk: 'Víťaz!', en: 'Winner!' },
    messages: {
      cs: ['Těsné, ale vítězství se počítá!', 'O chlup, ale vyhrál jsi. Skvělé nervy!', 'Dramatická výhra — to byl boj!'],
      sk: ['Tesné, ale víťazstvo sa počíta!', 'O vlas, ale vyhral si. Skvelé nervy!', 'Dramatická výhra — to bol boj!'],
      en: ['Close, but a win is a win!', 'Just barely, but you won. Great nerves!', 'Dramatic victory — what a battle!'],
    },
  },
  close_loss: {
    icon: '🥈',
    title: { cs: 'Těsně!', sk: 'Tesne!', en: 'So close!' },
    messages: {
      cs: ['Jen kousek! Příště to otočíš.', 'Tak blízko! Mozek příště zabere víc.', 'O vlásek — příště to bude tvoje!'],
      sk: ['Len kúsok! Nabudúce to otočíš.', 'Tak blízko! Mozog nabudúce zabre viac.', 'O vlas — nabudúce to bude tvoje!'],
      en: ["Just a hair away! You'll turn it around next time.", 'So close! Brain will deliver more next time.', "By a thread — next time it's yours!"],
    },
  },
  loss: {
    icon: '💪',
    title: { cs: 'Příště lépe!', sk: 'Nabudúce lepšie!', en: 'Better next time!' },
    messages: {
      cs: ['Tentokrát to nevyšlo — ale příště!', 'Soupeř byl silný, mozek se učí.', 'Každá prohra tě posouvá dál. Nevzdávej!'],
      sk: ['Tentokrát to nevyšlo — ale nabudúce!', 'Súper bol silný, mozog sa učí.', 'Každá prehra ťa posúva ďalej. Nevzdávaj!'],
      en: ["Didn't work out this time — but next time!", 'The opponent was strong, brain is learning.', 'Every loss moves you forward. Keep going!'],
    },
  },
  tie: {
    icon: '🤝',
    title: { cs: 'Remíza!', sk: 'Remíza!', en: 'It\'s a tie!' },
    messages: {
      cs: ['Přesně stejně dobří — to se jen tak nevidí!', 'Nerozhodně! Mozky v rovnováze.', 'Spravedlivá dělba — příště rozhodne jeden bod!'],
      sk: ['Presne rovnako dobrí — to sa tak ľahko nevidí!', 'Nerozhodne! Mozgy v rovnováhe.', 'Spravodlivá deľba — nabudúce rozhodne jeden bod!'],
      en: ["Exactly the same — you don't see that every day!", 'A draw! Brains in perfect balance.', 'Fair split — next time one point decides it!'],
    },
  },
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export default function WinModal() {
  const players          = useGameStore(s => s.players)
  const playerIds        = useGameStore(s => s.playerIds)
  const soloMoves        = useGameStore(s => s.soloMoves)
  const language         = useGameStore(s => s.language)
  const theme            = useGameStore(s => s.theme)
  const isOnline         = useGameStore(s => s.isOnline)
  const isHost           = useGameStore(s => s.isHost)
  const myPlayerId       = useGameStore(s => s.myPlayerId)
  const playAgain        = useGameStore(s => s.playAgain)
  const resetToSetup     = useGameStore(s => s.resetToSetup)
  const openSettingsModal = useGameStore(s => s.openSettingsModal)
  const requestRematch   = useGameStore(s => s.requestRematch)
  const rematchRequested = useGameStore(s => s.rematchRequested)
  const customDeck       = useGameStore(s => s.customDeck)
  const selectedDeckId   = useGameStore(s => s.selectedDeckId)
  const playerNames      = useGameStore(s => s.playerNames)
  const tr = TRANSLATIONS[language]
  const tc = THEMES[theme]

  const { user, profile, openAuthModal } = useAuthStore()
  const sharerName = profile?.username ?? playerNames[0]
  const savedRef = useRef(false)

  const isSolo = players.length === 1

  // Stagger animation
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200)
    return () => clearTimeout(t)
  }, [])
  const fadeIn = (delay: number) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'none' : 'translateY(6px)',
    transition: `opacity 0.45s ${delay}ms, transform 0.45s ${delay}ms`,
  })

  // Compute result messages once — avoid re-randomising on re-renders
  const stableMessages = useMemo(() => {
    const p0 = players[0]
    const totalQuizzes0 = p0 ? p0.quizzes + p0.wrongQuizzes : 0
    const soloAccuracy = totalQuizzes0 > 0 ? Math.round(p0.quizzes / totalQuizzes0 * 100) : 100
    const soloTierIdx = getTierIdx(soloAccuracy)
    const soloDef = PEXE_TIERS[soloTierIdx]
    const soloCustTier = customDeck?.results_config?.[soloTierIdx]
    const soloPool = soloCustTier?.messages?.length ? soloCustTier.messages : (soloDef.messages[language] ?? soloDef.messages['cs'])
    const soloMessage = pickRandom(soloPool)

    const sorted = [...players].map((p, i) => ({ ...p, idx: i })).sort((a, b) => b.score - a.score)
    const maxScore = sorted[0]?.score ?? 0
    const isTie = sorted.filter(p => p.score === maxScore).length > 1
    const myIdx = players.findIndex((_, i) => playerIds[i] === myPlayerId)
    const myScore = players[myIdx]?.score ?? 0
    let multiResult: 'tie' | 'winner' | 'champion' | 'close_loss' | 'loss'
    if (isTie) multiResult = 'tie'
    else if (isOnline) {
      if (myScore < maxScore) multiResult = (maxScore - myScore) <= 2 ? 'close_loss' : 'loss'
      else { const second = sorted.find(p => p.score < myScore)?.score ?? myScore; multiResult = (myScore - second) <= 2 ? 'winner' : 'champion' }
    } else {
      const second = sorted[1]?.score ?? maxScore
      multiResult = (maxScore - second) <= 2 ? 'winner' : 'champion'
    }
    const multiData = MULTI_RESULT_DATA[multiResult]
    const multiMessage = pickRandom(multiData.messages[language] ?? multiData.messages['cs'])
    return { soloMessage, multiMessage }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language])

  // Auto-save result for solo + online multiplayer (skip local multiplayer — shared screen)
  useEffect(() => {
    if (!user || savedRef.current) return
    if (!isSolo && !isOnline) return
    savedRef.current = true
    let p: typeof players[0]
    if (isSolo) {
      p = players[0]
    } else {
      const myIdx = playerIds.indexOf(myPlayerId)
      p = players[myIdx]
      if (!p) return
    }
    const quizTotal = p.quizzes + p.wrongQuizzes
    const builtInDeck = customDeck ? null : DECKS.find(d => d.id === selectedDeckId)
    saveGameResult({
      setSlug:       customDeck ? null : selectedDeckId,
      setTitle:      customDeck ? customDeck.title : (builtInDeck?.label ?? null),
      customDeckId:  customDeck?.id ?? null,
      mode:          'pexequiz',
      score:         p.score,
      quizCorrect:   p.quizzes,
      quizTotal,
      totalPairs:    p.pairs,
      durationSec:   0,
      isMultiplayer: !isSolo,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function getPexeTierDisplay(accuracy: number): { icon: string; title: string; message: string } {
    const idx = getTierIdx(accuracy)
    const custom = customDeck?.results_config?.[idx]
    const def = PEXE_TIERS[idx]
    const icon = custom?.icon ?? def.icon
    const title = custom?.title ?? (def.title[language] ?? def.title['cs'])
    const pool = custom?.messages?.length ? custom.messages : (def.messages[language] ?? def.messages['cs'])
    return { icon, title, message: pickRandom(pool) }
  }

  useEffect(() => {
    const colors = theme === 'light'
      ? ['#6d41a1', '#ffffff', '#c4a8e8']
      : ['#f9d74e', '#ffffff', '#1a237e']
    const end = Date.now() + 2500
    const frame = () => {
      confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors })
      confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }, [])

  // ── Solo ──────────────────────────────────────────────────────────────────
  if (isSolo) {
    const p = players[0]
    const totalQuizzes = p.quizzes + p.wrongQuizzes
    const accuracy = totalQuizzes > 0 ? Math.round(p.quizzes / totalQuizzes * 100) : 100
    const movesPerPair = p.pairs > 0 ? (soloMoves / p.pairs).toFixed(1) : '—'
    const { title } = getPexeTierDisplay(accuracy)
    const message = stableMessages.soloMessage
    const deckTitle = customDeck?.title ?? DECKS.find(d => d.id === selectedDeckId)?.label ?? ''
    const isPerfect = p.quizzes === totalQuizzes && totalQuizzes > 0
    const correctLabel = ({ cs: 'Správně', sk: 'Správne', en: 'Correct' } as Record<string, string>)[language] ?? 'Správně'

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: tc.winOverlayBg }}>
        <div className="pop-in rounded-2xl p-8 text-center"
          style={{ background: tc.modalSurface, border: `2px solid ${tc.accent}`, boxShadow: `0 0 60px ${tc.accentGlow}`, color: tc.text }}>

          {/* Deck title */}
          {deckTitle && (
            <div className="text-xs font-medium mb-1 tracking-wide uppercase" style={{ color: tc.textMuted, ...fadeIn(100) }}>
              {deckTitle}
            </div>
          )}

          {/* Radial score */}
          <div style={fadeIn(200)}>
            <ScoreGauge
              score={p.quizzes}
              total={totalQuizzes}
              label={correctLabel}
              accent={tc.accent}
              accentGradient={tc.accentGradient}
              textMuted={tc.textMuted}
              trackColor={theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}
              isPerfectScore={isPerfect}
              animDelay={200}
            />
          </div>

          {/* Headline + subtitle */}
          <div className="text-2xl font-bold mt-1 mb-0.5" style={{
            background: tc.accentGradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            ...fadeIn(500),
          }}>{title}</div>
          <div className="text-sm mb-6" style={{ color: tc.textMuted, ...fadeIn(650) }}>{message}</div>

          {/* Stats */}
          <div
            className="flex flex-col gap-4 text-left mb-2"
            style={fadeIn(800)}
          >
            <div className="flex items-center justify-between gap-8">
              <span style={{ color: tc.textMuted }}>{tr.soloMovesLabel}</span>
              <span>
                <span className="text-xl font-bold" style={{ color: tc.accent }}>{soloMoves}</span>
                <span className="text-sm ml-2" style={{ color: tc.textDim }}>({movesPerPair} {tr.perPair})</span>
              </span>
            </div>
          </div>

          {/* Save result CTA — only if not logged in */}
          <div style={fadeIn(1000)}>
            {!user && (
              <div
                className="mt-4 flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                style={{ background: tc.btnInactiveBg, border: `1px solid ${tc.btnInactiveBorder}` }}
              >
                <span className="text-xs" style={{ color: tc.textMuted }}>
                  {{ cs: 'Ulož výsledek a sleduj pokrok', sk: 'Ulož výsledok a sleduj pokrok', en: 'Save your result & track progress' }[language]}
                </span>
                <button
                  onClick={openAuthModal}
                  className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                  style={{ background: tc.accentGradient, color: tc.accentText }}
                >
                  {{ cs: 'Přihlásit se', sk: 'Prihlásiť sa', en: 'Sign in' }[language]}
                </button>
              </div>
            )}

            <button
              onClick={() => shareResult({
                deckId: selectedDeckId,
                mode: 'pexequiz',
                ctx: { kind: 'pexequiz_solo', accuracy },
                language,
                from: sharerName,
              })}
              className="mt-4 w-full py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80 border"
              style={{ background: 'transparent', borderColor: tc.btnInactiveBorder, color: tc.textMuted }}
            >
              📤 {tr.shareBtn}
            </button>

            <button
              onClick={playAgain}
              className="mt-2 px-10 py-2.5 rounded-xl font-bold transition-transform hover:scale-105 w-full"
              style={{ background: tc.accentGradient, color: tc.accentText }}
            >
              {tr.playAgain}
            </button>

            <button
              onClick={resetToSetup}
              className="block mx-auto mt-3 text-sm transition-opacity opacity-50 hover:opacity-70"
            >
              {tr.chooseDeck}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Multiplayer ───────────────────────────────────────────────────────────
  const sorted = [...players].map((p, i) => ({ ...p, origIdx: i })).sort((a, b) => b.score - a.score)
  const maxScore = sorted[0]?.score ?? 0
  const isTie = sorted.filter(p => p.score === maxScore).length > 1

  // Determine result context:
  // - online: personalized per myPlayerId (winner/loser/tie)
  // - local: always winner's perspective (shared screen — never show loser message)
  function getMyResult(): MultiResult {
    if (isTie) return 'tie'
    if (isOnline) {
      const myIdx = players.findIndex((_, i) => playerIds[i] === myPlayerId)
      const myScore = players[myIdx]?.score ?? 0
      if (myScore < maxScore) {
        return (maxScore - myScore) <= 2 ? 'close_loss' : 'loss'
      }
      const secondScore = sorted.find(p => p.score < myScore)?.score ?? myScore
      return (myScore - secondScore) <= 2 ? 'winner' : 'champion'
    }
    // Local: winner's perspective
    const secondScore = sorted[1]?.score ?? maxScore
    return (maxScore - secondScore) <= 2 ? 'winner' : 'champion'
  }

  const resultKey = getMyResult()
  const resultData = MULTI_RESULT_DATA[resultKey]
  const resultMessage = stableMessages.multiMessage
  const showMedals = players.length >= 3

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: tc.winOverlayBg }}>
      <div className="pop-in rounded-2xl p-8 text-center w-full max-w-sm overflow-y-auto max-h-[90vh]"
        style={{ background: tc.modalSurface, border: `2px solid ${tc.accent}`, boxShadow: `0 0 60px ${tc.accentGlow}`, color: tc.text }}>

        {/* Contextual result header */}
        <div className="text-4xl mb-1">{resultData.icon}</div>
        <div className="text-2xl font-bold mb-1" style={{ color: tc.accent }}>{resultData.title[language]}</div>
        <div className="text-sm mb-6" style={{ color: tc.textMuted }}>{resultMessage}</div>

        {/* Leaderboard */}
        <div className="flex flex-col gap-2.5 text-left mb-6">
          {sorted.map((p, rank) => {
            const totalQ = p.quizzes + p.wrongQuizzes
            const acc = totalQ > 0 ? Math.round(p.quizzes / totalQ * 100) : 100
            const isMe = isOnline && playerIds[p.origIdx] === myPlayerId
            return (
              <div key={p.origIdx}
                className="px-3 py-2.5 rounded-xl"
                style={{
                  background: isMe ? tc.accentBgActive : tc.scorePillBg,
                  border: isMe ? `1.5px solid ${tc.accentBorderActive}` : '1.5px solid transparent',
                }}
              >
                <div className="flex items-center gap-2.5">
                  {showMedals && (
                    <span className="text-base w-6 text-center shrink-0">
                      {rank < 3 ? MEDALS[rank] : `${rank + 1}.`}
                    </span>
                  )}
                  <Avatar avatarId={p.avatarId} size={22} className="rounded-full shrink-0" />
                  <span className="flex-1 text-sm font-semibold truncate" style={{ color: isMe ? tc.accent : tc.text }}>
                    {trunc(p.name)}
                  </span>
                  <span className="text-base font-bold tabular-nums" style={{ color: tc.accent }}>{p.score}</span>
                </div>
                <div className="flex items-center gap-2.5 mt-0.5">
                  {showMedals && <span className="w-6 shrink-0" />}
                  <span className="w-[22px] shrink-0" />
                  <span className="text-xs" style={{ color: tc.textDim }}>
                    🃏 {pluralize(p.pairs, tr, 'pairOne', 'pairFew', 'pairMany')}
                    {' '}+{' '}
                    🧠 {pluralize(p.quizzes, tr, 'quizOne', 'quizFew', 'quizMany')}
                    {totalQ > 0 && <span style={{ color: tc.textMuted }}> · {acc}%</span>}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* CTA — host / local */}
        {(!isOnline || isHost) && (
          <button
            onClick={playAgain}
            className="px-10 py-2.5 rounded-xl font-bold transition-transform hover:scale-105 w-full"
            style={{
              background: rematchRequested ? tc.text : tc.accentGradient,
              color: rematchRequested ? tc.bg : tc.accentText,
              boxShadow: rematchRequested ? `0 0 16px ${tc.accentGlow}` : undefined,
            }}
          >
            {rematchRequested ? '⚡ ' : ''}{tr.playAgain}
          </button>
        )}

        {/* CTA — online guest */}
        {isOnline && !isHost && (
          rematchRequested
            ? <div className="text-sm" style={{ color: tc.textMuted }}>{tr.rematchWaiting}</div>
            : <button
                onClick={requestRematch}
                className="px-10 py-2.5 rounded-xl font-bold transition-transform hover:scale-105 w-full"
                style={{ background: tc.accentGradient, color: tc.accentText }}
              >
                {tr.rematchRequest}
              </button>
        )}

        {/* Share */}
        <button
          onClick={() => shareResult({
            deckId: selectedDeckId,
            mode: 'pexequiz',
            ctx: { kind: 'multiplayer', result: resultKey },
            language,
            from: sharerName,
          })}
          className="mt-1 w-full py-2 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80 border"
          style={{ background: 'transparent', borderColor: tc.btnInactiveBorder, color: tc.textMuted }}
        >
          📤 {tr.shareBtn}
        </button>

        {/* Secondary: change settings (online host) or choose deck (local) */}
        {isOnline && isHost && (
          <button
            onClick={openSettingsModal}
            className="block mx-auto mt-1 text-sm transition-opacity opacity-50 hover:opacity-90"
          >
            ⚙️ {tr.changeGameSettings}
          </button>
        )}
        <button
          onClick={resetToSetup}
          className="block mx-auto mt-2 text-sm transition-opacity opacity-50 hover:opacity-70"
        >
          {isOnline ? tr.leaveRoom : tr.chooseDeck}
        </button>

      </div>
    </div>
  )
}
