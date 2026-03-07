import { create } from 'zustand'
import type { DeckId, BoardSize, GamePhase, CardData, Player } from '../types/game'
import { SIZE_CONFIG, PLAYER_COLORS, DEFAULT_NAMES } from '../types/game'
import { DECKS } from '../data/decks'
import { EN_QUIZ } from '../data/enQuiz'
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

const SESSION_ROOM_KEY = 'qm_last_room'


function computeCorrectAnswer(quizSymbol: string, selectedDeckId: string, language: string): string {
  const deck = DECKS.find(d => d.id === selectedDeckId)!
  const item = deck.pool[quizSymbol]
  const isEn = language === 'en'
  const enData = isEn ? EN_QUIZ[quizSymbol] : null
  if (isEn && enData) return enData.correct
  const useEn = isEn && !enData
  return useEn ? (item.answerEn ?? item.answer) : item.answer
}

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
  playerIds: string[]
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
  quizVotes: Record<string, string>  // playerId → answer (online voting)
  quizCountdownEnd: number | null   // timestamp when voting closes
  quizRevealCorrect: string | null  // set briefly to show results before closing

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

  // Internal
  _setLobbyPlayers: (players: LobbyPlayer[]) => void
  _applyAction: (action: GameAction) => void
  _flipCard: (index: number) => void
  _answerQuiz: (correct: boolean) => void
  _applyGameStart: (cards: CardData[], playerIds: string[], playerNames: string[], deckId: string, size: string) => void
  _broadcastStateIfHost: () => void
  _applyQuizVote: (playerId: string, answer: string) => void
  _resolveQuizVotes: (correct: string) => void
  _triggerReveal: () => void
  voteQuiz: (answer: string) => void
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
  playerIds: [],
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
  quizVotes: {},
  quizCountdownEnd: null,
  quizRevealCorrect: null,

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
    set({ phase: 'playing', cards, players, playerIds: [], currentPlayer: 0, flipped: [], locked: false, turnMessage: '', quizSymbol: null })
  },

  // ── Internal pure game logic ──

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

  _applyGameStart: (cards, playerIds, playerNames, deckId, size) => {
    const { language, myPlayerId } = get()
    const players: Player[] = playerNames.map((name, i) => ({
      name: name.trim() || TRANSLATIONS[language].defaultPlayerNames[i],
      color: PLAYER_COLORS[i],
      score: 0, pairs: 0, quizzes: 0,
    }))
    const myIndex = playerIds.indexOf(myPlayerId)
    set({
      selectedDeckId: deckId as DeckId,
      selectedSize: size as BoardSize,
      phase: 'playing',
      cards,
      players,
      playerIds,
      currentPlayer: 0,
      flipped: [],
      locked: false,
      turnMessage: '',
      quizSymbol: null,
      ...(myIndex >= 0 ? { myPlayerIndex: myIndex } : {}),
    })
  },

  _applyAction: (action) => {
    const { myPlayerId } = get()
    switch (action.type) {
      case 'flip_card':
        get()._flipCard(action.index)
        break
      case 'quiz_vote':
        get()._applyQuizVote(action.playerId, action.answer)
        break
      case 'answer_quiz':
        get()._answerQuiz(action.correct)
        break
      case 'game_start':
        get()._applyGameStart(action.cards, action.playerIds, action.playerNames, action.deckId, action.size)
        break
      case 'state_snapshot': {
        const myIndex = action.playerIds.indexOf(myPlayerId)
        set({
          phase: action.phase,
          cards: action.cards,
          players: action.players,
          playerIds: action.playerIds,
          currentPlayer: action.currentPlayer,
          quizSymbol: action.quizSymbol,
          locked: false,
          flipped: [],
          ...(myIndex >= 0 ? { myPlayerIndex: myIndex } : {}),
        })
        break
      }
    }
  },

  _broadcastStateIfHost: () => {
    const { isHost, phase, cards, players, playerIds, currentPlayer, quizSymbol } = get()
    if (!isHost) return
    if (phase !== 'playing' && phase !== 'quiz') return
    broadcastGameAction({ type: 'state_snapshot', phase, cards, players, currentPlayer, quizSymbol, playerIds })
  },

  // ── Public game interface ──

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
    const { isOnline, isHost, players, playerIds, selectedDeckId, selectedSize } = get()
    if (isOnline && !isHost) return
    const deck = DECKS.find(d => d.id === selectedDeckId)!
    const size = SIZE_CONFIG[selectedSize]
    const symbols = shuffle(Object.keys(deck.pool)).slice(0, size.pairs)
    const cardSymbols = shuffle([...symbols, ...symbols])
    const cards: CardData[] = cardSymbols.map((symbol, id) => ({ id, symbol, state: 'hidden' }))

    if (isOnline) {
      const playerNames = players.map(p => p.name)
      broadcastGameAction({ type: 'game_start', cards, playerIds, playerNames, deckId: selectedDeckId, size: selectedSize })
      get()._applyGameStart(cards, playerIds, playerNames, selectedDeckId, selectedSize)
    } else {
      const resetPlayers = players.map(p => ({ ...p, score: 0, pairs: 0, quizzes: 0 }))
      set({ phase: 'playing', cards, players: resetPlayers, currentPlayer: 0, flipped: [], locked: false, turnMessage: '', quizSymbol: null })
    }
  },

  resetToSetup: () => {
    if (get().isOnline) get().leaveRoom()
    else set({ phase: 'setup', cards: [], players: [], quizSymbol: null })
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

  // ── Multiplayer ──

  goToLobby: () => set({ phase: 'lobby' }),

  createRoom: async (myName) => {
    const { selectedDeckId, selectedSize, language } = get()
    const code = generateRoomCode()
    const playerId = getPlayerId()
    await createRoomInDb(code, playerId, { deckId: selectedDeckId, size: selectedSize, language })
    const myPresence: LobbyPlayer = { id: playerId, name: myName, isHost: true, joinedAt: Date.now() }
    await joinRealtimeChannel(
      code,
      myPresence,
      (action) => get()._applyAction(action),
      (players) => get()._setLobbyPlayers(players),
      () => get()._broadcastStateIfHost(),
    )
    sessionStorage.setItem(SESSION_ROOM_KEY, JSON.stringify({ roomId: code, myName }))
    set({ isOnline: true, roomId: code, myPlayerId: playerId, myPlayerIndex: 0, isHost: true })
  },

  joinRoom: async (code, myName) => {
    const upperCode = code.toUpperCase()
    const room = await fetchRoomFromDb(upperCode)
    const playerId = getPlayerId()
    const myPresence: LobbyPlayer = { id: playerId, name: myName, isHost: false, joinedAt: Date.now() }
    await joinRealtimeChannel(
      upperCode,
      myPresence,
      (action) => get()._applyAction(action),
      (players) => get()._setLobbyPlayers(players),
      () => get()._broadcastStateIfHost(),
    )
    sessionStorage.setItem(SESSION_ROOM_KEY, JSON.stringify({ roomId: upperCode, myName }))
    set({
      isOnline: true,
      roomId: upperCode,
      myPlayerId: playerId,
      myPlayerIndex: 99, // will be updated by game_start or state_snapshot
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
    sessionStorage.removeItem(SESSION_ROOM_KEY)
    set({
      isOnline: false, roomId: null, myPlayerId: '', myPlayerIndex: 0,
      isHost: false, lobbyPlayers: [], playerIds: [],
      phase: 'setup', cards: [], players: [], quizSymbol: null,
      quizVotes: {}, quizCountdownEnd: null, quizRevealCorrect: null,
    })
  },

  startOnlineGame: () => {
    const { lobbyPlayers, selectedDeckId, selectedSize, myPlayerId } = get()
    // Sort: host first, then by joinedAt
    const sorted = [...lobbyPlayers].sort((a, b) => {
      if (a.isHost && !b.isHost) return -1
      if (!a.isHost && b.isHost) return 1
      return a.joinedAt - b.joinedAt
    })
    const playerIds = sorted.map(p => p.id)
    const playerNames = sorted.map(p => p.name)
    const deck = DECKS.find(d => d.id === selectedDeckId)!
    const size = SIZE_CONFIG[selectedSize]
    const symbols = shuffle(Object.keys(deck.pool)).slice(0, size.pairs)
    const cardSymbols = shuffle([...symbols, ...symbols])
    const cards: CardData[] = cardSymbols.map((symbol, id) => ({ id, symbol, state: 'hidden' }))
    broadcastGameAction({ type: 'game_start', cards, playerIds, playerNames, deckId: selectedDeckId, size: selectedSize })
    const myIndex = playerIds.indexOf(myPlayerId)
    get()._applyGameStart(cards, playerIds, playerNames, selectedDeckId, selectedSize)
    if (myIndex >= 0) set({ myPlayerIndex: myIndex })
  },

  _setLobbyPlayers: (players) => set({ lobbyPlayers: players }),

  voteQuiz: (answer) => {
    const { myPlayerId } = get()
    broadcastGameAction({ type: 'quiz_vote', playerId: myPlayerId, answer })
    get()._applyQuizVote(myPlayerId, answer)
  },

  _triggerReveal: () => {
    const { quizSymbol, selectedDeckId, language } = get()
    if (!quizSymbol) return
    const correct = computeCorrectAnswer(quizSymbol, selectedDeckId, language)
    set({ quizRevealCorrect: correct })
    setTimeout(() => get()._resolveQuizVotes(correct), 1500)
  },

  _applyQuizVote: (playerId, answer) => {
    const { quizVotes, quizCountdownEnd, quizSymbol } = get()
    if (!quizSymbol) return
    const isFirstVote = Object.keys(quizVotes).length === 0
    const newVotes = { ...quizVotes, [playerId]: answer }
    const newCountdownEnd = isFirstVote ? Date.now() + 5000 : quizCountdownEnd
    set({ quizVotes: newVotes, quizCountdownEnd: newCountdownEnd })
  },

  _resolveQuizVotes: (correct) => {
    const { players, playerIds, quizVotes, currentPlayer, cards } = get()
    if (!get().quizSymbol) return
    const updatedPlayers = players.map((p, i) => {
      const vote = quizVotes[playerIds[i]]
      return vote === correct ? { ...p, score: p.score + 1, quizzes: p.quizzes + 1 } : p
    })
    const allMatched = cards.every(c => c.state === 'matched')
    const tr = TRANSLATIONS[get().language]
    const playerName = players[currentPlayer].name
    const activeCorrect = quizVotes[playerIds[currentPlayer]] === correct
    const msg = activeCorrect
      ? tr.turnCorrect.replace('{name}', playerName)
      : tr.turnWrong.replace('{name}', playerName)
    set({
      players: updatedPlayers,
      quizSymbol: null,
      phase: allMatched ? 'win' : 'playing',
      locked: false,
      turnMessage: allMatched ? '' : msg,
      quizVotes: {},
      quizCountdownEnd: null,
      quizRevealCorrect: null,
    })
  },
}))

// Helper to read saved session for reconnect pre-fill
export function getSavedSession(): { roomId: string; myName: string } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_ROOM_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
