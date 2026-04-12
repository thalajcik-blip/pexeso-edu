import { toast } from 'sonner'
import type { GameEventType } from '../types/gameEvents'
import { EVENT_CONFIGS } from '../types/gameEvents'

export function showEventActivatedToast(type: GameEventType) {
  const cfg = EVENT_CONFIGS[type]
  toast(`${cfg.emoji} ${cfg.label}`, {
    description: 'Nájdi pár a získaj dvojnásobné body!',
    duration: 3000,
    style: {
      background: '#1A2035',
      border: `1px solid ${cfg.color}`,
      color: cfg.color,
    },
  })
}

export function showEventAppliedToast(type: GameEventType) {
  const cfg = EVENT_CONFIGS[type]
  toast.success(`${cfg.emoji} ${cfg.label} uplatnené!`, {
    duration: 2000,
    style: {
      background: '#1A2035',
      border: `1px solid ${cfg.color}`,
      color: '#fff',
    },
  })
}
