export type DeckId = 'animals' | 'flags' | 'fruits' | 'jobs'
export type BoardSize = 'large' | 'medium' | 'small'
export type GamePhase = 'setup' | 'lobby' | 'playing' | 'quiz' | 'win'

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
}

export interface CardData {
  id: number
  symbol: string
  state: 'hidden' | 'flipped' | 'matched'
}

export const SIZE_CONFIG: Record<BoardSize, { cols: number; pairs: number }> = {
  large:  { cols: 8, pairs: 32 },
  medium: { cols: 6, pairs: 18 },
  small:  { cols: 4, pairs: 8  },
}

export const PLAYER_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12']
export const DEFAULT_NAMES  = ['Hráč 1', 'Hráč 2', 'Hráč 3', 'Hráč 4']
