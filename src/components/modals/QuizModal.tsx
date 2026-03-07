import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { DECKS } from '../../data/decks'
import { TRANSLATIONS, t } from '../../data/translations'
import { EN_QUIZ } from '../../data/enQuiz'
import { THEMES } from '../../data/themes'
import { shuffle } from '../../utils/shuffle'

export default function QuizModal() {
  const quizSymbol        = useGameStore(s => s.quizSymbol)
  const selectedDeckId    = useGameStore(s => s.selectedDeckId)
  const language          = useGameStore(s => s.language)
  const theme             = useGameStore(s => s.theme)
  const players           = useGameStore(s => s.players)
  const currentPlayer     = useGameStore(s => s.currentPlayer)
  const answerQuiz        = useGameStore(s => s.answerQuiz)
  const isOnline          = useGameStore(s => s.isOnline)
  const myPlayerIndex     = useGameStore(s => s.myPlayerIndex)
  const quizRemoteAnswer  = useGameStore(s => s.quizRemoteAnswer)
  const quizShowResult    = useGameStore(s => s.quizShowResult)
  const broadcastQuizPick = useGameStore(s => s.broadcastQuizPick)
  const tc                = THEMES[theme]

  const [answered, setAnswered] = useState<string | null>(null)

  const isSpectator = isOnline && myPlayerIndex !== currentPlayer
  // What answer is visually highlighted
  const displayAnswered = isSpectator ? quizRemoteAnswer : answered

  if (!quizSymbol) return null

  const deck   = DECKS.find(d => d.id === selectedDeckId)!
  const item   = deck.pool[quizSymbol]
  const player = players[currentPlayer]
  const tr     = TRANSLATIONS[language]

  // EN mode: use dedicated EN quiz data if available, else fall back to fact-based
  const isEn = language === 'en'
  const enData = isEn ? EN_QUIZ[quizSymbol] : null

  let correct: string
  let options: string[]
  let hint: string

  if (isEn && enData) {
    correct = enData.correct
    options = shuffle([correct, ...enData.wrong])
    hint    = item.answer  // English name (e.g. "Fox")
  } else {
    // CS/SK translation quiz, or EN flags fallback (answerEn)
    const useEn = isEn && !enData
    correct = useEn ? (item.answerEn ?? item.answer) : item.answer
    const others = Object.values(deck.pool)
      .map(d => useEn ? (d.answerEn ?? d.answer) : d.answer)
      .filter(a => a !== correct)
    options = shuffle([correct, ...shuffle(others).slice(0, 3)])
    hint    = (language === 'sk' ? item.hintSk : undefined) ?? item.hint ?? ''
  }

  const handleAnswer = (opt: string) => {
    if (!answered && !isSpectator) {
      setAnswered(opt)
      if (isOnline) broadcastQuizPick(opt)
    }
  }

  const handleContinue = () => {
    const isCorrect = answered === correct
    setAnswered(null)
    answerQuiz(isCorrect)
  }

  const isCorrect = displayAnswered === correct

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

        {/* Spectator waiting hint */}
        {isSpectator && !displayAnswered && (
          <div className="text-xs text-center" style={{ color: tc.textFaint }}>
            ⏳ {player.name}...
          </div>
        )}

        {/* Options — 1 col for EN facts (long text), 2 col for CS/SK translations */}
        <div className={`grid gap-2 ${isEn ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {options.map(opt => {
            let style: React.CSSProperties = { background: tc.quizOptionBg, border: `2px solid ${tc.quizOptionBorder}`, color: tc.text }
            const showResult = isSpectator ? quizShowResult : !!answered
            if (displayAnswered) {
              if (showResult && opt === correct)            style = { background: tc.successBg, border: `2px solid ${tc.successColor}`, color: tc.successColor }
              else if (showResult && opt === displayAnswered) style = { background: tc.errorBg,   border: `2px solid ${tc.errorColor}`,   color: tc.errorColor }
              else if (opt === displayAnswered)             style = { background: tc.accentBgActive, border: `2px solid ${tc.accentBorderActive}`, color: tc.accent }
              else                                          style = { background: tc.quizOptionBg, border: `2px solid ${tc.quizOptionBorder}`, color: tc.textFaint }
            }
            return (
              <button
                key={opt}
                disabled={!!displayAnswered || isSpectator}
                onClick={() => handleAnswer(opt)}
                className={`py-2.5 px-3 rounded-xl font-medium transition-all text-left ${isEn ? 'text-xs' : 'text-sm text-center'}`}
                style={style}
              >
                {opt}
              </button>
            )
          })}
        </div>

        {/* Result message — shown after answer (local) or after quiz_result arrives (spectator) */}
        {displayAnswered && (isSpectator ? quizShowResult : true) && (
          <div className="text-sm font-medium" style={{ color: isCorrect ? tc.successColor : tc.errorColor }}>
            {isCorrect ? t(tr, 'correct', { answer: correct }) : t(tr, 'wrong', { answer: correct })}
          </div>
        )}

        {/* Fun fact — shown after answer (CS/SK/EN flags); for spectators shown during quizShowResult */}
        {displayAnswered && (isSpectator ? quizShowResult : true) && (!isEn || !enData) && item.fact && (
          <div className="text-xs px-4 py-2.5 rounded-xl" style={{ background: tc.factBg, color: tc.factText }}>
            💡 {isEn ? (item.factEn || item.fact) : language === 'sk' ? (item.factSk || item.fact) : item.fact}
          </div>
        )}

        {/* Continue button — only for active player */}
        {!isSpectator && answered && (
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
