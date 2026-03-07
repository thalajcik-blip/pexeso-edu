import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { DECKS } from '../../data/decks'
import { TRANSLATIONS } from '../../data/translations'
import { EN_QUIZ } from '../../data/enQuiz'
import { THEMES } from '../../data/themes'
import { shuffle } from '../../utils/shuffle'

export default function QuizModal() {
  const quizSymbol    = useGameStore(s => s.quizSymbol)
  const selectedDeckId = useGameStore(s => s.selectedDeckId)
  const language      = useGameStore(s => s.language)
  const theme         = useGameStore(s => s.theme)
  const players       = useGameStore(s => s.players)
  const currentPlayer = useGameStore(s => s.currentPlayer)
  const answerQuiz    = useGameStore(s => s.answerQuiz)
  const tc            = THEMES[theme]

  const [answered, setAnswered] = useState<string | null>(null)

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
    // CS / SK: translation quiz
    correct = item.answer
    const others = Object.values(deck.pool).map(d => d.answer).filter(a => a !== correct)
    options = shuffle([correct, ...shuffle(others).slice(0, 3)])
    hint    = item.hint ?? ''
  }

  const handleAnswer = (opt: string) => { if (!answered) setAnswered(opt) }

  const handleContinue = () => {
    const isCorrect = answered === correct
    setAnswered(null)
    answerQuiz(isCorrect)
  }

  const isCorrect = answered === correct

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

        {/* Options — 1 col for EN facts (long text), 2 col for CS/SK translations */}
        <div className={`grid gap-2 ${isEn ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {options.map(opt => {
            let style: React.CSSProperties = { background: tc.quizOptionBg, border: `2px solid ${tc.quizOptionBorder}`, color: tc.text }
            if (answered) {
              if (opt === correct)       style = { background: 'rgba(46,204,113,0.25)',  border: '2px solid #2ecc71', color: '#2ecc71' }
              else if (opt === answered) style = { background: 'rgba(231,76,60,0.25)', border: '2px solid #e74c3c', color: '#e74c3c' }
              else                       style = { background: tc.quizOptionBg, border: `2px solid ${tc.quizOptionBorder}`, color: tc.textFaint }
            }
            return (
              <button
                key={opt}
                disabled={!!answered}
                onClick={() => handleAnswer(opt)}
                className={`py-2.5 px-3 rounded-xl font-medium transition-all text-left ${isEn ? 'text-xs' : 'text-sm text-center'}`}
                style={style}
              >
                {opt}
              </button>
            )
          })}
        </div>

        {answered && (
          <div className="text-sm font-medium" style={{ color: isCorrect ? '#2ecc71' : '#e74c3c' }}>
            {isCorrect ? tr.correct : tr.wrong}
          </div>
        )}

        {/* Show fact in CS/SK mode */}
        {answered && !isEn && item.fact && (
          <div className="text-xs px-4 py-2.5 rounded-xl" style={{ background: tc.factBg, color: tc.factText }}>
            💡 {item.fact}
          </div>
        )}

        {answered && (
          <button
            onClick={handleContinue}
            className="w-full py-3 rounded-xl font-bold transition-all hover:opacity-90"
            style={{ background: '#f9d74e', color: '#0d1b2a' }}
          >
            {tr.continueBtn}
          </button>
        )}
      </div>
    </div>
  )
}
