import { create } from 'zustand'
import type { GameEvent, GameEventType } from '../types/gameEvents'
import { EVENT_CONFIGS } from '../types/gameEvents'

function randomInterval(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function makeInitialNextEventAt(): number {
  const cfg = EVENT_CONFIGS.double_points
  return randomInterval(cfg.minInterval, cfg.maxInterval)
}

interface GameEventState {
  currentEvent: GameEvent | null
  turnCount: number
  nextEventAt: number

  // Authority (solo or host): full logic
  initEvents: () => void
  incrementTurn: () => boolean      // returns true if event just activated
  consumeEvent: () => void
  resetEvents: () => void

  // Guest sync: reflect host state
  setEventActiveFromHost: (type: GameEventType) => void
  clearEventFromHost: () => void
}

export const useGameEventStore = create<GameEventState>((set, get) => ({
  currentEvent: null,
  turnCount: 0,
  nextEventAt: makeInitialNextEventAt(),

  initEvents: () => {
    set({
      currentEvent: null,
      turnCount: 0,
      nextEventAt: makeInitialNextEventAt(),
    })
  },

  incrementTurn: () => {
    const { turnCount, nextEventAt, currentEvent } = get()
    const newCount = turnCount + 1
    if (newCount >= nextEventAt && !currentEvent) {
      set({
        turnCount: newCount,
        currentEvent: { type: 'double_points', active: true, activatedAt: newCount },
      })
      return true
    }
    set({ turnCount: newCount })
    return false
  },

  consumeEvent: () => {
    const { turnCount } = get()
    const cfg = EVENT_CONFIGS.double_points
    set({
      currentEvent: null,
      nextEventAt: turnCount + randomInterval(cfg.minInterval, cfg.maxInterval),
    })
  },

  resetEvents: () => {
    set({ currentEvent: null, turnCount: 0, nextEventAt: makeInitialNextEventAt() })
  },

  setEventActiveFromHost: (type) => {
    set({ currentEvent: { type, active: true, activatedAt: get().turnCount } })
  },

  clearEventFromHost: () => {
    set({ currentEvent: null })
  },
}))
