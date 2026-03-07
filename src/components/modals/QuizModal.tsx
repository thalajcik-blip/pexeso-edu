import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { DECKS } from '../../data/decks'
import { shuffle } from '../../utils/shuffle'

export default function QuizModal() {
  const quizSymbol = useGameStore(s => s.quizSymbol)
  const selectedDeckId = useGameStore(s => s.selectedDeckId)
  const players = useGameStore(s => s.players)
  const currentPlayer = useGameStore(s => s.currentPlayer)
  const answerQuiz = useGameStore(s => s.answerQuiz)

  const [answered, setAnswered] = useState<string | null>(null)

  if (!quizSymbol) return null

  const deck = DECKS.find(d => d.id === selectedDeckId)!
  const item = deck.pool[quizSymbol]
  const correct = item.answer
  const player = players[currentPlayer]

  const others = Object.values(deck.pool).map(d => d.answer).filter(a => a !== correct)
  const options = shuffle([correct, ...shuffle(others).slice(0, 3)])

  const handleAnswer = (opt: string) => {
    if (answered) return
    setAnswered(opt)
  }

  const handleContinue = () => {
    const isCorrect = answered === correct
    setAnswered(null)
    answerQuiz(isCorrect)
  }

  const isCorrect = answered === correct

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(13,27,42,0.95)' }}>
      <div className="pop-in w-full max-w-md rounded-2xl p-6 text-center space-y-4"
        style={{ background: 'linear-gradient(160deg, #111f2e 0%, #1a2f4a 100%)', border: '1px solid rgba(255,255,255,0.1)' }}>

        {/* Player tag */}
        <div className="text-sm font-semibold" style={{ color: player.color }}>
          {player.name}
        </div>

        {/* Emoji */}
        <div className="text-7xl leading-none">{quizSymbol}</div>
        {item.hint && <div className="text-xl font-bold">{item.hint}</div>}

        {/* Question */}
        <div className="text-base font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>
          {deck.question}
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-2">
          {options.map(opt => {
            let style: React.CSSProperties = { background: 'rgba(255,255,255,0.07)', border: '2px solid rgba(255,255,255,0.12)', color: '#fff' }
            if (answered) {
              if (opt === correct) style = { background: 'rgba(46,204,113,0.25)', border: '2px solid #2ecc71', color: '#2ecc71' }
              else if (opt === answered) style = { background: 'rgba(231,76,60,0.25)', border: '2px solid #e74c3c', color: '#e74c3c' }
              else style = { ...style, opacity: 0.4 }
            }
            return (
              <button
                key={opt}
                disabled={!!answered}
                onClick={() => handleAnswer(opt)}
                className="py-2.5 px-3 rounded-xl text-sm font-semibold transition-all"
                style={style}
              >
                {opt}
              </button>
            )
          })}
        </div>

        {/* Result */}
        {answered && (
          <div className="text-sm font-medium" style={{ color: isCorrect ? '#2ecc71' : '#e74c3c' }}>
            {isCorrect ? `🎉 Správně! „${correct}" je správná odpověď.` : `❌ Špatně. Správně je „${correct}".`}
          </div>
        )}

        {/* Fact */}
        {answered && item.fact && (
          <div className="text-xs px-4 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>
            💡 {item.fact}
          </div>
        )}

        {/* Continue */}
        {answered && (
          <button
            onClick={handleContinue}
            className="w-full py-3 rounded-xl font-bold transition-all hover:opacity-90"
            style={{ background: '#f9d74e', color: '#0d1b2a' }}
          >
            Pokračovat →
          </button>
        )}
      </div>
    </div>
  )
}
