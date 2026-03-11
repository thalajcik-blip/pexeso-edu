export type DeckId = 'animals' | 'flags' | 'fruits' | 'jobs'
export type BoardSize = 'large' | 'medium' | 'small'
export type GamePhase = 'setup' | 'lobby' | 'playing' | 'quiz' | 'win' | 'lightning_playing' | 'lightning_reveal' | 'lightning_results'

export interface LightningQuestion {
  symbol: string       // emoji for static, pool key for custom
  label: string        // display name
  imageUrl?: string    // custom deck image
  question: string
  options: string[]    // 4 shuffled options
  correct: string
  funFact?: string     // shown after reveal
}

export interface LightningAnswer {
  correct: boolean
  timeMs: number
}

export interface CustomDeckCard {
  image_url: string
  label: string
  quiz_question: string | null
  quiz_options: [string, string, string, string] | null
  quiz_correct: string | null
  fun_fact: string | null
  translations?: Record<string, { quiz_question?: string; quiz_options?: string[]; quiz_correct?: string; fun_fact?: string }>
}

export interface CustomDeckData {
  id: string
  title: string
  thumbnail: string | null  // first card image_url
  pool: Record<string, CustomDeckCard>  // keyed by image_url
}

export interface DeckItem {
  hint: string | null
  hintSk?: string
  answer: string
  answerEn?: string
  fact: string
  factSk?: string
  factEn?: string
}

export interface Deck {
  id: DeckId
  label: string
  icon: string
  question: string
  pool: Record<string, DeckItem>
}

export interface Player {
  name: string
  color: string
  score: number
  pairs: number
  quizzes: number
  wrongQuizzes: number
}

export interface CardData {
  id: number
  symbol: string
  state: 'hidden' | 'flipped' | 'matched' | 'wrong'
  matchedBy?: number   // player index
  quizCorrect?: boolean
}

export const SIZE_CONFIG: Record<BoardSize, { cols: number; pairs: number }> = {
  large:  { cols: 8, pairs: 32 },
  medium: { cols: 6, pairs: 18 },
  small:  { cols: 4, pairs: 8  },
}

export const PLAYER_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c']
export const DEFAULT_NAMES  = ['Hráč 1', 'Hráč 2', 'Hráč 3', 'Hráč 4', 'Hráč 5', 'Hráč 6']
