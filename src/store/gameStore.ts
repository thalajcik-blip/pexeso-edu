import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DeckId, BoardSize, GamePhase, CardData, Player, CustomDeckData, LightningQuestion, LightningAnswer } from '../types/game'
import { SIZE_CONFIG, PLAYER_COLORS, DEFAULT_NAMES } from '../types/game'
import { AVATAR_COUNT, DEFAULT_AVATAR_IDS } from '../utils/avatar'
import { DECKS } from '../data/decks'
import { EN_QUIZ } from '../data/enQuiz'
import { shuffle } from '../utils/shuffle'
import { selectAnswers } from '../utils/quizValidation'
import type { Language } from '../data/translations'
import { TRANSLATIONS } from '../data/translations'
import type { Theme } from '../data/themes'
import {
  soundFlip, soundMatch, soundWrong, soundQuizCorrect, soundWin, soundTurnTimeout, soundOpponentAnswered,
} from '../services/audioService'
import {
  broadcastGameAction,
  joinRealtimeChannel,
  leaveRealtimeChannel,
  createRoomInDb,
  fetchRoomFromDb,
  deleteRoomFromDb,
  updateRoomInDb,
  generateRoomCode,
  getPlayerId,
  updateMyPresence,
} from '../services/multiplayerService'
import { fetchCustomDeckFull, incrementDeckPlayCount } from '../services/supabase'
import { useAuthStore } from './authStore'
import type { LobbyPlayer, GameAction } from '../services/multiplayerService'
import { useGameEventStore } from './gameEventStore'

const SESSION_ROOM_KEY = 'qm_last_room'

function buildLightningQuestions(
  deckId: string,
  customDeck: CustomDeckData | null,
  language: Language,
  count: number,
): LightningQuestion[] {
  const isCustom = customDeck && customDeck.id === deckId
  const isEn = language === 'en'

  if (isCustom) {
    const isTextDeck = customDeck.deck_type === 'text'
    // Build all valid questions first, then slice — so skipped cards (no quiz) don't reduce the count
    const allSymbols = shuffle(Object.keys(customDeck.pool))
    const allQuestions = allSymbols.flatMap((symbol): LightningQuestion[] => {
      const item = customDeck.pool[symbol]
      // New: use flexible answer pool
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
        // fall through to legacy if answers path failed
      }
      // Fallback: legacy quiz_options/quiz_correct
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
    const question = tr.deckQuestions[deck.id as DeckId]
    const distractors = shuffle(
      allSymbols
        .filter(s => s !== symbol)
        .map(s => isEn ? (deck.pool[s].answerEn ?? deck.pool[s].answer) : isSk ? (deck.pool[s].answerSk ?? deck.pool[s].answer) : deck.pool[s].answer)
        .filter(a => a !== correct)
    ).slice(0, 3)

    const funFact = isEn ? (item.factEn ?? undefined) : (language === 'sk' && item.factSk ? item.factSk : item.fact) || undefined
    return {
      symbol,
      label: symbol,
      question,
      options: shuffle([correct, ...distractors]),
      correct,
      funFact,
    }
  })
}


function computeCorrectAnswer(quizSymbol: string, selectedDeckId: string, language: string, customDeck: CustomDeckData | null): string {
  if (customDeck && customDeck.id === selectedDeckId) {
    const item = customDeck.pool[quizSymbol]
    // New flexible answers format: find correct answer text
    if (item?.answers && item.answers.length > 0) {
      return item.answers.find(a => a.correct)?.text ?? ''
    }
    return item?.quiz_correct ?? ''
  }
  const deck = DECKS.find(d => d.id === selectedDeckId) ?? DECKS[0]
  const item = deck.pool[quizSymbol]
  const isEn = language === 'en'
  const isSk = language === 'sk'
  const enData = isEn ? EN_QUIZ[quizSymbol] : null
  if (isEn && enData) return enData.correct
  if (isEn) return item.answerEn ?? item.answer
  if (isSk) return item.answerSk ?? item.answer
  return item.answer
}

interface GameStore {
  // Setup
  language: Language
  theme: Theme
  selectedDeckId: string  // DeckId or custom deck UUID
  customDeck: CustomDeckData | null
  selectedSize: BoardSize
  numPlayers: number
  playerNames: string[]
  gameMode: 'pexequiz' | 'lightning'
  lightningQuestionCount: number  // 5 | 10 | 15 | 20 | 0 (0 = all)
  lightningTimeLimit: number      // seconds: 5 | 10 | 20 | 30

  // Game
  phase: GamePhase
  cards: CardData[]
  players: Player[]
  playerIds: string[]
  currentPlayer: number
  flipped: number[]
  locked: boolean
  turnMessage: string

  // Solo
  soloMoves: number

  // Lightning
  lightningQuestions: LightningQuestion[]
  lightningCurrentIndex: number
  lightningAnswers: LightningAnswer[]
  lightningQuestionStart: number
  lightningQuestionEndTime: number
  lightningPlayerAnswers: Record<string, { answer: string; timeMs: number; correct: boolean }>
  lightningPlayerStats: Record<string, { correct: number; totalCorrectMs: number }>
  lightningBonusPoints: number   // solo Lightning: extra points from double_points event

  // Quiz
  quizSymbol: string | null

  // Challenge / deep-link
  challengeScore: number | null
  challengeTime: number | null
  challengeFrom: string | null

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
  disconnectedPlayer: string | null // name of player who just left (shown briefly)
  turnTime: number   // seconds; 0 = unlimited
  quizTime: number   // seconds
  emojiReactions: Record<string, string> // playerId → emoji
  rematchRequested: boolean
  hostOpeningSettings: boolean

  // Setup actions
  setLanguage: (lang: Language) => void
  toggleTheme: () => void
  selectDeck: (id: string, customDeck?: CustomDeckData) => void
  selectSize: (size: BoardSize) => void
  setNumPlayers: (n: number) => void
  setPlayerName: (i: number, name: string) => void
  setGameMode: (mode: 'pexequiz' | 'lightning') => void
  applyDeepLink: (params: { set?: string | null; mode?: string | null; challenge?: string | null; time?: string | null; from?: string | null }) => void
  setLightningQuestionCount: (n: number) => void
  setLightningTimeLimit: (t: number) => void
  startLightningGame: () => void
  startOnlineLightningGame: () => void
  answerLightningQuestion: (answer: string) => void
  answerOnlineLightning: (answer: string) => void
  transitionToLightningReveal: () => void
  nextLightningQuestion: () => void
  startGame: () => void
  flipCard: (index: number) => void
  answerQuiz: (correct: boolean) => void
  playAgain: () => void
  resetToSetup: () => void
  requestRematch: () => void
  openRules: () => void
  closeRules: () => void
  debugEndGame: () => void

  // Timer settings (host only, before game)
  setTurnTime: (t: number) => void
  setQuizTime: (t: number) => void
  sendEmojiReact: (emoji: string) => void

  // Multiplayer actions
  goToLobby: () => void
  createRoom: (myName: string) => Promise<void>
  joinRoom: (code: string, myName: string) => Promise<void>
  leaveRoom: () => void
  startOnlineGame: () => void
  timeoutTurn: () => void
  openSettingsModal: () => void
  closeSettingsModal: () => void
  applyNewSettings: (s: { deckId: string; customDeck: CustomDeckData | null; gameMode: 'pexequiz' | 'lightning'; size: BoardSize; lightningQuestionCount: number; lightningTimeLimit: number; turnTime: number; quizTime: number }) => void
  changeMyLobbyName: (name: string) => void

  // Internal
  _setLobbyPlayers: (players: LobbyPlayer[]) => void
  _applyAction: (action: GameAction) => void
  _flipCard: (index: number) => void
  _answerQuiz: (correct: boolean) => void
  _applyGameStart: (cards: CardData[], playerIds: string[], playerNames: string[], deckId: string, size: string, turnTime: number, quizTime: number, startingPlayer: number) => Promise<void>
  _applyLightningStart: (questions: LightningQuestion[], playerIds: string[], playerNames: string[], questionEndTime: number) => void
  _applyLightningAnswer: (playerId: string, answer: string, timeMs: number) => void
  _applyTurnTimeout: () => void
  _applyEmojiReact: (playerId: string, emoji: string) => void
  _broadcastStateIfHost: () => void
  _applyQuizVote: (playerId: string, answer: string) => void
  _resolveQuizVotes: (correct: string) => void
  _triggerReveal: () => void
  voteQuiz: (answer: string) => void
}

function detectLanguage(): Language {
  const lang = (navigator.language ?? '').toLowerCase()
  if (lang.startsWith('sk')) return 'sk'
  if (lang.startsWith('cs') || lang.startsWith('cz')) return 'cs'
  if (lang.startsWith('en')) return 'en'
  return 'cs'
}

export const useGameStore = create<GameStore>()(persist((set, get) => ({
  // Defaults
  language: detectLanguage(),
  theme: 'dark',
  selectedDeckId: 'flags',
  customDeck: null,
  selectedSize: 'medium',
  numPlayers: 2,
  playerNames: [...DEFAULT_NAMES],
  gameMode: 'pexequiz',
  lightningQuestionCount: 10,
  lightningTimeLimit: 20,
  phase: 'setup',
  cards: [],
  players: [],
  playerIds: [],
  currentPlayer: 0,
  flipped: [],
  locked: false,
  turnMessage: '',
  soloMoves: 0,
  lightningQuestions: [],
  lightningCurrentIndex: 0,
  lightningAnswers: [],
  lightningQuestionStart: 0,
  lightningQuestionEndTime: 0,
  lightningPlayerAnswers: {},
  lightningPlayerStats: {},
  lightningBonusPoints: 0,
  quizSymbol: null,
  challengeScore: null,
  challengeTime: null,
  challengeFrom: null,
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
  disconnectedPlayer: null,
  turnTime: 10,
  quizTime: 10,
  emojiReactions: {},
  rematchRequested: false,
  hostOpeningSettings: false,

  setLanguage: (lang) => set({ language: lang, playerNames: [...TRANSLATIONS[lang].defaultPlayerNames] }),
  toggleTheme: () => set(s => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
  selectDeck: (id, customDeck) => set({ selectedDeckId: id, customDeck: customDeck ?? null }),
  selectSize: (size) => set({ selectedSize: size }),
  setNumPlayers: (n) => set({ numPlayers: n }),
  setPlayerName: (i, name) => {
    const names = [...get().playerNames]
    names[i] = name
    set({ playerNames: names })
  },
  setGameMode: (mode) => set({ gameMode: mode }),
  applyDeepLink: ({ set: setParam, mode, challenge, time, from }) => {
    const SLUG_MAP: Record<string, string> = {
      vlajky: 'flags', zviratka: 'animals', 'ovoce-zelenina': 'fruits',
    }
    const updates: Record<string, unknown> = {}
    if (setParam) updates.selectedDeckId = SLUG_MAP[setParam] ?? setParam
    if (mode === 'bleskovy_kviz' || mode === 'lightning') updates.gameMode = 'lightning'
    else if (mode === 'pexequiz') updates.gameMode = 'pexequiz'
    if (challenge) updates.challengeScore = parseInt(challenge)
    if (time)      updates.challengeTime  = parseFloat(time)
    if (from)      updates.challengeFrom  = from
    if (Object.keys(updates).length) set(updates as any)
  },
  setLightningQuestionCount: (n) => set({ lightningQuestionCount: n }),
  setLightningTimeLimit: (t) => set({ lightningTimeLimit: t }),

  startLightningGame: () => {
    const { selectedDeckId, customDeck, lightningQuestionCount, language, lightningTimeLimit } = get()
    if (customDeck && customDeck.id === selectedDeckId) incrementDeckPlayCount(selectedDeckId)
    const questions = buildLightningQuestions(selectedDeckId, customDeck, language, lightningQuestionCount)
    const now = Date.now()
    useGameEventStore.getState().initEvents()
    set({
      phase: 'lightning_playing',
      lightningQuestions: questions,
      lightningCurrentIndex: 0,
      lightningAnswers: [],
      lightningPlayerAnswers: {},
      lightningPlayerStats: {},
      lightningBonusPoints: 0,
      lightningQuestionStart: now,
      lightningQuestionEndTime: now + lightningTimeLimit * 1000,
    })
  },

  answerLightningQuestion: (answer) => {
    const { lightningQuestions, lightningCurrentIndex, lightningQuestionStart, lightningAnswers } = get()
    const question = lightningQuestions[lightningCurrentIndex]
    const isCorrect = answer !== '' && answer === question.correct
    const timeMs = Date.now() - lightningQuestionStart

    // Event system — solo only (online uses transitionToLightningReveal)
    const evStore = useGameEventStore.getState()
    const eventActive = evStore.currentEvent?.active ?? false
    evStore.incrementTurn()

    let bonusPoints = 0
    if (isCorrect && eventActive) {
      evStore.consumeEvent()
      bonusPoints = 1
    }
    // Wrong answer: event stays active (spec)

    set({
      phase: 'lightning_reveal',
      lightningAnswers: [...lightningAnswers, { correct: isCorrect, timeMs }],
      ...(bonusPoints > 0 ? { lightningBonusPoints: get().lightningBonusPoints + bonusPoints } : {}),
    })
  },

  nextLightningQuestion: () => {
    const { lightningCurrentIndex, lightningQuestions, lightningTimeLimit, lightningQuestionEndTime, isOnline } = get()
    const next = lightningCurrentIndex + 1
    if (next >= lightningQuestions.length) {
      soundWin()
      set({ phase: 'lightning_results' })
    } else {
      const REVEAL_DURATION = 4000
      const BADGE_DURATION = 1200
      // Online: derive next end time deterministically from previous (all clients compute same value)
      // Solo: use current time
      // Add badge delay when double_points event is active so timer starts after badge disappears
      const eventActive = useGameEventStore.getState().currentEvent?.active ?? false
      const badgeDelay = eventActive ? BADGE_DURATION : 0
      const now = Date.now()
      const nextEndTime = isOnline
        ? lightningQuestionEndTime + REVEAL_DURATION + lightningTimeLimit * 1000 + badgeDelay
        : now + lightningTimeLimit * 1000 + badgeDelay
      set({
        phase: 'lightning_playing',
        lightningCurrentIndex: next,
        lightningQuestionStart: now,
        lightningQuestionEndTime: nextEndTime,
        lightningPlayerAnswers: {},
      })
    }
  },

  startOnlineLightningGame: () => {
    const { lobbyPlayers, selectedDeckId, customDeck, lightningQuestionCount, language, lightningTimeLimit } = get()
    if (customDeck && customDeck.id === selectedDeckId) incrementDeckPlayCount(selectedDeckId)
    const sorted = [...lobbyPlayers].sort((a, b) => {
      if (a.isHost && !b.isHost) return -1
      if (!a.isHost && b.isHost) return 1
      return a.joinedAt - b.joinedAt
    })
    const playerIds = sorted.map(p => p.id)
    const playerNames = sorted.map(p => p.name)
    const questions = buildLightningQuestions(selectedDeckId, customDeck, language, lightningQuestionCount)
    const questionEndTime = Date.now() + lightningTimeLimit * 1000
    broadcastGameAction({ type: 'lightning_start', questions, playerIds, playerNames, questionEndTime })
    get()._applyLightningStart(questions, playerIds, playerNames, questionEndTime)
  },

  answerOnlineLightning: (answer) => {
    const { myPlayerId, lightningQuestionStart } = get()
    const timeMs = Date.now() - lightningQuestionStart
    broadcastGameAction({ type: 'lightning_answer', playerId: myPlayerId, answer, timeMs })
    get()._applyLightningAnswer(myPlayerId, answer, timeMs)
  },

  transitionToLightningReveal: () => {
    if (get().phase !== 'lightning_playing') return  // guard against double-call (timer + all-answered race)
    const { lightningPlayerAnswers, players, playerIds, myPlayerId, lightningAnswers, lightningQuestionStart, isOnline, isHost } = get()

    // Event system — online only (solo uses answerLightningQuestion)
    const evStore = useGameEventStore.getState()
    if (!isOnline || isHost) {
      const activated = evStore.incrementTurn()
      if (activated && isOnline && isHost) {
        broadcastGameAction({ type: 'game_event_activated', eventType: 'double_points' })
      }
    }
    const eventActive = evStore.currentEvent?.active ?? false

    // Update cumulative scores — double if event active
    const updatedPlayers = players.map((p, i) => {
      const ans = lightningPlayerAnswers[playerIds[i]]
      if (!ans) return p
      if (!ans.correct) return p
      const gain = eventActive ? 2 : 1
      return { ...p, score: p.score + gain }
    })

    // Consume event if at least one player answered correctly (spec: stays active on wrong)
    const anyCorrect = Object.values(lightningPlayerAnswers).some(a => a.correct)
    if (eventActive && anyCorrect) {
      evStore.consumeEvent()
      if (isOnline && isHost) {
        broadcastGameAction({ type: 'game_event_consumed' })
      }
    }

    // Track my own answer for results stats
    const myAns = lightningPlayerAnswers[myPlayerId]
    const myEntry = {
      correct: myAns?.correct ?? false,
      timeMs: myAns?.timeMs ?? (Date.now() - lightningQuestionStart),
    }
    set({
      phase: 'lightning_reveal',
      players: updatedPlayers,
      lightningAnswers: [...lightningAnswers, myEntry],
    })
  },

  _applyLightningStart: (questions, playerIds, playerNames, questionEndTime) => {
    const { language, myPlayerId, lobbyPlayers } = get()
    const players: Player[] = playerNames.map((name, i) => ({
      name: name.trim() || TRANSLATIONS[language].defaultPlayerNames[i] || `Player ${i + 1}`,
      color: PLAYER_COLORS[i] ?? PLAYER_COLORS[0],
      avatarId: lobbyPlayers.find(lp => lp.id === playerIds[i])?.avatarId ?? i % AVATAR_COUNT,
      score: 0, pairs: 0, quizzes: 0, wrongQuizzes: 0,
    }))
    const myIndex = playerIds.indexOf(myPlayerId)
    useGameEventStore.getState().initEvents()
    set({
      phase: 'lightning_playing',
      lightningQuestions: questions,
      lightningCurrentIndex: 0,
      lightningAnswers: [],
      lightningPlayerAnswers: {},
      lightningPlayerStats: {},
      lightningBonusPoints: 0,
      lightningQuestionStart: Date.now(),
      lightningQuestionEndTime: questionEndTime,
      players,
      playerIds,
      ...(myIndex >= 0 ? { myPlayerIndex: myIndex } : {}),
    })
  },

  _applyLightningAnswer: (playerId, answer, timeMs) => {
    const { lightningQuestions, lightningCurrentIndex, playerIds, myPlayerId } = get()
    if (playerId !== myPlayerId) soundOpponentAnswered()
    const question = lightningQuestions[lightningCurrentIndex]
    if (!question) return
    const correct = answer !== '' && answer === question.correct
    set(s => ({
      lightningPlayerAnswers: {
        ...s.lightningPlayerAnswers,
        [playerId]: { answer, timeMs, correct },
      },
      lightningPlayerStats: {
        ...s.lightningPlayerStats,
        [playerId]: {
          correct: (s.lightningPlayerStats[playerId]?.correct ?? 0) + (correct ? 1 : 0),
          totalCorrectMs: (s.lightningPlayerStats[playerId]?.totalCorrectMs ?? 0) + (correct ? timeMs : 0),
        },
      },
    }))
    // If all players answered, transition to reveal immediately (don't wait for timer)
    const answered = Object.keys(get().lightningPlayerAnswers).length
    if (playerIds.length > 0 && answered >= playerIds.length) {
      get().transitionToLightningReveal()
    }
  },

  setTurnTime: (t) => set({ turnTime: t }),
  setQuizTime: (t) => set({ quizTime: t }),

  sendEmojiReact: (emoji) => {
    const { myPlayerId } = get()
    broadcastGameAction({ type: 'emoji_react', playerId: myPlayerId, emoji })
    get()._applyEmojiReact(myPlayerId, emoji)
  },

  _applyEmojiReact: (playerId, emoji) => {
    set(s => ({ emojiReactions: { ...s.emojiReactions, [playerId]: emoji } }))
    setTimeout(() => {
      if (get().emojiReactions[playerId] === emoji) {
        set(s => { const r = { ...s.emojiReactions }; delete r[playerId]; return { emojiReactions: r } })
      }
    }, 2500)
  },

  startGame: () => {
    const { selectedDeckId, selectedSize, numPlayers, playerNames, customDeck } = get()
    if (customDeck && customDeck.id === selectedDeckId) incrementDeckPlayCount(selectedDeckId)
    const size = SIZE_CONFIG[selectedSize]
    const poolKeys = customDeck && customDeck.id === selectedDeckId
      ? Object.keys(customDeck.pool)
      : Object.keys((DECKS.find(d => d.id === selectedDeckId) ?? DECKS[0]).pool)
    const symbols = shuffle(poolKeys).slice(0, size.pairs)
    const cardSymbols = shuffle([...symbols, ...symbols])
    const cards: CardData[] = cardSymbols.map((symbol, id) => ({ id, symbol, state: 'hidden' }))
    const profileAvatarId = useAuthStore.getState().profile?.avatar_id
    const players: Player[] = Array.from({ length: numPlayers }, (_, i) => ({
      name: playerNames[i]?.trim() || TRANSLATIONS[get().language].defaultPlayerNames[i],
      color: PLAYER_COLORS[i],
      avatarId: i === 0 && profileAvatarId != null ? profileAvatarId : (DEFAULT_AVATAR_IDS[i] ?? i % AVATAR_COUNT),
      score: 0, pairs: 0, quizzes: 0, wrongQuizzes: 0,
    }))
    // PexeQuiz event frequency: 1x for small, 4x for medium, 6x for large
    const pexeEventInterval =
      selectedSize === 'small'  ? { min: 6, max: 8 }  :
      selectedSize === 'medium' ? { min: 4, max: 5 }  :
                                  { min: 5, max: 6 }
    useGameEventStore.getState().initEvents(pexeEventInterval)
    set({ phase: 'playing', cards, players, playerIds: [], currentPlayer: numPlayers === 1 ? 0 : Math.floor(Math.random() * players.length), flipped: [], locked: false, turnMessage: '', quizSymbol: null, soloMoves: 0 })
  },

  // ── Internal pure game logic ──

  _flipCard: (index) => {
    const { locked, cards, flipped, players, currentPlayer } = get()
    if (locked || cards[index].state !== 'hidden') return

    soundFlip()
    const newCards = cards.map((c, i) => i === index ? { ...c, state: 'flipped' as const } : c)
    const newFlipped = [...flipped, index]
    set({ cards: newCards, flipped: newFlipped })

    if (newFlipped.length < 2) return

    set(s => ({ locked: true, soloMoves: s.players.length === 1 ? s.soloMoves + 1 : s.soloMoves }))

    // Event system: host (or solo) tracks turns
    const { isOnline, isHost } = get()
    const evStore = useGameEventStore.getState()
    if (!isOnline || isHost) {
      const activated = evStore.incrementTurn()
      if (activated) {
        if (isOnline && isHost) {
          broadcastGameAction({ type: 'game_event_activated', eventType: 'double_points' })
        }
      }
    }

    const [a, b] = newFlipped

    if (newCards[a].symbol === newCards[b].symbol) {
      soundMatch()
      setTimeout(() => {
        // Double pair score if event active at match time
        const pairBonus = (useGameEventStore.getState().currentEvent?.active) ? 2 : 1
        const matchedCards = get().cards.map((c, i) =>
          i === a || i === b ? { ...c, state: 'matched' as const, matchedBy: currentPlayer } : c
        )
        const updatedPlayers = get().players.map((p, i) =>
          i === currentPlayer ? { ...p, score: p.score + pairBonus, pairs: p.pairs + 1 } : p
        )
        set({ cards: matchedCards, players: updatedPlayers, flipped: [] })
        setTimeout(() => {
          set({ quizSymbol: newCards[a].symbol, phase: 'quiz' })
        }, 600)
      }, 500)
    } else {
      setTimeout(() => {
        soundWrong()
        const wrongCards = get().cards.map((c, i) =>
          i === a || i === b ? { ...c, state: 'wrong' as const } : c
        )
        set({ cards: wrongCards })
        setTimeout(() => {
          const resetCards = get().cards.map((c, i) =>
            i === a || i === b ? { ...c, state: 'hidden' as const } : c
          )
          const nextPlayer = (currentPlayer + 1) % players.length
          set({ cards: resetCards, flipped: [], locked: false, currentPlayer: nextPlayer, turnMessage: '' })
        }, 600)
      }, 350)
    }
  },

  _answerQuiz: (correct) => {
    const { players, currentPlayer, cards, quizSymbol } = get()

    // Event system: consume event on quiz answer (pair was found — event applies regardless of quiz correctness)
    const evStore = useGameEventStore.getState()
    const eventActive = evStore.currentEvent?.active ?? false
    const quizBonus = correct && eventActive ? 2 : correct ? 1 : 0
    if (eventActive) {
      evStore.consumeEvent()
      const { isOnline, isHost } = get()
      if (isOnline && isHost) broadcastGameAction({ type: 'game_event_consumed' })
    }

    const updatedPlayers = players.map((p, i) =>
      i === currentPlayer
        ? correct
          ? { ...p, score: p.score + quizBonus, quizzes: p.quizzes + 1 }
          : { ...p, wrongQuizzes: p.wrongQuizzes + 1 }
        : p
    )
    const updatedCards = cards.map(c =>
      c.state === 'matched' && c.symbol === quizSymbol && c.quizCorrect === undefined
        ? { ...c, quizCorrect: correct }
        : c
    )
    const allMatched = updatedCards.every(c => c.state === 'matched')
    if (correct) soundQuizCorrect()
    if (allMatched) soundWin()
    const playerName = players[currentPlayer].name
    const tr = TRANSLATIONS[get().language]
    const msg = correct
      ? tr.turnCorrect.replace('{name}', playerName)
      : tr.turnWrong.replace('{name}', playerName)
    set({
      players: updatedPlayers,
      cards: updatedCards,
      quizSymbol: null,
      phase: allMatched ? 'win' : 'playing',
      locked: false,
      turnMessage: allMatched ? '' : msg,
    })
  },

  _applyTurnTimeout: () => {
    soundTurnTimeout()
    const { players, currentPlayer, cards } = get()
    const resetCards = cards.map(c => (c.state === 'flipped' || c.state === 'wrong') ? { ...c, state: 'hidden' as const } : c)
    const nextPlayer = (currentPlayer + 1) % players.length
    set({ cards: resetCards, flipped: [], locked: false, currentPlayer: nextPlayer, turnMessage: '' })
  },

  _applyGameStart: async (cards, playerIds, playerNames, deckId, size, turnTime, quizTime, startingPlayer) => {
    const { language, myPlayerId } = get()

    // Resolve custom deck: use cache if already loaded, else fetch from Supabase
    let customDeck: CustomDeckData | null = null
    const isStaticDeck = DECKS.some(d => d.id === deckId)
    if (!isStaticDeck) {
      const cached = get().customDeck
      customDeck = cached?.id === deckId ? cached : await fetchCustomDeckFull(deckId)
    }

    const { lobbyPlayers } = get()
    const players: Player[] = playerNames.map((name, i) => ({
      name: name.trim() || TRANSLATIONS[language].defaultPlayerNames[i],
      color: PLAYER_COLORS[i],
      avatarId: lobbyPlayers.find(lp => lp.id === playerIds[i])?.avatarId ?? i % AVATAR_COUNT,
      score: 0, pairs: 0, quizzes: 0, wrongQuizzes: 0,
    }))
    const myIndex = playerIds.indexOf(myPlayerId)
    const pexeEventInterval =
      size === 'small'  ? { min: 6, max: 8 } :
      size === 'medium' ? { min: 4, max: 5 } :
                          { min: 5, max: 6 }
    useGameEventStore.getState().initEvents(pexeEventInterval)
    set({
      selectedDeckId: deckId as DeckId,
      customDeck,
      selectedSize: size as BoardSize,
      turnTime,
      quizTime,
      phase: 'playing',
      cards,
      players,
      playerIds,
      currentPlayer: startingPlayer,
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
      case 'turn_timeout':
        get()._applyTurnTimeout()
        break
      case 'quiz_vote':
        get()._applyQuizVote(action.playerId, action.answer)
        break
      case 'answer_quiz':
        get()._answerQuiz(action.correct)
        break
      case 'emoji_react':
        get()._applyEmojiReact(action.playerId, action.emoji)
        break
      case 'rematch_request':
        set({ rematchRequested: true })
        break
      case 'lightning_start':
        get()._applyLightningStart(action.questions, action.playerIds, action.playerNames, action.questionEndTime)
        break
      case 'lightning_answer':
        get()._applyLightningAnswer(action.playerId, action.answer, action.timeMs)
        break
      case 'game_start': {
        // Reconstruct cards from received symbol strings — no quiz data in the broadcast payload
        const receivedCards: CardData[] = action.cardSymbols.map((symbol, id) => ({ id, symbol, state: 'hidden' as const }))
        get()._applyGameStart(receivedCards, action.playerIds, action.playerNames, action.deckId, action.size, action.turnTime, action.quizTime, action.startingPlayer)
        break
      }
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
      case 'host_opening_settings':
        // Guests go back to lobby to wait; host stays where they are (they opened the modal themselves)
        set(s => s.isHost
          ? { hostOpeningSettings: true }
          : { hostOpeningSettings: true, phase: 'lobby', cards: [], players: [], quizSymbol: null }
        )
        break
      case 'settings_updated':
        set({
          selectedDeckId: action.deckId as DeckId,
          gameMode: action.gameMode,
          selectedSize: action.size as BoardSize,
          lightningQuestionCount: action.lightningQuestionCount,
          lightningTimeLimit: action.lightningTimeLimit,
          turnTime: action.turnTime,
          quizTime: action.quizTime,
          phase: 'lobby',
          hostOpeningSettings: false,
          cards: [], players: [], quizSymbol: null,
        })
        break
      case 'player_name_changed':
        set(s => ({
          lobbyPlayers: s.lobbyPlayers.map(p => p.id === action.playerId ? { ...p, name: action.name } : p),
        }))
        break
      case 'game_event_activated':
        // Guest receives activation from host
        if (!get().isHost) {
          useGameEventStore.getState().setEventActiveFromHost(action.eventType)
          // PexeQuiz: toast notification; Lightning: heading shown in LightningGame
        }
        break
      case 'game_event_consumed':
        // Guest clears event (host already consumed locally)
        if (!get().isHost) {
          useGameEventStore.getState().clearEventFromHost()
        }
        break
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

  timeoutTurn: () => {
    if (get().phase !== 'playing') return
    broadcastGameAction({ type: 'turn_timeout' })
    get()._applyTurnTimeout()
  },

  playAgain: () => {
    const { isOnline, isHost, players, playerIds, selectedDeckId, selectedSize, turnTime, quizTime, customDeck } = get()
    if (isOnline && !isHost) return
    const size = SIZE_CONFIG[selectedSize]
    const poolKeys = customDeck && customDeck.id === selectedDeckId
      ? Object.keys(customDeck.pool)
      : Object.keys((DECKS.find(d => d.id === selectedDeckId) ?? DECKS[0]).pool)
    const symbols = shuffle(poolKeys).slice(0, size.pairs)
    const cardSymbols = shuffle([...symbols, ...symbols])
    const cards: CardData[] = cardSymbols.map((symbol, id) => ({ id, symbol, state: 'hidden' }))

    if (isOnline) {
      const playerNames = players.map(p => p.name)
      const startingPlayer = Math.floor(Math.random() * playerIds.length)
      broadcastGameAction({ type: 'game_start', cardSymbols, playerIds, playerNames, deckId: selectedDeckId, size: selectedSize, turnTime, quizTime, startingPlayer })
      get()._applyGameStart(cards, playerIds, playerNames, selectedDeckId, selectedSize, turnTime, quizTime, startingPlayer)
    } else {
      const resetPlayers = players.map(p => ({ ...p, score: 0, pairs: 0, quizzes: 0, wrongQuizzes: 0 }))
      const isSolo = resetPlayers.length === 1
      useGameEventStore.getState().resetEvents()
      set({ phase: 'playing', cards, players: resetPlayers, currentPlayer: isSolo ? 0 : Math.floor(Math.random() * resetPlayers.length), flipped: [], locked: false, turnMessage: '', quizSymbol: null, soloMoves: 0 })
    }
    set({ rematchRequested: false })
  },

  resetToSetup: () => {
    useGameEventStore.getState().resetEvents()
    if (get().isOnline) get().leaveRoom()
    else set({ phase: 'setup', cards: [], players: [], quizSymbol: null })
  },

  requestRematch: () => {
    broadcastGameAction({ type: 'rematch_request' })
    set({ rematchRequested: true })
  },

  openRules: () => set({ rulesOpen: true }),
  closeRules: () => set({ rulesOpen: false }),

  debugEndGame: () => {
    const players = get().players.map(p => ({
      ...p,
      pairs: Math.floor(Math.random() * 10),
      quizzes: Math.floor(Math.random() * 5),
      wrongQuizzes: Math.floor(Math.random() * 3),
      score: 0,
    })).map(p => ({ ...p, score: p.pairs + p.quizzes }))
    set({ players, phase: 'win' })
  },

  // ── Multiplayer ──

  goToLobby: () => set({ phase: 'lobby' }),

  openSettingsModal: () => {
    broadcastGameAction({ type: 'host_opening_settings' })
    set({ hostOpeningSettings: true })
  },

  closeSettingsModal: () => set({ hostOpeningSettings: false }),

  applyNewSettings: (s) => {
    const { roomId, language } = get()
    set({
      selectedDeckId: s.deckId,
      customDeck: s.customDeck,
      gameMode: s.gameMode,
      selectedSize: s.size,
      lightningQuestionCount: s.lightningQuestionCount,
      lightningTimeLimit: s.lightningTimeLimit,
      turnTime: s.turnTime,
      quizTime: s.quizTime,
      phase: 'lobby',
      hostOpeningSettings: false,
      cards: [], players: [], quizSymbol: null,
    })
    broadcastGameAction({
      type: 'settings_updated',
      deckId: s.deckId,
      gameMode: s.gameMode,
      size: s.size,
      lightningQuestionCount: s.lightningQuestionCount,
      lightningTimeLimit: s.lightningTimeLimit,
      turnTime: s.turnTime,
      quizTime: s.quizTime,
    })
    if (roomId) {
      updateRoomInDb(roomId, {
        deckId: s.deckId,
        size: s.size,
        language,
        turnTime: s.turnTime,
        quizTime: s.quizTime,
        gameMode: s.gameMode,
        lightningQuestionCount: s.lightningQuestionCount,
        lightningTimeLimit: s.lightningTimeLimit,
      })
    }
  },

  changeMyLobbyName: (name) => {
    const { myPlayerId } = get()
    broadcastGameAction({ type: 'player_name_changed', playerId: myPlayerId, name })
    updateMyPresence({ name })
    set(s => ({
      lobbyPlayers: s.lobbyPlayers.map(p => p.id === myPlayerId ? { ...p, name } : p),
    }))
  },

  createRoom: async (myName) => {
    const { selectedDeckId, selectedSize, language, turnTime, quizTime, gameMode, lightningQuestionCount, lightningTimeLimit } = get()
    const code = generateRoomCode()
    const playerId = getPlayerId()
    await createRoomInDb(code, playerId, { deckId: selectedDeckId, size: selectedSize, language, turnTime, quizTime, gameMode, lightningQuestionCount, lightningTimeLimit })
    const myPresence: LobbyPlayer = { id: playerId, name: myName, isHost: true, joinedAt: Date.now(), avatarId: useAuthStore.getState().profile?.avatar_id }
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
    const myPresence: LobbyPlayer = { id: playerId, name: myName, isHost: false, joinedAt: Date.now(), avatarId: useAuthStore.getState().profile?.avatar_id }
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
      turnTime: room.settings.turnTime ?? 10,
      quizTime: room.settings.quizTime ?? 10,
      gameMode: (room.settings.gameMode ?? 'pexequiz') as 'pexequiz' | 'lightning',
      lightningQuestionCount: room.settings.lightningQuestionCount ?? 10,
      lightningTimeLimit: room.settings.lightningTimeLimit ?? 20,
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
      quizVotes: {}, quizCountdownEnd: null, quizRevealCorrect: null, disconnectedPlayer: null, emojiReactions: {},
      lightningPlayerAnswers: {}, lightningPlayerStats: {}, lightningQuestionEndTime: 0,
      hostOpeningSettings: false,
    })
  },

  startOnlineGame: () => {
    const { lobbyPlayers, selectedDeckId, selectedSize, myPlayerId, turnTime, quizTime, customDeck } = get()
    if (customDeck && customDeck.id === selectedDeckId) incrementDeckPlayCount(selectedDeckId)
    // Sort: host first, then by joinedAt
    const sorted = [...lobbyPlayers].sort((a, b) => {
      if (a.isHost && !b.isHost) return -1
      if (!a.isHost && b.isHost) return 1
      return a.joinedAt - b.joinedAt
    })
    const playerIds = sorted.map(p => p.id)
    const playerNames = sorted.map(p => p.name)
    const size = SIZE_CONFIG[selectedSize]
    const poolKeys = customDeck && customDeck.id === selectedDeckId
      ? Object.keys(customDeck.pool)
      : Object.keys((DECKS.find(d => d.id === selectedDeckId) ?? DECKS[0]).pool)
    const symbols = shuffle(poolKeys).slice(0, size.pairs)
    const cardSymbols = shuffle([...symbols, ...symbols])
    const cards: CardData[] = cardSymbols.map((symbol, id) => ({ id, symbol, state: 'hidden' }))
    const startingPlayer = Math.floor(Math.random() * playerIds.length)
    broadcastGameAction({ type: 'game_start', cardSymbols, playerIds, playerNames, deckId: selectedDeckId, size: selectedSize, turnTime, quizTime, startingPlayer })
    const myIndex = playerIds.indexOf(myPlayerId)
    get()._applyGameStart(cards, playerIds, playerNames, selectedDeckId, selectedSize, turnTime, quizTime, startingPlayer)
    if (myIndex >= 0) set({ myPlayerIndex: myIndex })
  },

  _setLobbyPlayers: (incoming) => {
    const { phase, playerIds, players: gamePlayers, disconnectedPlayer } = get()
    set({ lobbyPlayers: incoming })
    const isLightningPhase = phase === 'lightning_playing' || phase === 'lightning_reveal'
    if (phase !== 'playing' && phase !== 'quiz' && !isLightningPhase) return
    if (!playerIds.length) return
    const connectedIds = new Set(incoming.map(p => p.id))
    const leftId = playerIds.find(id => !connectedIds.has(id))
    if (!leftId) return
    const idx = playerIds.indexOf(leftId)
    const name = gamePlayers[idx]?.name ?? '?'
    if (disconnectedPlayer === name) return  // already notifying
    set({ disconnectedPlayer: name })
    setTimeout(() => set({ disconnectedPlayer: null }), 4000)
  },

  voteQuiz: (answer) => {
    const { myPlayerId } = get()
    broadcastGameAction({ type: 'quiz_vote', playerId: myPlayerId, answer })
    get()._applyQuizVote(myPlayerId, answer)
  },

  _triggerReveal: () => {
    const { quizSymbol, selectedDeckId, language, customDeck } = get()
    if (!quizSymbol) return
    const correct = computeCorrectAnswer(quizSymbol, selectedDeckId, language, customDeck)
    set({ quizRevealCorrect: correct })
    setTimeout(() => get()._resolveQuizVotes(correct), 1500)
  },

  _applyQuizVote: (playerId, answer) => {
    const { quizVotes, quizCountdownEnd, quizSymbol, quizTime } = get()
    if (!quizSymbol) return
    const isFirstVote = Object.keys(quizVotes).length === 0
    const newVotes = { ...quizVotes, [playerId]: answer }
    const newCountdownEnd = isFirstVote ? Date.now() + quizTime * 1000 : quizCountdownEnd
    set({ quizVotes: newVotes, quizCountdownEnd: newCountdownEnd })
  },

  _resolveQuizVotes: (correct) => {
    const { players, playerIds, quizVotes, currentPlayer, cards } = get()
    if (!get().quizSymbol) return
    const updatedPlayers = players.map((p, i) => {
      const vote = quizVotes[playerIds[i]]
      if (vote === undefined) return p
      return vote === correct
        ? { ...p, score: p.score + 1, quizzes: p.quizzes + 1 }
        : { ...p, wrongQuizzes: p.wrongQuizzes + 1 }
    })
    const allMatched = cards.every(c => c.state === 'matched')
    const myVote = quizVotes[get().myPlayerId]
    if (myVote === correct) soundQuizCorrect()
    if (allMatched) soundWin()
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
}), {
  name: 'pexedu-settings',
  partialize: (state) => ({
    theme: state.theme,
    language: state.language,
    selectedDeckId: state.selectedDeckId,
    selectedSize: state.selectedSize,
    numPlayers: state.numPlayers,
    gameMode: state.gameMode,
    lightningQuestionCount: state.lightningQuestionCount,
    lightningTimeLimit: state.lightningTimeLimit,
  }),
  onRehydrateStorage: () => (state) => {
    if (state) {
      state.playerNames = [...TRANSLATIONS[state.language].defaultPlayerNames]
    }
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
