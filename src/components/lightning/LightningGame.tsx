import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import { useGameStore } from '../../store/gameStore'
import { TRANSLATIONS } from '../../data/translations'
import { THEMES } from '../../data/themes'

const OPTION_LABELS = ['A', 'B', 'C', 'D']

export default function LightningGame() {
  const phase                    = useGameStore(s => s.phase)
  const lightningQuestions       = useGameStore(s => s.lightningQuestions)
  const lightningCurrentIndex    = useGameStore(s => s.lightningCurrentIndex)
  const lightningAnswers         = useGameStore(s => s.lightningAnswers)
  const lightningTimeLimit       = useGameStore(s => s.lightningTimeLimit)
  const answerLightningQuestion  = useGameStore(s => s.answerLightningQuestion)
  const nextLightningQuestion    = useGameStore(s => s.nextLightningQuestion)
  const startLightningGame       = useGameStore(s => s.startLightningGame)
  const resetToSetup             = useGameStore(s => s.resetToSetup)
  const language                 = useGameStore(s => s.language)
  const theme                    = useGameStore(s => s.theme)
  const tr = TRANSLATIONS[language]
  const tc = THEMES[theme]

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(lightningTimeLimit)

  const question = lightningQuestions[lightningCurrentIndex]
  const isReveal  = phase === 'lightning_reveal'
  const isResults = phase === 'lightning_results'
  const total     = lightningQuestions.length

  // Timer countdown
  useEffect(() => {
    if (phase !== 'lightning_playing') return
    setTimeLeft(lightningTimeLimit)
    setSelectedAnswer(null)
    const start = Date.now()
    let rafId: number
    const tick = () => {
      const remaining = lightningTimeLimit - (Date.now() - start) / 1000
      if (remaining <= 0) {
        setTimeLeft(0)
        setSelectedAnswer('')
        answerLightningQuestion('')
      } else {
        setTimeLeft(remaining)
        rafId = requestAnimationFrame(tick)
      }
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightningCurrentIndex, phase])

  // Auto-advance after reveal
  useEffect(() => {
    if (phase !== 'lightning_reveal') return
    const timer = setTimeout(() => nextLightningQuestion(), 1500)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lightningCurrentIndex])

  // Confetti on results
  useEffect(() => {
    if (phase !== 'lightning_results') return
    const correct = lightningAnswers.filter(a => a.correct).length
    const accuracy = total > 0 ? correct / total : 0
    if (accuracy < 0.5) return
    const colors = theme === 'light' ? ['#6d41a1', '#ffffff', '#c4a8e8'] : ['#f9d74e', '#ffffff', '#1a237e']
    const end = Date.now() + 2000
    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors })
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }, [phase])

  function handleAnswer(answer: string) {
    if (phase !== 'lightning_playing' || selectedAnswer !== null) return
    setSelectedAnswer(answer)
    answerLightningQuestion(answer)
  }

  function getOptionStyle(option: string) {
    if (!isReveal) {
      if (selectedAnswer === option) return { background: tc.accentGradient, color: tc.accentText, border: `2px solid ${tc.accent}` }
      return { background: tc.btnInactiveBg, color: tc.btnInactiveText, border: `2px solid ${tc.btnInactiveBorder}` }
    }
    if (option === question.correct) return { background: '#22c55e', color: '#fff', border: '2px solid #16a34a' }
    if (option === selectedAnswer) return { background: '#ef4444', color: '#fff', border: '2px solid #dc2626' }
    return { background: tc.btnInactiveBg, color: tc.btnInactiveText, border: `2px solid ${tc.btnInactiveBorder}`, opacity: '0.35' }
  }

  // Results screen
  if (isResults) {
    const correctCount = lightningAnswers.filter(a => a.correct).length
    const accuracy = total > 0 ? Math.round(correctCount / total * 100) : 0
    const avgTimeS = lightningAnswers.length > 0
      ? (lightningAnswers.reduce((s, a) => s + a.timeMs, 0) / lightningAnswers.length / 1000).toFixed(1)
      : '—'

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: tc.winOverlayBg }}>
        <div className="pop-in rounded-2xl p-10 text-center w-full max-w-sm"
          style={{ background: tc.modalSurface, border: `2px solid ${tc.accent}`, boxShadow: `0 0 60px ${tc.accentGlow}`, color: tc.text }}>

          <div className="text-4xl mb-1">⚡</div>
          <div className="text-2xl font-bold mb-1" style={{ color: tc.accent }}>{tr.soloGameOver}</div>
          <div className="text-xs uppercase tracking-widest mb-8" style={{ color: tc.textMuted }}>{tr.results}</div>

          <div className="flex flex-col gap-4 text-left mb-2">
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
          </div>

          <button
            onClick={startLightningGame}
            className="mt-8 px-10 py-2.5 rounded-xl font-bold transition-transform hover:scale-105 w-full"
            style={{ background: tc.accentGradient, color: tc.accentText }}
          >
            {tr.playAgain}
          </button>
          <button
            onClick={resetToSetup}
            className="block mx-auto mt-3 text-sm transition-opacity opacity-35 hover:opacity-70"
          >
            {tr.chooseDeck}
          </button>
        </div>
      </div>
    )
  }

  if (!question) return null

  const timerPct = ((lightningTimeLimit - timeLeft) / lightningTimeLimit) * 100
  const timerColor = timeLeft <= 5 ? '#ef4444' : timeLeft <= 10 ? '#f97316' : tc.accent
  const isTimedOut = selectedAnswer === '' && isReveal
  const lastAnswer = lightningAnswers[lightningAnswers.length - 1]

  return (
    <div className="min-h-screen flex flex-col px-4 pt-4 pb-6" style={{ background: tc.bg, color: tc.text }}>

      {/* Question number */}
      <div className="text-center text-sm font-bold tabular-nums mb-3" style={{ color: tc.textMuted }}>
        {lightningCurrentIndex + 1}/{total}
      </div>

      {/* Timer bar */}
      <div className="max-w-lg mx-auto w-full mb-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: tc.scorePillBg }}>
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{ width: `${timerPct}%`, background: timerColor }}
            />
          </div>
          <span className="text-sm font-bold tabular-nums w-7 text-right" style={{ color: timerColor }}>
            {isReveal ? '' : Math.ceil(timeLeft)}
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

      {/* Timed out / reveal feedback */}
      <div className="text-center text-sm mb-4 h-5 flex items-center justify-center" style={{ color: tc.textMuted }}>
        {isReveal && (
          isTimedOut
            ? <span style={{ color: '#ef4444' }}>{tr.lightningTimeUp}</span>
            : lastAnswer?.correct
              ? <span style={{ color: '#22c55e' }}>✓ {language === 'cs' ? 'Správně!' : language === 'sk' ? 'Správne!' : 'Correct!'}</span>
              : <span style={{ color: '#ef4444' }}>✗ {language === 'cs' ? 'Špatně.' : language === 'sk' ? 'Zle.' : 'Wrong.'}</span>
        )}
      </div>

      {/* Answer options 2x2 */}
      <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto w-full">
        {question.options.map((option, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(option)}
            disabled={isReveal || selectedAnswer !== null}
            className="py-3 px-3 rounded-xl border-2 font-semibold text-sm text-left transition-all cursor-pointer disabled:cursor-default"
            style={getOptionStyle(option)}
          >
            <span className="opacity-60 mr-1.5 text-xs font-bold">{OPTION_LABELS[i]}</span>
            {option}
          </button>
        ))}
      </div>

    </div>
  )
}
