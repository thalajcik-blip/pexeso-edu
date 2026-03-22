import { useEffect, useRef, useState, useCallback } from 'react'
import confetti from 'canvas-confetti'
import { useGameStore } from '../../store/gameStore'
import { useAuthStore } from '../../store/authStore'
import { saveGameResult } from '../../services/gameService'
import { DECKS } from '../../data/decks'
import { TRANSLATIONS } from '../../data/translations'
import { THEMES } from '../../data/themes'
import { soundQuizSelect, soundQuizCorrect, soundQuizWrong, soundQuizTimeout, soundTick, soundWin, isMuted, toggleMuted } from '../../services/audioService'
import { Avatar } from '../auth/Avatar'
import { shareResult } from '../../services/shareService'

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const EMOJI_OPTS = ['👍', '😱', '🎉', '😂', '🔥', '😅']
const REVEAL_DURATION = 4000
const MEDALS = ['🥇', '🥈', '🥉']

type LightningTier = { icon: string; title: Record<string, string>; messages: Record<string, string[]> }
const LIGHTNING_TIERS: LightningTier[] = [
  {
    icon: '🧠',
    title: { cs: 'Génius!', sk: 'Génius!', en: 'Genius!' },
    messages: {
      cs: ['Jsi chytřejší než Google!', 'Učebnice by měly psát o tobě.', 'Mozek na maximum — perfektní výsledek!'],
      sk: ['Si múdrejší ako Google!', 'Učebnice by mali písať o tebe.', 'Mozog na maximum — perfektný výsledok!'],
      en: ["You're smarter than Google!", 'Textbooks should be written about you.', 'Brain at full power — perfect score!'],
    },
  },
  {
    icon: '🔥',
    title: { cs: 'Výborně!', sk: 'Výborne!', en: 'Excellent!' },
    messages: {
      cs: ['Skoro dokonalý! Jedna otázka tě podvedla.', 'Téměř bezchybný výkon — skvělá práce!', 'Oheň v mozku hoří naplno!'],
      sk: ['Skoro dokonalý! Jedna otázka ťa podviedla.', 'Takmer bezchybný výkon — skvelá práca!', 'Oheň v mozgu horí naplno!'],
      en: ['Almost perfect! One question got you.', 'Nearly flawless — great job!', 'Brain on fire!'],
    },
  },
  {
    icon: '⭐',
    title: { cs: 'Skvělé!', sk: 'Skvelé!', en: 'Great!' },
    messages: {
      cs: ['Solid výkon! Příště to dotáhneš na 100%.', 'Mozek pracuje naplno — dobrá práce!', 'Tři čtvrtiny tam — příště to zlomíš!'],
      sk: ['Solid výkon! Nabudúce to dotiahneš na 100%.', 'Mozog pracuje naplno — dobrá práca!', 'Tri štvrtiny tam — nabudúce to zlomíš!'],
      en: ['Solid performance! Next time you\'ll hit 100%.', 'Brain working hard — good job!', 'Three quarters there — you\'ll nail it next time!'],
    },
  },
  {
    icon: '💪',
    title: { cs: 'Dobrý pokus!', sk: 'Dobrý pokus!', en: 'Good try!' },
    messages: {
      cs: ['Rozehřívačka se povedla, příště víc!', 'Půlka tam, půlka příště — nevzdávej!', 'Mozek se zahřívá. Zkus to znovu!'],
      sk: ['Rozcvička sa podarila, nabudúce viac!', 'Polovica tam, polovica nabudúce — nevzdávaj!', 'Mozog sa zahrieva. Skús to znovu!'],
      en: ['Warm-up done, go for more next time!', 'Halfway there — don\'t give up!', 'Brain warming up. Try again!'],
    },
  },
  {
    icon: '📚',
    title: { cs: 'Nevzdávej to!', sk: 'Nevzdávaj to!', en: "Don't give up!" },
    messages: {
      cs: ['Tohle téma chce trochu procvičit — dáš to!', 'Zkus to znovu, mozek potřebuje čas!', 'Každý pokus tě posouvá blíž k cíli!'],
      sk: ['Táto téma chce trochu precvičiť — dáš to!', 'Skús to znovu, mozog potrebuje čas!', 'Každý pokus ťa posúva bližšie k cieľu!'],
      en: ['This topic needs a bit more practice — you got this!', 'Try again, the brain needs time!', 'Every attempt gets you closer to the goal!'],
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

function getLightningTierIdx(accuracy: number): number {
  if (accuracy === 100) return 0
  if (accuracy >= 90)   return 1
  if (accuracy >= 75)   return 2
  if (accuracy >= 50)   return 3
  if (accuracy >= 25)   return 4
  return 5
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

type MultiResult = 'champion' | 'winner' | 'close_loss' | 'loss' | 'tie'
const LIGHTNING_MULTI: Record<MultiResult, LightningTier> = {
  champion: {
    icon: '🏆',
    title: { cs: 'Šampión!', sk: 'Šampión!', en: 'Champion!' },
    messages: {
      cs: ['Dominantní výkon — soupeř neměl šanci!', 'Tohle byl rozdíl třídy. Gratulujeme!', 'Bleskový mozek v akci — vyhráno!'],
      sk: ['Dominantný výkon — súper nemal šancu!', 'Toto bol rozdiel triedy. Gratulujeme!', 'Bleskový mozog v akcii — vyhraté!'],
      en: ['Dominant performance — the opponent had no chance!', 'That was a class apart. Congrats!', 'Lightning brain in action — victory!'],
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
      cs: ['Tentokrát to nevyšlo — ale příště!', 'Soupeř byl rychlý, mozek se učí.', 'Každá prohra tě posouvá dál. Nevzdávej!'],
      sk: ['Tentokrát to nevyšlo — ale nabudúce!', 'Súper bol rýchly, mozog sa učí.', 'Každá prehra ťa posúva ďalej. Nevzdávaj!'],
      en: ["Didn't work out this time — but next time!", 'The opponent was quick, brain is learning.', 'Every loss moves you forward. Keep going!'],
    },
  },
  tie: {
    icon: '🤝',
    title: { cs: 'Remíza!', sk: 'Remíza!', en: "It's a tie!" },
    messages: {
      cs: ['Přesně stejně dobří — to se jen tak nevidí!', 'Nerozhodně! Mozky v rovnováze.', 'Spravedlivá dělba — příště rozhodne jedna otázka!'],
      sk: ['Presne rovnako dobrí — to sa tak ľahko nevidí!', 'Nerozhodne! Mozgy v rovnováhe.', 'Spravodlivá deľba — nabudúce rozhodne jedna otázka!'],
      en: ["Exactly the same — you don't see that every day!", 'A draw! Brains in perfect balance.', 'Fair split — next time one question decides it!'],
    },
  },
}

export default function LightningGame() {
  const phase                     = useGameStore(s => s.phase)
  const lightningQuestions        = useGameStore(s => s.lightningQuestions)
  const lightningCurrentIndex     = useGameStore(s => s.lightningCurrentIndex)
  const lightningAnswers          = useGameStore(s => s.lightningAnswers)
  const lightningTimeLimit        = useGameStore(s => s.lightningTimeLimit)
  const lightningQuestionEndTime  = useGameStore(s => s.lightningQuestionEndTime)
  const lightningPlayerAnswers    = useGameStore(s => s.lightningPlayerAnswers)
  const lightningPlayerStats      = useGameStore(s => s.lightningPlayerStats)
  const answerLightningQuestion   = useGameStore(s => s.answerLightningQuestion)
  const answerOnlineLightning     = useGameStore(s => s.answerOnlineLightning)
  const transitionToLightningReveal = useGameStore(s => s.transitionToLightningReveal)
  const nextLightningQuestion     = useGameStore(s => s.nextLightningQuestion)
  const startLightningGame        = useGameStore(s => s.startLightningGame)
  const startOnlineLightningGame  = useGameStore(s => s.startOnlineLightningGame)
  const resetToSetup              = useGameStore(s => s.resetToSetup)
  const openSettingsModal         = useGameStore(s => s.openSettingsModal)
  const toggleTheme               = useGameStore(s => s.toggleTheme)
  const openRules                 = useGameStore(s => s.openRules)
  const language                  = useGameStore(s => s.language)
  const theme                     = useGameStore(s => s.theme)
  const isOnline                  = useGameStore(s => s.isOnline)
  const isHost                    = useGameStore(s => s.isHost)
  const players                   = useGameStore(s => s.players)
  const playerIds                 = useGameStore(s => s.playerIds)
  const myPlayerId                = useGameStore(s => s.myPlayerId)
  const customDeck                = useGameStore(s => s.customDeck)
  const selectedDeckId            = useGameStore(s => s.selectedDeckId)
  const emojiReactions            = useGameStore(s => s.emojiReactions)
  const sendEmojiReact            = useGameStore(s => s.sendEmojiReact)
  const tr = TRANSLATIONS[language]
  const tc = THEMES[theme]

  const { user } = useAuthStore()
  const savedRef = useRef(false)

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(lightningTimeLimit)
  const [feedbackClass, setFeedbackClass] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [muted, setMuted] = useState(isMuted)
  const [revealSecondsLeft, setRevealSecondsLeft] = useState(REVEAL_DURATION / 1000)
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string; playerIndex: number }[]>([])
  const [emojiCooldown, setEmojiCooldown] = useState(false)

  const remainingRef = useRef(lightningTimeLimit)
  const lastTickSecRef = useRef(lightningTimeLimit + 1)
  const hasAnsweredRef = useRef(false)
  const floatIdRef = useRef(0)
  const prevReactionsRef = useRef<Record<string, string>>({})
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const removeFloat = useCallback((id: number) => {
    setFloatingEmojis(prev => prev.filter(e => e.id !== id))
  }, [])

  // Floating emoji reactions
  useEffect(() => {
    const prev = prevReactionsRef.current
    Object.entries(emojiReactions).forEach(([pid, emoji]) => {
      if (prev[pid] === emoji) return
      const playerIndex = playerIds.indexOf(pid)
      if (playerIndex < 0) return
      const id = floatIdRef.current++
      setFloatingEmojis(p => [...p, { id, emoji, playerIndex }])
      setTimeout(() => removeFloat(id), 1400)
    })
    prevReactionsRef.current = emojiReactions
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emojiReactions])

  const question = lightningQuestions[lightningCurrentIndex]
  const isReveal  = phase === 'lightning_reveal'
  const isResults = phase === 'lightning_results' && lightningAnswers.length > 0
  const total     = lightningQuestions.length

  // Reset on new question
  useEffect(() => {
    const initRemaining = lightningQuestionEndTime > 0
      ? Math.max(0, (lightningQuestionEndTime - Date.now()) / 1000)
      : lightningTimeLimit
    remainingRef.current = initRemaining
    lastTickSecRef.current = initRemaining + 1
    setTimeLeft(initRemaining)
    setSelectedAnswer(null)
    setFeedbackClass('')
    hasAnsweredRef.current = false
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightningCurrentIndex])

  // Timer countdown
  useEffect(() => {
    if (phase !== 'lightning_playing') return
    let lastTick = Date.now()
    const interval = setInterval(() => {
      const now = Date.now()
      remainingRef.current -= (now - lastTick) / 1000
      lastTick = now
      if (remainingRef.current <= 0) {
        clearInterval(interval)
        setTimeLeft(0)
        if (isOnline) {
          if (!hasAnsweredRef.current) {
            answerOnlineLightning('')
            soundQuizTimeout()
          }
          transitionToLightningReveal()
        } else {
          setSelectedAnswer('')
          answerLightningQuestion('')
          soundQuizTimeout()
        }
      } else {
        setTimeLeft(remainingRef.current)
        const sec = Math.ceil(remainingRef.current)
        if (sec <= 5 && sec < lastTickSecRef.current) {
          lastTickSecRef.current = sec
          soundTick(true)
        }
      }
    }, 50)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightningCurrentIndex, phase])

  // Play reveal sound + trigger feedback animation
  useEffect(() => {
    if (phase !== 'lightning_reveal') return
    const lastAns = lightningAnswers[lightningAnswers.length - 1]
    if (lastAns) {
      if (lastAns.correct) {
        soundQuizCorrect()
        setFeedbackClass('answer-correct')
      } else {
        soundQuizWrong()
        setFeedbackClass('answer-shake')
      }
    } else {
      setFeedbackClass('answer-shake')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lightningCurrentIndex])

  // Auto-advance in online mode during reveal
  useEffect(() => {
    if (!isOnline || phase !== 'lightning_reveal') return
    setRevealSecondsLeft(REVEAL_DURATION / 1000)
    const countdownInterval = setInterval(() => {
      setRevealSecondsLeft(s => Math.max(0, s - 1))
    }, 1000)
    const advanceTimer = setTimeout(() => {
      nextLightningQuestion()
    }, REVEAL_DURATION)
    return () => {
      clearTimeout(advanceTimer)
      clearInterval(countdownInterval)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lightningCurrentIndex, isOnline])

  // Keyboard shortcuts: 1-4 = answer, Enter = next (solo only)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phase === 'lightning_playing') {
        const idx = parseInt(e.key) - 1
        if (idx >= 0 && idx < 4 && question?.options[idx] !== undefined) {
          handleAnswer(question.options[idx])
        }
      }
      if (e.key === 'Enter' && phase === 'lightning_reveal' && !isOnline) {
        e.preventDefault()
        nextLightningQuestion()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lightningCurrentIndex, isOnline])

  // Confetti + win sound on results
  useEffect(() => {
    if (phase !== 'lightning_results') return
    const colors = theme === 'light' ? ['#6d41a1', '#ffffff', '#c4a8e8'] : ['#f9d74e', '#ffffff', '#1a237e']
    if (isOnline) {
      // Only fire confetti for winner/tie
      const maxScore = Math.max(...players.map(p => p.score))
      const myIdx = players.findIndex((_, i) => playerIds[i] === myPlayerId)
      const myScore = players[myIdx]?.score ?? 0
      const isTie = players.filter(p => p.score === maxScore).length > 1
      if (myScore < maxScore && !isTie) return // loser: no confetti
      soundWin()
    } else {
      const correct = lightningAnswers.filter(a => a.correct).length
      const accuracy = total > 0 ? correct / total : 0
      const duration = Math.max(500, accuracy * 2000)
      const particleCount = Math.max(2, Math.round(accuracy * 5))
      soundWin()
      const end = Date.now() + duration
      const frame = () => {
        confetti({ particleCount, angle: 60, spread: 55, origin: { x: 0 }, colors })
        confetti({ particleCount, angle: 120, spread: 55, origin: { x: 1 }, colors })
        if (Date.now() < end) requestAnimationFrame(frame)
      }
      frame()
      return
    }
    const end = Date.now() + 2000
    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors })
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }, [phase])

  // Auto-save lightning result for logged-in players (solo + online multiplayer)
  useEffect(() => {
    if (phase !== 'lightning_results' || !user || savedRef.current) return
    savedRef.current = true
    const correctCount = lightningAnswers.filter(a => a.correct).length
    const builtInDeck = customDeck ? null : DECKS.find(d => d.id === selectedDeckId)
    saveGameResult({
      setSlug:       customDeck ? null : selectedDeckId,
      setTitle:      customDeck ? customDeck.title : (builtInDeck?.label ?? '—'),
      customDeckId:  customDeck?.id ?? null,
      mode:          'lightning',
      score:         correctCount,
      quizCorrect:   correctCount,
      quizTotal:     lightningAnswers.length,
      totalPairs:    0,
      durationSec:   0,
      isMultiplayer: isOnline,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  function handleAnswer(answer: string) {
    if (phase !== 'lightning_playing' || selectedAnswer !== null) return
    setSelectedAnswer(answer)
    soundQuizSelect()
    hasAnsweredRef.current = true
    if (isOnline) {
      answerOnlineLightning(answer)
    } else {
      answerLightningQuestion(answer)
    }
  }

  function getOptionStyle(option: string) {
    if (!isReveal) {
      if (selectedAnswer === option) return { background: tc.accentBgActive, border: `2px solid ${tc.accentBorderActive}`, color: tc.accent }
      return { background: tc.quizOptionBg, border: `2px solid ${tc.quizOptionBorder}`, color: tc.text }
    }
    if (option === question.correct) return { background: tc.successBg, border: `2px solid ${tc.successColor}`, color: tc.successColor }
    if (option === selectedAnswer)   return { background: tc.errorBg,   border: `2px solid ${tc.errorColor}`,   color: tc.errorColor }
    return { background: tc.quizOptionBg, border: `2px solid ${tc.quizOptionBorder}`, color: tc.textFaint }
  }

  // ── Results screen ──
  if (isResults) {
    const correctCount = lightningAnswers.filter(a => a.correct).length
    const accuracy = total > 0 ? Math.round(correctCount / total * 100) : 0
    const avgTimeS = lightningAnswers.length > 0
      ? (lightningAnswers.reduce((s, a) => s + a.timeMs, 0) / lightningAnswers.length / 1000).toFixed(1)
      : '—'

    // Fastest correct answer
    const correctAnswers = lightningAnswers.filter(a => a.correct)
    const fastestMs = correctAnswers.length > 0
      ? Math.min(...correctAnswers.map(a => a.timeMs))
      : null
    const fastestS = fastestMs !== null ? (fastestMs / 1000).toFixed(1) : null

    // Tier + random message (custom deck overrides icon/title/messages)
    const tierIdx = getLightningTierIdx(accuracy)
    const customTier = customDeck?.results_config?.[tierIdx]
    const defTier = LIGHTNING_TIERS[tierIdx]
    const tierIcon    = customTier?.icon ?? defTier.icon
    const tierTitle   = customTier?.title ?? (defTier.title[language] ?? defTier.title['cs'])
    const tierMsgPool = customTier?.messages?.length ? customTier.messages : (defTier.messages[language] ?? defTier.messages['cs'])
    const tierMessage = pickRandom(tierMsgPool)

    // Online: compute my result + leaderboard
    const sortedPlayers = [...players].map((p, i) => ({ ...p, idx: i })).sort((a, b) => b.score - a.score)
    const maxScore = isOnline ? (sortedPlayers[0]?.score ?? 0) : 0
    const isTie = isOnline && sortedPlayers.filter(p => p.score === maxScore).length > 1
    const myIdx = isOnline ? players.findIndex((_, i) => playerIds[i] === myPlayerId) : -1
    const myScore = isOnline ? (players[myIdx]?.score ?? 0) : 0

    function getOnlineResult(): MultiResult {
      if (isTie) return 'tie'
      if (myScore < maxScore) return (maxScore - myScore) <= 2 ? 'close_loss' : 'loss'
      const secondScore = sortedPlayers.find(p => p.score < myScore)?.score ?? myScore
      return (myScore - secondScore) <= 2 ? 'winner' : 'champion'
    }
    const onlineResult = isOnline ? getOnlineResult() : null
    const onlineResultData = onlineResult ? LIGHTNING_MULTI[onlineResult] : null
    const onlineMessage = onlineResultData ? pickRandom(onlineResultData.messages[language] ?? onlineResultData.messages['cs']) : ''

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: tc.winOverlayBg }}>
        <div className="pop-in rounded-2xl p-8 text-center w-full max-w-sm overflow-y-auto max-h-[90vh]"
          style={{ background: tc.modalSurface, border: `2px solid ${tc.accent}`, boxShadow: `0 0 60px ${tc.accentGlow}`, color: tc.text }}>

          {/* Header */}
          {isOnline && onlineResultData ? (
            <>
              <div className="text-4xl mb-1">{onlineResultData.icon}</div>
              <div className="text-2xl font-bold mb-1" style={{ color: tc.accent }}>{onlineResultData.title[language]}</div>
              <div className="text-sm mb-6" style={{ color: tc.textMuted }}>{onlineMessage}</div>
            </>
          ) : (
            <>
              <div className="text-4xl mb-1">{tierIcon}</div>
              <div className="text-2xl font-bold mb-1" style={{ color: tc.accent }}>{tierTitle}</div>
              <div className="text-sm mb-6" style={{ color: tc.textMuted }}>{tierMessage}</div>
            </>
          )}

          {/* Online leaderboard */}
          {isOnline ? (
            <div className="flex flex-col gap-2 mb-5 text-left">
              {sortedPlayers.map((p, rank) => {
                const isMe = playerIds[p.idx] === myPlayerId
                const stats = lightningPlayerStats[playerIds[p.idx]]
                const pCorrect = stats?.correct ?? p.score
                const pAvgMs = stats && pCorrect > 0 ? (stats.totalCorrectMs / pCorrect / 1000).toFixed(1) : null
                const pTied = isTie && p.score === maxScore
                return (
                  <div key={p.idx}
                    className="px-3 py-2.5 rounded-xl"
                    style={{
                      background: isMe ? tc.accentBgActive : tc.scorePillBg,
                      border: isMe ? `1.5px solid ${tc.accentBorderActive}` : '1.5px solid transparent',
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base w-6 text-center shrink-0">
                        {pTied ? '🤝' : rank < 3 ? MEDALS[rank] : `${rank + 1}.`}
                      </span>
                      <Avatar avatarId={p.avatarId} size={20} className="rounded-full shrink-0" />
                      <span className="flex-1 text-sm font-semibold truncate" style={{ color: isMe ? tc.accent : tc.text }}>
                        {p.name}{isMe ? ` ${tr.you}` : ''}
                      </span>
                      <span className="text-base font-bold tabular-nums" style={{ color: tc.accent }}>{p.score}</span>
                    </div>
                    <div className="text-xs mt-0.5 pl-9" style={{ color: tc.textDim }}>
                      {pCorrect}/{total} · {total > 0 ? Math.round(pCorrect / total * 100) : 0}%
                      {pAvgMs && <span style={{ color: tc.textMuted }}> · ⌀ {pAvgMs}s</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Solo stats */
            <div className="flex flex-col gap-3 text-left mb-5">
              <div className="flex items-center justify-between gap-8">
                <span style={{ color: tc.textMuted }}>{tr.soloQuizLabel}</span>
                <span>
                  <span className="text-xl font-bold" style={{ color: tc.accent }}>{correctCount}/{total}</span>
                  <span className="text-sm ml-1.5" style={{ color: tc.textDim }}>({accuracy}%)</span>
                </span>
              </div>
              <div className="flex items-center justify-between gap-8">
                <span style={{ color: tc.textMuted }}>{tr.lightningAvgTime}</span>
                <span className="text-xl font-bold" style={{ color: tc.accent }}>{avgTimeS}s</span>
              </div>
              {fastestS !== null && (
                <div className="flex items-center justify-between gap-8">
                  <span style={{ color: tc.textMuted }}>{tr.lightningFastest}</span>
                  <span className="text-xl font-bold" style={{ color: tc.accent }}>{fastestS}s</span>
                </div>
              )}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={() => shareResult({
              deckId: selectedDeckId,
              mode: 'lightning',
              ctx: isOnline && onlineResult
                ? { kind: 'multiplayer', result: onlineResult }
                : { kind: 'lightning_solo', accuracy, avgTime: parseFloat(avgTimeS) || undefined },
              language,
            })}
            className="mt-2 w-full py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80 border"
            style={{ background: 'transparent', borderColor: tc.btnInactiveBorder, color: tc.textMuted }}
          >
            📤 {tr.shareBtn}
          </button>

          {(!isOnline || isHost) ? (
            <button
              onClick={isOnline ? startOnlineLightningGame : startLightningGame}
              className="mt-2 px-10 py-2.5 rounded-xl font-bold transition-transform hover:scale-105 w-full"
              style={{ background: tc.accentGradient, color: tc.accentText }}
            >
              {tr.playAgain}
            </button>
          ) : (
            <p className="mt-2 text-sm" style={{ color: tc.textMuted }}>{tr.lightningWaitingForHost}</p>
          )}

          {isOnline && isHost && (
            <button
              onClick={openSettingsModal}
              className="block mx-auto mt-2 text-sm transition-opacity opacity-50 hover:opacity-90"
            >
              ⚙️ {tr.changeGameSettings}
            </button>
          )}

          {(!isOnline || isHost) && (
            <button
              onClick={resetToSetup}
              className="block mx-auto mt-3 text-sm transition-opacity opacity-50 hover:opacity-70"
            >
              {isOnline ? tr.leaveRoom : tr.lightningChooseOther}
            </button>
          )}

          {isOnline && !isHost && (
            <button
              onClick={resetToSetup}
              className="block mx-auto mt-1.5 text-sm transition-opacity opacity-50 hover:opacity-70"
            >
              {tr.leaveRoom}
            </button>
          )}
        </div>
      </div>
    )
  }

  if (!question) return null

  const timerColor = timeLeft <= 5 ? '#ef4444' : timeLeft <= 10 ? '#f97316' : tc.accent
  const isTimedOut = selectedAnswer === '' && isReveal
  const lastAnswer = lightningAnswers[lightningAnswers.length - 1]

  // Online leaderboard during reveal: top 5, sorted by score
  const leaderboardPlayers = isOnline && isReveal
    ? [...players]
        .map((p, i) => ({ ...p, idx: i, answeredCorrect: lightningPlayerAnswers[playerIds[i]]?.correct ?? null }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
    : []

  const answeredCount = Object.keys(lightningPlayerAnswers).length

  return (
    <div className="min-h-screen flex flex-col px-4 pt-4 pb-6" style={{ background: tc.bg, color: tc.text }}>

      {/* Settings menu — fixed top-right */}
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
          </div>
        )}
      </div>

      {/* Question number */}
      <div className="text-center text-sm font-bold tabular-nums mb-3" style={{ color: tc.textMuted }}>
        {lightningCurrentIndex + 1}/{total}
      </div>

      {/* Timer bar */}
      <div className="max-w-lg mx-auto w-full mb-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: tc.scorePillBg }}>
            <div
              key={lightningCurrentIndex}
              className="h-full rounded-full"
              style={{
                background: timerColor,
                animation: `lightning-timer ${lightningTimeLimit}s linear forwards`,
                animationPlayState: isReveal ? 'paused' : 'running',
              }}
            />
          </div>
          <span className="text-sm font-bold tabular-nums w-7 text-right" style={{ color: timerColor, visibility: isReveal ? 'hidden' : 'visible' }}>
            {Math.ceil(timeLeft)}
          </span>
        </div>
      </div>

      {/* Card visual */}
      <div className="flex justify-center mb-4">
        {question.imageUrl ? (
          <img
            src={question.imageUrl}
            alt={question.label}
            className="rounded-2xl object-cover"
            style={{ width: 'clamp(80px, 22vw, 160px)', height: 'clamp(80px, 22vw, 160px)' }}
          />
        ) : (
          <div
            className="flex items-center justify-center rounded-2xl"
            style={{
              fontSize: 'clamp(3rem, 16vw, 6rem)',
              width: 'clamp(80px, 22vw, 160px)',
              height: 'clamp(80px, 22vw, 160px)',
              background: tc.cardFront,
            }}
          >
            {question.symbol}
          </div>
        )}
      </div>

      {/* Question text */}
      <div className="text-center text-base font-semibold mb-1 max-w-lg mx-auto" style={{ color: tc.text }}>
        {question.question}
      </div>

      {/* Reveal feedback / answered counter */}
      <div className="text-center text-sm mb-2 h-5 flex items-center justify-center">
        {isReveal ? (
          isTimedOut
            ? <span style={{ color: '#ef4444' }}>{tr.lightningTimeUp}</span>
            : lastAnswer?.correct
              ? <span style={{ color: '#22c55e' }}>✓ {language === 'cs' ? 'Správně!' : language === 'sk' ? 'Správne!' : 'Correct!'}</span>
              : <span style={{ color: '#ef4444' }}>✗ {language === 'cs' ? 'Špatně.' : language === 'sk' ? 'Zle.' : 'Wrong.'}</span>
        ) : isOnline ? (
          <span style={{ color: tc.textMuted }}>{answeredCount}/{playerIds.length} {tr.lightningAnswered}</span>
        ) : null}
      </div>

      {/* Player answer dots — always reserved (online only) to prevent layout shift */}
      <div className="flex justify-center gap-1.5 mb-3 h-5">
        {isOnline && players.map((p, i) => {
          const answered = lightningPlayerAnswers[playerIds[i]] !== undefined
          return (
            <div
              key={i}
              className="relative rounded-full transition-all duration-300"
              style={{ width: 20, height: 20, opacity: answered ? 1 : 0.25 }}
            >
              <Avatar avatarId={p.avatarId} size={20} className="rounded-full" />
              {floatingEmojis.filter(fe => fe.playerIndex === i).map(fe => (
                <span key={fe.id} className="emoji-float">{fe.emoji}</span>
              ))}
            </div>
          )
        })}
      </div>

      {/* Answer options 2x2 */}
      <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto w-full">
        {question.options.map((option, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(option)}
            disabled={isReveal || selectedAnswer !== null}
            className={[
              'py-3 px-3 rounded-xl border-2 font-semibold text-sm text-left transition-all cursor-pointer disabled:cursor-default',
              isReveal && feedbackClass === 'answer-correct' && option === question.correct ? 'answer-correct' : '',
              isReveal && feedbackClass === 'answer-shake' && option === selectedAnswer ? 'answer-shake' : '',
            ].join(' ')}
            style={getOptionStyle(option)}
          >
            <span className="flex items-start gap-1.5">
              <span className="opacity-60 text-xs font-bold shrink-0 mt-0.5">{OPTION_LABELS[i]}</span>
              <span>{option}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Emoji reactions — online only, not on results screen */}
      {isOnline && !isResults && (
        <div className="flex justify-center gap-2 mt-4">
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

      {/* Fun fact */}
      {isReveal && question.funFact && (
        <div
          className="max-w-lg mx-auto w-full mt-4 px-4 py-2.5 rounded-xl text-xs text-center"
          style={{ background: tc.factBg, color: tc.factText }}
        >
          💡 {question.funFact}
        </div>
      )}

      {/* Online reveal: mini leaderboard */}
      {isReveal && isOnline && leaderboardPlayers.length > 0 && (
        <div className="max-w-lg mx-auto w-full mt-4">
          <div className="flex flex-col gap-1.5">
            {leaderboardPlayers.map((p, rank) => {
              const isMe = playerIds[p.idx] === myPlayerId
              const delta = p.answeredCorrect === true ? '+1' : null
              return (
                <div
                  key={p.idx}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
                  style={{
                    background: isMe ? tc.accentBgActive : tc.scorePillBg,
                    border: isMe ? `1.5px solid ${tc.accentBorderActive}` : '1.5px solid transparent',
                  }}
                >
                  <span className="text-sm w-5 text-center shrink-0" style={{ color: tc.textMuted }}>
                    {rank < 3 ? MEDALS[rank] : `${rank + 1}.`}
                  </span>
                  <Avatar avatarId={p.avatarId} size={18} className="rounded-full shrink-0" />
                  <span className="flex-1 text-sm font-medium truncate" style={{ color: isMe ? tc.accent : tc.text }}>
                    {p.name}
                  </span>
                  {delta && (
                    <span className="text-xs font-bold" style={{ color: '#22c55e' }}>{delta}</span>
                  )}
                  <span className="text-sm font-bold tabular-nums" style={{ color: tc.accent }}>{p.score}</span>
                </div>
              )
            })}
          </div>
          <div className="text-center text-xs mt-2" style={{ color: tc.textFaint }}>
            {revealSecondsLeft}s
          </div>
        </div>
      )}

      {/* Next button (solo reveal only) or spacer */}
      <div className="flex justify-center mt-6">
        {!isOnline && isReveal ? (
          <button
            onClick={nextLightningQuestion}
            className="px-8 py-2.5 rounded-xl font-bold transition-all hover:-translate-y-0.5"
            style={{ background: tc.accentGradient, color: tc.accentText, boxShadow: `0 4px 16px ${tc.accentGlow}` }}
          >
            {tr.lightningNext}
          </button>
        ) : (
          <div className="h-10" />
        )}
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center gap-0.5 mt-auto pt-6 pb-2">
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
