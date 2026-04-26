import { DECKS } from '../data/decks'
import { TRANSLATIONS } from '../data/translations'
import { EN_QUIZ } from '../data/enQuiz'
import type { CustomDeckData } from '../types/game'
import type { LightningQuestion } from '../types/game'
import { selectAnswers } from './quizValidation'

type Language = 'cs' | 'sk' | 'en'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function buildPubQuizQuestions(
  deckId: string,
  customDeck: CustomDeckData | null,
  language: Language,
  count: number,
): LightningQuestion[] {
  const isCustom = customDeck && customDeck.id === deckId
  const isEn = language === 'en'

  if (isCustom) {
    const isTextDeck = customDeck.deck_type === 'text'
    const allSymbols = shuffle(Object.keys(customDeck.pool))
    const allQuestions = allSymbols.flatMap((symbol): LightningQuestion[] => {
      const item = customDeck.pool[symbol]
      if (item.answers && item.answers.length > 0) {
        const { options, correct } = selectAnswers(item.answers, item.display_count || 4)
        if (correct && options.length >= 2) {
          return [{
            symbol,
            label: item.label,
            imageUrl: isTextDeck ? undefined : (item.image_url || undefined),
            audioUrl: item.audio_url || undefined,
            isTextCard: isTextDeck,
            question: item.quiz_question || item.label,
            options,
            correct,
            funFact: item.fun_fact || undefined,
          }]
        }
      }
      if (item.quiz_options && item.quiz_correct) {
        return [{
          symbol,
          label: item.label,
          imageUrl: isTextDeck ? undefined : (item.image_url || undefined),
          audioUrl: item.audio_url || undefined,
          isTextCard: isTextDeck,
          question: item.quiz_question || item.label,
          options: shuffle([...item.quiz_options]),
          correct: item.quiz_correct,
          funFact: item.fun_fact || undefined,
        }]
      }
      return []
    })
    return count === 0 ? allQuestions : allQuestions.slice(0, count)
  }

  const deck = DECKS.find(d => d.id === deckId) ?? DECKS[0]
  const tr = TRANSLATIONS[language]
  const allSymbols = shuffle(Object.keys(deck.pool))
  const selected = count === 0 ? allSymbols : allSymbols.slice(0, count)

  return selected.map(symbol => {
    const item = deck.pool[symbol]
    const enData = isEn ? EN_QUIZ[symbol] : null

    if (isEn && enData) {
      return {
        symbol,
        label: symbol,
        question: tr.factQuestion,
        options: shuffle([enData.correct, ...enData.wrong]),
        correct: enData.correct,
      }
    }

    const isSk = language === 'sk'
    const correct = isEn ? (item.answerEn ?? item.answer) : isSk ? (item.answerSk ?? item.answer) : item.answer
    const question = tr.deckQuestions[deck.id as 'flags' | 'animals' | 'fruits']
    const distractors = shuffle(
      allSymbols
        .filter(s => s !== symbol)
        .map(s => isEn ? (deck.pool[s].answerEn ?? deck.pool[s].answer) : isSk ? (deck.pool[s].answerSk ?? deck.pool[s].answer) : deck.pool[s].answer)
        .filter(a => a !== correct)
    ).slice(0, 3)

    return {
      symbol,
      label: isSk ? (item.hintSk ?? item.answer) : item.answer,
      question,
      options: shuffle([correct, ...distractors]),
      correct,
    }
  })
}
