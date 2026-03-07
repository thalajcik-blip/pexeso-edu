import { create } from 'zustand'
import type { DeckId, BoardSize, GamePhase, CardData, Player } from '../types/game'
import { SIZE_CONFIG, PLAYER_COLORS, DEFAULT_NAMES } from '../types/game'
import { DECKS } from '../data/decks'
import { shuffle } from '../utils/shuffle'
import type { Language } from '../data/translations'
import { TRANSLATIONS } from '../data/translations'
import type { Theme } from '../data/themes'
import {
  broadcastGameAction,
  joinRealtimeChannel,
  leaveRealtimeChannel,
  createRoomInDb,
  fetchRoomFromDb,
  deleteRoomFromDb,
  generateRoomCode,
  getPlayerId,
} from '../services/multiplayerService'
import type { LobbyPlayer, GameAction } from '../services/multiplayerService'

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

  // Multiplayer
  isOnline: boolean
  roomId: string | null
  myPlayerId: string
  myPlayerIndex: number
  isHost: boolean
  lobbyPlayers: LobbyPlayer[]

  // Setup actions
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

  // Multiplayer actions
  goToLobby: () => void
  createRoom: (myName: string) => Promise<void>
  joinRoom: (code: string, myName: string) => Promise<void>
  leaveRoom: () => void
  startOnlineGame: () => void

  // Internal (used by multiplayer service callbacks)
  _setLobbyPlayers: (players: LobbyPlayer[]) => void
  _applyAction: (action: GameAction) => void
  _flipCard: (index: number) => void
  _answerQuiz: (correct: boolean) => void
  _applyGameStart: (cards: CardData[], playerNames: string[], deckId: string, size: string) => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Defaults
  language: 'cs',
  theme: 'dark',
  selectedDeckId: 'flags',
  selectedSize: 'large',
  numPlayers: 2,
  playerNames: [...DEFAULT_NAMES],
  phase: 'setup',
  cards: [],
  players: [],
  currentPlayer: 0,
  flipped: [],
  locked: false,
  turnMessage: '',
  quizSymbol: null,
  rulesOpen: false,
  isOnline: false,
  roomId: null,
  myPlayerId: '',
  myPlayerIndex: 0,
  isHost: false,
  lobbyPlayers: [],

  // Setup actions
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
      score: 0, pairs: 0, quizzes: 0,
    }))
    set({ phase: 'playing', cards, players, currentPlayer: 0, flipped: [], locked: false, turnMessage: '', quizSymbol: null })
  },

  // Internal: pure game logic without broadcasting
  _flipCard: (index) => {
    const { locked, cards, flipped, players, currentPlayer } = get()
    if (locked || cards[index].state !== 'hidden') return

    const newCards = cards.map((c, i) => i === index ? { ...c, state: 'flipped' as const } : c)
    const newFlipped = [...flipped, index]
    set({ cards: newCards, flipped: newFlipped })

    if (newFlipped.length < 2) return

    set({ locked: true })
    const [a, b] = newFlipped

    if (newCards[a].symbol === newCards[b].symbol) {
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
      setTimeout(() => {
        const resetCards = get().cards.map((c, i) =>
          i === a || i === b ? { ...c, state: 'hidden' as const } : c
        )
        const nextPlayer = (currentPlayer + 1) % players.length
        set({ cards: resetCards, flipped: [], locked: false, currentPlayer: nextPlayer, turnMessage: '' })
      }, 950)
    }
  },

  _answerQuiz: (correct) => {
    const { players, currentPlayer, cards } = get()
    const updatedPlayers = players.map((p, i) =>
      i === currentPlayer && correct ? { ...p, score: p.score + 1, quizzes: p.quizzes + 1 } : p
    )
    const allMatched = cards.every(c => c.state === 'matched')
    const playerName = players[currentPlayer].name
    const tr = TRANSLATIONS[get().language]
    const msg = correct
      ? tr.turnCorrect.replace('{name}', playerName)
      : tr.turnWrong.replace('{name}', playerName)
    set({
      players: updatedPlayers,
      quizSymbol: null,
      phase: allMatched ? 'win' : 'playing',
      locked: false,
      turnMessage: allMatched ? '' : msg,
    })
  },

  _applyGameStart: (cards, playerNames, deckId, size) => {
    const { language } = get()
    const players: Player[] = playerNames.map((name, i) => ({
      name: name.trim() || TRANSLATIONS[language].defaultPlayerNames[i],
      color: PLAYER_COLORS[i],
      score: 0, pairs: 0, quizzes: 0,
    }))
    set({
      selectedDeckId: deckId as DeckId,
      selectedSize: size as BoardSize,
      phase: 'playing',
      cards,
      players,
      currentPlayer: 0,
      flipped: [],
      locked: false,
      turnMessage: '',
      quizSymbol: null,
    })
  },

  _applyAction: (action) => {
    switch (action.type) {
      case 'flip_card':    get()._flipCard(action.index);   break
      case 'answer_quiz': get()._answerQuiz(action.correct); break
      case 'game_start':  get()._applyGameStart(action.cards, action.playerNames, action.deckId, action.size); break
    }
  },

  // Public game interface
  flipCard: (index) => {
    const { isOnline, myPlayerIndex, currentPlayer } = get()
    if (isOnline && myPlayerIndex !== currentPlayer) return
    if (isOnline) broadcastGameAction({ type: 'flip_card', index })
    get()._flipCard(index)
  },

  answerQuiz: (correct) => {
    if (get().isOnline) broadcastGameAction({ type: 'answer_quiz', correct })
    get()._answerQuiz(correct)
  },

  playAgain: () => {
    const { isOnline, isHost, players, selectedDeckId, selectedSize } = get()
    if (isOnline && !isHost) return
    const deck = DECKS.find(d => d.id === selectedDeckId)!
    const size = SIZE_CONFIG[selectedSize]
    const symbols = shuffle(Object.keys(deck.pool)).slice(0, size.pairs)
    const cardSymbols = shuffle([...symbols, ...symbols])
    const cards: CardData[] = cardSymbols.map((symbol, id) => ({ id, symbol, state: 'hidden' }))

    if (isOnline) {
      const playerNames = players.map(p => p.name)
      broadcastGameAction({ type: 'game_start', cards, playerNames, deckId: selectedDeckId, size: selectedSize })
      get()._applyGameStart(cards, playerNames, selectedDeckId, selectedSize)
    } else {
      const resetPlayers = players.map(p => ({ ...p, score: 0, pairs: 0, quizzes: 0 }))
      set({ phase: 'playing', cards, players: resetPlayers, currentPlayer: 0, flipped: [], locked: false, turnMessage: '', quizSymbol: null })
    }
  },

  resetToSetup: () => {
    if (get().isOnline) {
      get().leaveRoom()
    } else {
      set({ phase: 'setup', cards: [], players: [], quizSymbol: null })
    }
  },

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

  // Multiplayer
  goToLobby: () => set({ phase: 'lobby' }),

  createRoom: async (myName) => {
    const { selectedDeckId, selectedSize, language } = get()
    const code = generateRoomCode()
    const playerId = getPlayerId()
    await createRoomInDb(code, playerId, { deckId: selectedDeckId, size: selectedSize, language })
    const myPresence: LobbyPlayer = { id: playerId, name: myName, index: 0, isHost: true }
    await joinRealtimeChannel(
      code,
      myPresence,
      (action) => get()._applyAction(action),
      (players) => get()._setLobbyPlayers(players),
    )
    set({ isOnline: true, roomId: code, myPlayerId: playerId, myPlayerIndex: 0, isHost: true })
  },

  joinRoom: async (code, myName) => {
    const upperCode = code.toUpperCase()
    const room = await fetchRoomFromDb(upperCode)
    const playerId = getPlayerId()
    const myPresence: LobbyPlayer = { id: playerId, name: myName, index: 1, isHost: false }
    await joinRealtimeChannel(
      upperCode,
      myPresence,
      (action) => get()._applyAction(action),
      (players) => get()._setLobbyPlayers(players),
    )
    set({
      isOnline: true,
      roomId: upperCode,
      myPlayerId: playerId,
      myPlayerIndex: 1,
      isHost: false,
      selectedDeckId: room.settings.deckId as DeckId,
      selectedSize: room.settings.size as BoardSize,
      language: room.settings.language as Language,
    })
  },

  leaveRoom: () => {
    const { isHost, roomId } = get()
    leaveRealtimeChannel()
    if (isHost && roomId) deleteRoomFromDb(roomId)
    set({
      isOnline: false, roomId: null, myPlayerId: '', myPlayerIndex: 0,
      isHost: false, lobbyPlayers: [],
      phase: 'setup', cards: [], players: [], quizSymbol: null,
    })
  },

  startOnlineGame: () => {
    const { lobbyPlayers, selectedDeckId, selectedSize } = get()
    const sortedPlayers = [...lobbyPlayers].sort((a, b) => a.index - b.index)
    const playerNames = sortedPlayers.map(p => p.name)
    const deck = DECKS.find(d => d.id === selectedDeckId)!
    const size = SIZE_CONFIG[selectedSize]
    const symbols = shuffle(Object.keys(deck.pool)).slice(0, size.pairs)
    const cardSymbols = shuffle([...symbols, ...symbols])
    const cards: CardData[] = cardSymbols.map((symbol, id) => ({ id, symbol, state: 'hidden' }))
    broadcastGameAction({ type: 'game_start', cards, playerNames, deckId: selectedDeckId, size: selectedSize })
    get()._applyGameStart(cards, playerNames, selectedDeckId, selectedSize)
  },

  _setLobbyPlayers: (players) => set({ lobbyPlayers: players }),
}))
