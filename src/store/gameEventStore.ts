import { create } from 'zustand'
import type { GameEvent, GameEventType } from '../types/gameEvents'
import { EVENT_CONFIGS } from '../types/gameEvents'

function randomInterval(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const DEFAULT_INTERVAL = {
  min: EVENT_CONFIGS.double_points.minInterval,
  max: EVENT_CONFIGS.double_points.maxInterval,
}

interface GameEventState {
  currentEvent: GameEvent | null
  turnCount: number
  nextEventAt: number
  activeInterval: { min: number; max: number }

  // Authority (solo or host): full logic
  initEvents: (interval?: { min: number; max: number }) => void
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
  nextEventAt: randomInterval(DEFAULT_INTERVAL.min, DEFAULT_INTERVAL.max),
  activeInterval: DEFAULT_INTERVAL,

  initEvents: (interval?) => {
    const iv = interval ?? DEFAULT_INTERVAL
    set({
      currentEvent: null,
      turnCount: 0,
      nextEventAt: randomInterval(iv.min, iv.max),
      activeInterval: iv,
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
    const { turnCount, activeInterval } = get()
    set({
      currentEvent: null,
      nextEventAt: turnCount + randomInterval(activeInterval.min, activeInterval.max),
    })
  },

  resetEvents: () => {
    const iv = get().activeInterval
    set({ currentEvent: null, turnCount: 0, nextEventAt: randomInterval(iv.min, iv.max) })
  },

  setEventActiveFromHost: (type) => {
    set({ currentEvent: { type, active: true, activatedAt: get().turnCount } })
  },

  clearEventFromHost: () => {
    set({ currentEvent: null })
  },
}))
