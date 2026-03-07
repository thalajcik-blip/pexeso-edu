import { useState, useEffect, useMemo } from 'react'
import { useGameStore } from '../../store/gameStore'
import { DECKS } from '../../data/decks'
import { TRANSLATIONS, t } from '../../data/translations'
import { EN_QUIZ } from '../../data/enQuiz'
import { THEMES } from '../../data/themes'
import { shuffle } from '../../utils/shuffle'
import { soundQuizSelect, soundQuizWrong } from '../../services/audioService'

export default function QuizModal() {
  const quizSymbol        = useGameStore(s => s.quizSymbol)
  const selectedDeckId    = useGameStore(s => s.selectedDeckId)
  const language          = useGameStore(s => s.language)
  const theme             = useGameStore(s => s.theme)
  const players           = useGameStore(s => s.players)
  const currentPlayer     = useGameStore(s => s.currentPlayer)
  const answerQuiz        = useGameStore(s => s.answerQuiz)
  const isOnline          = useGameStore(s => s.isOnline)
  const myPlayerId        = useGameStore(s => s.myPlayerId)
  const playerIds         = useGameStore(s => s.playerIds)
  const quizVotes         = useGameStore(s => s.quizVotes)
  const quizCountdownEnd  = useGameStore(s => s.quizCountdownEnd)
  const quizRevealCorrect = useGameStore(s => s.quizRevealCorrect)
  const voteQuiz          = useGameStore(s => s.voteQuiz)
  const triggerReveal     = useGameStore(s => s._triggerReveal)
  const tc                = THEMES[theme]

  const [answered, setAnswered] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(5)

  // Countdown tick
  useEffect(() => {
    if (!quizCountdownEnd) return
    const update = () => setTimeLeft(Math.max(0, Math.ceil((quizCountdownEnd - Date.now()) / 1000)))
    update()
    const id = setInterval(update, 200)
    return () => clearInterval(id)
  }, [quizCountdownEnd])

  // Each client independently triggers reveal when all voted OR countdown expires
  useEffect(() => {
    if (!isOnline || !quizCountdownEnd || quizRevealCorrect) return
    const totalPlayers = playerIds.length > 0 ? playerIds.length : players.length
    const allVoted = Object.keys(quizVotes).length >= totalPlayers && totalPlayers > 0
    if (allVoted) {
      triggerReveal()
      return
    }
    const remaining = quizCountdownEnd - Date.now()
    if (remaining <= 0) { triggerReveal(); return }
    const timer = setTimeout(triggerReveal, remaining)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizVotes, quizCountdownEnd])

  // Stable quiz data — computed once per quizSymbol, never reshuffled on re-render
  const { correct, options, hint } = useMemo(() => {
    if (!quizSymbol) return { correct: '', options: [] as string[], hint: '' }
    const deck   = DECKS.find(d => d.id === selectedDeckId)!
    const item   = deck.pool[quizSymbol]
    const isEn   = language === 'en'
    const enData = isEn ? EN_QUIZ[quizSymbol] : null
    if (isEn && enData) {
      return { correct: enData.correct, options: shuffle([enData.correct, ...enData.wrong]), hint: item.answer }
    }
    const useEn   = isEn && !enData
    const correct = useEn ? (item.answerEn ?? item.answer) : item.answer
    const others  = Object.values(deck.pool)
      .map(d => useEn ? (d.answerEn ?? d.answer) : d.answer)
      .filter(a => a !== correct)
    return {
      correct,
      options: shuffle([correct, ...shuffle(others).slice(0, 3)]),
      hint: (language === 'sk' ? item.hintSk : undefined) ?? item.hint ?? '',
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizSymbol])

  if (!quizSymbol) return null

  const deck   = DECKS.find(d => d.id === selectedDeckId)!
  const item   = deck.pool[quizSymbol]
  const player = players[currentPlayer]
  const tr     = TRANSLATIONS[language]
  const isEn   = language === 'en'
  const enData = isEn ? EN_QUIZ[quizSymbol] : null

  // Online: my vote from store; local: local state
  const myVote        = isOnline ? (quizVotes[myPlayerId] ?? null) : answered
  const revealed      = isOnline ? quizRevealCorrect !== null : !!answered
  const resultCorrect = isOnline ? (quizRevealCorrect ?? correct) : correct
  const isCorrect     = myVote === resultCorrect

  // Play wrong sound when result is revealed and player answered incorrectly
  useEffect(() => {
    if (revealed && myVote && !isCorrect) soundQuizWrong()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed])

  const handleAnswer = (opt: string) => {
    soundQuizSelect()
    if (isOnline) {
      if (!myVote && !quizRevealCorrect) voteQuiz(opt)
    } else {
      if (!answered) setAnswered(opt)
    }
  }

  const handleContinue = () => {
    setAnswered(null)
    answerQuiz(answered === correct)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: tc.overlayBg }}>
      <div className="pop-in w-full max-w-md rounded-2xl p-6 text-center space-y-4"
        style={{ background: tc.modalSurface, border: `1px solid ${tc.modalSurfaceBorder}`, color: tc.text }}>

        <div className="text-sm font-semibold" style={{ color: player.color }}>{player.name}</div>

        <div className="text-7xl leading-none">{quizSymbol}</div>
        {hint && <div className="text-xl font-bold">{hint}</div>}

        <div className="text-base font-medium" style={{ color: tc.textDim }}>
          {tr.deckQuestions[selectedDeckId]}
        </div>

        {/* Online: vote status row + countdown */}
        {isOnline && (
          <div className="flex items-center justify-center gap-3">
            {/* Per-player vote dot */}
            <div className="flex gap-1.5">
              {players.map((p, i) => {
                const voted = !!quizVotes[playerIds[i]]
                return (
                  <div key={i} title={p.name}
                    className="w-2.5 h-2.5 rounded-full transition-all duration-300"
                    style={{ background: voted ? p.color : tc.textFaint, opacity: voted ? 1 : 0.25 }}
                  />
                )
              })}
            </div>
            {/* Countdown */}
            {quizCountdownEnd && !quizRevealCorrect && (
              <span className="text-sm font-bold tabular-nums" style={{ color: timeLeft <= 2 ? tc.errorColor : tc.accent }}>
                {timeLeft}s
              </span>
            )}
          </div>
        )}

        {/* Options */}
        <div className={`grid gap-2 ${isEn ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {options.map((opt: string) => {
            let style: React.CSSProperties = { background: tc.quizOptionBg, border: `2px solid ${tc.quizOptionBorder}`, color: tc.text }
            if (myVote) {
              if (revealed && opt === resultCorrect)   style = { background: tc.successBg, border: `2px solid ${tc.successColor}`, color: tc.successColor }
              else if (revealed && opt === myVote)     style = { background: tc.errorBg,   border: `2px solid ${tc.errorColor}`,   color: tc.errorColor }
              else if (opt === myVote)                 style = { background: tc.accentBgActive, border: `2px solid ${tc.accentBorderActive}`, color: tc.accent }
              else                                     style = { background: tc.quizOptionBg, border: `2px solid ${tc.quizOptionBorder}`, color: tc.textFaint }
            }
            return (
              <button
                key={opt}
                disabled={!!myVote || !!quizRevealCorrect}
                onClick={() => handleAnswer(opt)}
                className={`py-2.5 px-3 rounded-xl font-medium transition-all text-left ${isEn ? 'text-xs' : 'text-sm text-center'}`}
                style={style}
              >
                {opt}
              </button>
            )
          })}
        </div>

        {/* Result message */}
        {myVote && revealed && (
          <div className="text-sm font-medium" style={{ color: isCorrect ? tc.successColor : tc.errorColor }}>
            {isCorrect ? t(tr, 'correct', { answer: resultCorrect }) : t(tr, 'wrong', { answer: resultCorrect })}
          </div>
        )}

        {/* Fun fact */}
        {myVote && revealed && (!isEn || !enData) && item.fact && (
          <div className="text-xs px-4 py-2.5 rounded-xl" style={{ background: tc.factBg, color: tc.factText }}>
            💡 {isEn ? (item.factEn || item.fact) : language === 'sk' ? (item.factSk || item.fact) : item.fact}
          </div>
        )}

        {/* Continue — local game only */}
        {!isOnline && answered && (
          <button
            onClick={handleContinue}
            className="w-full py-3 rounded-xl font-bold transition-all hover:opacity-90"
            style={{ background: tc.accent, color: tc.accentText }}
          >
            {tr.continueBtn}
          </button>
        )}
      </div>
    </div>
  )
}
