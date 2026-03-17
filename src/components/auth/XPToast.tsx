import { useEffect, useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { THEMES } from '../../data/themes'
import { LEVEL_XP } from '../../store/authStore'

interface XPToastProps {
  xpEarned: number
  xpBefore: number
  xpAfter: number
  levelAfter: number
  leveledUp: boolean
  language: string
}

function getXPMessage(xp: number, lang: string): string {
  const msgs: Record<string, string[]> = {
    cs: ['💪 Pokračuj!', '👍 Dobrá práce!', '⭐ Skvěle!', '🔥 Výborný výkon!'],
    sk: ['💪 Pokračuj!', '👍 Dobrá práca!', '⭐ Skvelé!', '🔥 Výborný výkon!'],
    en: ['💪 Keep going!', '👍 Good job!', '⭐ Great!', '🔥 Excellent!'],
  }
  const pool = msgs[lang] ?? msgs['cs']
  if (xp >= 60) return pool[3]
  if (xp >= 40) return pool[2]
  if (xp >= 20) return pool[1]
  return pool[0]
}

function getLevelUpLabel(level: number, lang: string): string {
  const msgs: Record<string, string> = {
    cs: `⬆️ Level ${level}!`,
    sk: `⬆️ Level ${level}!`,
    en: `⬆️ Level ${level}!`,
  }
  return msgs[lang] ?? msgs['cs']
}

export function XPToast({ xpEarned, xpBefore, xpAfter, levelAfter, leveledUp, language }: XPToastProps) {
  const theme = useGameStore(s => s.theme)
  const tc = THEMES[theme]

  const maxLevel = LEVEL_XP.length
  const isMaxLevel = levelAfter >= maxLevel
  const levelFloor = LEVEL_XP[levelAfter - 1] ?? 0
  const levelCeil  = isMaxLevel ? levelFloor + 1 : (LEVEL_XP[levelAfter] ?? levelFloor + 1)
  const range = Math.max(1, levelCeil - levelFloor)

  const startPct = leveledUp ? 0 : Math.min(100, Math.max(0, (xpBefore - levelFloor) / range * 100))
  const endPct   = isMaxLevel ? 100 : Math.min(100, Math.max(0, (xpAfter - levelFloor) / range * 100))

  const [width, setWidth] = useState(startPct)

  useEffect(() => {
    const t = setTimeout(() => setWidth(endPct), 300)
    return () => clearTimeout(t)
  }, [endPct])

  const accentColor = theme === 'light' ? '#6d41a1' : '#f9d74e'

  return (
    <div style={{
      minWidth: 240,
      background: tc.modalSurface,
      border: `1px solid ${leveledUp ? accentColor : tc.modalSurfaceBorder}`,
      borderRadius: 12,
      padding: '12px 16px',
      color: tc.text,
      fontFamily: "'Readex Pro', sans-serif",
    }}>
      {/* Level-up banner */}
      {leveledUp && (
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          color: accentColor,
          marginBottom: 8,
          textAlign: 'center',
          letterSpacing: '0.02em',
        }}>
          {getLevelUpLabel(levelAfter, language)}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>⚡</span>
        <span style={{ fontWeight: 700, fontSize: 15, color: accentColor }}>
          +{xpEarned} XP
        </span>
        <span style={{ fontSize: 12, color: tc.textMuted, marginLeft: 'auto' }}>
          Level {levelAfter}{isMaxLevel ? ' MAX' : ''}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 6,
        borderRadius: 3,
        background: tc.btnInactiveBorder,
        overflow: 'hidden',
        marginBottom: 6,
      }}>
        <div style={{
          height: '100%',
          borderRadius: 3,
          background: accentColor,
          width: `${width}%`,
          transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />
      </div>

      {/* Bottom row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: tc.textMuted }}>
        <span>
          {isMaxLevel ? '∞' : `${xpAfter - levelFloor} / ${range} XP`}
        </span>
        <span>{getXPMessage(xpEarned, language)}</span>
      </div>
    </div>
  )
}
