export type GameEventType = 'double_points' // | 'freeze' | 'steal' | ...

export interface GameEvent {
  type: GameEventType
  active: boolean
  activatedAt: number   // turnCount when activated
  appliedAt?: number    // turnCount when consumed
}

export interface GameEventConfig {
  type: GameEventType
  minInterval: number
  maxInterval: number
  label: string
  emoji: string
  color: string
}

export const EVENT_CONFIGS: Record<GameEventType, GameEventConfig> = {
  double_points: {
    type: 'double_points',
    minInterval: 8,
    maxInterval: 10,
    label: '2× Body!',
    emoji: '⚡',
    color: '#F5C400',
  },
}
