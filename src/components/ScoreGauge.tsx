import { useEffect, useRef, useState } from 'react'

interface ScoreGaugeProps {
  score: number
  total: number
  label: string          // "Správně" / "Správne" / "Correct"
  accent: string
  textMuted: string
  isPerfectScore: boolean
  animDelay?: number     // ms before arc + count-up starts
}

const R        = 70
const CX       = 100
const CY       = 100
const START_DEG = 150
const SWEEP_DEG = 240
const STROKE_W  = 14

const toRad = (d: number) => (d * Math.PI) / 180

const startX = CX + R * Math.cos(toRad(START_DEG))
const startY = CY + R * Math.sin(toRad(START_DEG))
const endX   = CX + R * Math.cos(toRad(START_DEG + SWEEP_DEG))
const endY   = CY + R * Math.sin(toRad(START_DEG + SWEEP_DEG))

// 240° arc — large-arc-flag=1, sweep=1 (clockwise)
const ARC_PATH = `M ${startX.toFixed(2)} ${startY.toFixed(2)} A ${R} ${R} 0 1 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`

const TOTAL_ARC_LEN = (SWEEP_DEG / 360) * 2 * Math.PI * R  // ≈ 293

export function ScoreGauge({
  score, total, label, accent, textMuted, isPerfectScore, animDelay = 400,
}: ScoreGaugeProps) {
  const [fillPct, setFillPct]       = useState(0)
  const [displayScore, setDisplay]  = useState(0)
  const rafRef   = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(0 as unknown as ReturnType<typeof setTimeout>)

  const targetPct = total > 0 ? score / total : 0

  useEffect(() => {
    setFillPct(0)
    setDisplay(0)

    timerRef.current = setTimeout(() => {
      const duration  = 900
      const startTime = performance.now()

      const tick = (now: number) => {
        const t      = Math.min((now - startTime) / duration, 1)
        const eased  = 1 - Math.pow(1 - t, 3)          // ease-out cubic
        setFillPct(eased * targetPct)
        setDisplay(Math.round(eased * score))
        if (t < 1) rafRef.current = requestAnimationFrame(tick)
      }

      rafRef.current = requestAnimationFrame(tick)
    }, animDelay)

    return () => {
      clearTimeout(timerRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, total, animDelay])

  const fillLen = fillPct * TOTAL_ARC_LEN
  const glow    = isPerfectScore
    ? `drop-shadow(0 0 10px ${accent}88)`
    : undefined

  return (
    <svg
      viewBox="0 0 200 148"
      width="200"
      height="148"
      style={{ display: 'block', margin: '0 auto', filter: glow, overflow: 'visible' }}
      aria-label={`${score} / ${total}`}
    >
      {/* Track */}
      <path
        d={ARC_PATH}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={STROKE_W}
        strokeLinecap="round"
      />

      {/* Fill arc */}
      {total > 0 && (
        <path
          d={ARC_PATH}
          fill="none"
          stroke={accent}
          strokeWidth={STROKE_W}
          strokeLinecap="round"
          strokeDasharray={`${fillLen.toFixed(2)} ${TOTAL_ARC_LEN + 2}`}
        />
      )}

      {/* Score */}
      <text
        x={CX}
        y={94}
        textAnchor="middle"
        dominantBaseline="central"
        fill={accent}
        fontSize={34}
        fontWeight={800}
        fontFamily="inherit"
        letterSpacing="-1"
      >
        {displayScore}/{total}
      </text>

      {/* Label */}
      <text
        x={CX}
        y={114}
        textAnchor="middle"
        dominantBaseline="central"
        fill={textMuted}
        fontSize={11}
        fontFamily="inherit"
        letterSpacing="0.8"
        style={{ textTransform: 'uppercase' } as React.CSSProperties}
      >
        {label.toUpperCase()}
      </text>
    </svg>
  )
}
