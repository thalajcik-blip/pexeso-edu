import { shuffle } from './shuffle'
import type { AnswerOption } from '../types/game'

export type ValidationState = 'valid' | 'incomplete' | 'pool-error'

export interface ValidationResult {
  state: ValidationState
  message: string
}

export function validateAnswers(answers: AnswerOption[], displayCount: number): ValidationResult {
  if (answers.length === 0) {
    return { state: 'incomplete', message: 'Zatím žádné odpovědi' }
  }

  const correct = answers.filter(a => a.correct)
  const incorrect = answers.filter(a => !a.correct)

  if (correct.length === 0) {
    return { state: 'incomplete', message: 'Chybí alespoň 1 správná odpověď' }
  }
  if (incorrect.length === 0) {
    return { state: 'incomplete', message: 'Chybí alespoň 1 nesprávná odpověď' }
  }
  if (answers.length < displayCount) {
    return {
      state: 'pool-error',
      message: `Pool má jen ${answers.length} možností, nastav Zobrazit na max ${answers.length}`,
    }
  }

  return {
    state: 'valid',
    message: `${correct.length} správná, ${incorrect.length} nesprávných, zobrazí se ${displayCount}`,
  }
}

export function selectAnswers(
  answers: AnswerOption[],
  displayCount: number,
): { options: string[]; correct: string } {
  const correctPool = answers.filter(a => a.correct)
  const incorrectPool = answers.filter(a => !a.correct)

  const selectedCorrect = shuffle([...correctPool]).slice(0, 1)
  const needed = Math.max(0, displayCount - 1)
  const selectedIncorrect = shuffle([...incorrectPool]).slice(0, needed)

  const options = shuffle([...selectedCorrect, ...selectedIncorrect]).map(a => a.text)
  return { options, correct: selectedCorrect[0]?.text ?? '' }
}
