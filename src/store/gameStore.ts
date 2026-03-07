import { create } from 'zustand'
import type { DeckId, BoardSize, GamePhase, CardData, Player } from '../types/game'
import { SIZE_CONFIG, PLAYER_COLORS, DEFAULT_NAMES } from '../types/game'
import { DECKS } from '../data/decks'
import { shuffle } from '../utils/shuffle'
import type { Language } from '../data/translations'
import { TRANSLATIONS } from '../data/translations'
import type { Theme } from '../data/themes'

interface GameStore {
  // Setup
  language: Language
  theme: Theme
  selectedDeckId: DeckId
  selectedSize: BoardSize
  numPlayers: number
  playerNames: string[]

  // Game
  phase: GamePhase
  cards: CardData[]
  players: Player[]
  currentPlayer: number
  flipped: number[]
  locked: boolean
  turnMessage: string

  // Quiz
  quizSymbol: string | null

  // Rules
  rulesOpen: boolean

  // Actions
  setLanguage: (lang: Language) => void
  toggleTheme: () => void
  selectDeck: (id: DeckId) => void
  selectSize: (size: BoardSize) => void
  setNumPlayers: (n: number) => void
  setPlayerName: (i: number, name: string) => void
  startGame: () => void
  flipCard: (index: number) => void
  answerQuiz: (correct: boolean) => void
  playAgain: () => void
  resetToSetup: () => void
  openRules: () => void
  closeRules: () => void
  debugEndGame: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Setup defaults
  language: 'cs',
  theme: 'dark',
  selectedDeckId: 'animals',
  selectedSize: 'large',
  numPlayers: 2,
  playerNames: [...DEFAULT_NAMES],

  // Game defaults
  phase: 'setup',
  cards: [],
  players: [],
  currentPlayer: 0,
  flipped: [],
  locked: false,
  turnMessage: '',
  quizSymbol: null,
  rulesOpen: false,

  setLanguage: (lang) => set({ language: lang, playerNames: [...TRANSLATIONS[lang].defaultPlayerNames] }),
  toggleTheme: () => set(s => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
  selectDeck: (id) => set({ selectedDeckId: id }),
  selectSize: (size) => set({ selectedSize: size }),
  setNumPlayers: (n) => set({ numPlayers: n }),
  setPlayerName: (i, name) => {
    const names = [...get().playerNames]
    names[i] = name
    set({ playerNames: names })
  },

  startGame: () => {
    const { selectedDeckId, selectedSize, numPlayers, playerNames } = get()
    const deck = DECKS.find(d => d.id === selectedDeckId)!
    const size = SIZE_CONFIG[selectedSize]

    const symbols = shuffle(Object.keys(deck.pool)).slice(0, size.pairs)
    const cardSymbols = shuffle([...symbols, ...symbols])
    const cards: CardData[] = cardSymbols.map((symbol, id) => ({ id, symbol, state: 'hidden' }))

    const players: Player[] = Array.from({ length: numPlayers }, (_, i) => ({
      name: playerNames[i]?.trim() || TRANSLATIONS[get().language].defaultPlayerNames[i],
      color: PLAYER_COLORS[i],
      score: 0,
      pairs: 0,
      quizzes: 0,
    }))

    set({ phase: 'playing', cards, players, currentPlayer: 0, flipped: [], locked: false, turnMessage: '', quizSymbol: null })
  },

  flipCard: (index) => {
    const { locked, cards, flipped, players, currentPlayer } = get()
    if (locked || cards[index].state !== 'hidden') return

    const newCards = cards.map((c, i) => i === index ? { ...c, state: 'flipped' as const } : c)
    const newFlipped = [...flipped, index]
    set({ cards: newCards, flipped: newFlipped })

    if (newFlipped.length < 2) return

    set({ locked: true })
    const [a, b] = newFlipped

    if (newCards[a].symbol === newCards[b].symbol) {
      // Match!
      setTimeout(() => {
        const matchedCards = get().cards.map((c, i) =>
          i === a || i === b ? { ...c, state: 'matched' as const } : c
        )
        const updatedPlayers = get().players.map((p, i) =>
          i === currentPlayer ? { ...p, score: p.score + 1, pairs: p.pairs + 1 } : p
        )
        set({ cards: matchedCards, players: updatedPlayers, flipped: [], quizSymbol: newCards[a].symbol, phase: 'quiz' })
      }, 500)
    } else {
      // No match
      setTimeout(() => {
        const resetCards = get().cards.map((c, i) =>
          i === a || i === b ? { ...c, state: 'hidden' as const } : c
        )
        const nextPlayer = (currentPlayer + 1) % players.length
        set({ cards: resetCards, flipped: [], locked: false, currentPlayer: nextPlayer, turnMessage: '' })
      }, 950)
    }
  },

  answerQuiz: (correct) => {
    const { players, currentPlayer, cards } = get()
    const updatedPlayers = players.map((p, i) =>
      i === currentPlayer && correct ? { ...p, score: p.score + 1, quizzes: p.quizzes + 1 } : p
    )
    const allMatched = cards.every(c => c.state === 'matched')
    const playerName = players[currentPlayer].name
    const msg = correct
      ? `✓ Správně! ${playerName} hraje znovu.`
      : `✗ Škoda. ${playerName} hraje znovu.`

    set({
      players: updatedPlayers,
      quizSymbol: null,
      phase: allMatched ? 'win' : 'playing',
      locked: false,
      turnMessage: allMatched ? '' : msg,
    })
  },

  playAgain: () => {
    const { players, selectedDeckId, selectedSize } = get()
    const deck = DECKS.find(d => d.id === selectedDeckId)!
    const size = SIZE_CONFIG[selectedSize]

    const symbols = shuffle(Object.keys(deck.pool)).slice(0, size.pairs)
    const cardSymbols = shuffle([...symbols, ...symbols])
    const cards: CardData[] = cardSymbols.map((symbol, id) => ({ id, symbol, state: 'hidden' }))
    const resetPlayers = players.map(p => ({ ...p, score: 0, pairs: 0, quizzes: 0 }))

    set({ phase: 'playing', cards, players: resetPlayers, currentPlayer: 0, flipped: [], locked: false, turnMessage: '', quizSymbol: null })
  },

  resetToSetup: () => set({ phase: 'setup', cards: [], players: [], quizSymbol: null }),

  openRules: () => set({ rulesOpen: true }),
  closeRules: () => set({ rulesOpen: false }),

  debugEndGame: () => {
    const players = get().players.map(p => ({
      ...p,
      pairs: Math.floor(Math.random() * 10),
      quizzes: Math.floor(Math.random() * 5),
      score: 0,
    })).map(p => ({ ...p, score: p.pairs + p.quizzes }))
    set({ players, phase: 'win' })
  },
}))
