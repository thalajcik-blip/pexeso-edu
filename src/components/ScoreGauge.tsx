import { useEffect, useId, useRef, useState } from 'react'

interface ScoreGaugeProps {
  score: number
  total: number
  label: string            // "Správně" / "Správne" / "Correct"
  accent: string           // solid fallback color (used for glow)
  accentGradient: string   // CSS gradient string — parsed to SVG linearGradient
  textMuted: string
  trackColor?: string      // defaults to white-10; pass darker for light mode
  isPerfectScore: boolean
  animDelay?: number       // ms before arc + count-up starts
}

const R         = 70
const CX        = 100
const CY        = 100
const START_DEG = 150
const SWEEP_DEG = 240
const STROKE_W  = 14

const toRad = (d: number) => (d * Math.PI) / 180

const startX = CX + R * Math.cos(toRad(START_DEG))
const startY = CY + R * Math.sin(toRad(START_DEG))
const endX   = CX + R * Math.cos(toRad(START_DEG + SWEEP_DEG))
const endY   = CY + R * Math.sin(toRad(START_DEG + SWEEP_DEG))

const ARC_PATH      = `M ${startX.toFixed(2)} ${startY.toFixed(2)} A ${R} ${R} 0 1 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`
const TOTAL_ARC_LEN = (SWEEP_DEG / 360) * 2 * Math.PI * R  // ≈ 293

/** Extract hex color stops from a CSS linear-gradient() string */
function parseGradientStops(gradient: string): string[] {
  const stops = gradient.match(/#[0-9a-fA-F]{3,8}/g) ?? []
  return stops.length >= 2 ? stops : ['#ffdd35', '#ffa800']
}

export function ScoreGauge({
  score, total, label, accent, accentGradient, textMuted,
  trackColor = 'rgba(255,255,255,0.1)', isPerfectScore, animDelay = 400,
}: ScoreGaugeProps) {
  const [fillPct, setFillPct]      = useState(0)
  const [displayScore, setDisplay] = useState(0)
  const rafRef   = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(0 as unknown as ReturnType<typeof setTimeout>)

  // Unique gradient ID per instance (avoids SVG id collisions)
  const uid    = useId().replace(/:/g, 'g')
  const gradId = `gauge-grad-${uid}`

  const targetPct = total > 0 ? score / total : 0
  const gradStops = parseGradientStops(accentGradient)

  useEffect(() => {
    setFillPct(0)
    setDisplay(0)

    timerRef.current = setTimeout(() => {
      const duration  = 900
      const startTime = performance.now()

      const tick = (now: number) => {
        const t     = Math.min((now - startTime) / duration, 1)
        const eased = 1 - Math.pow(1 - t, 3)   // ease-out cubic
        setFillPct(eased * targetPct)
        setDisplay(Math.round(eased * score))
        if (t < 1) rafRef.current = requestAnimationFrame(tick)
      }

      rafRef.current = requestAnimationFrame(tick)
    }, animDelay)

    return () => {
      clearTimeout(timerRef.current)
      cancelAnimationFrame(rafRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, total, animDelay])

  const fillLen = fillPct * TOTAL_ARC_LEN
  const glow    = isPerfectScore ? `drop-shadow(0 0 10px ${accent}88)` : undefined

  return (
    <svg
      viewBox="0 0 200 148"
      width="200"
      height="148"
      style={{ display: 'block', margin: '0 auto', filter: glow, overflow: 'visible' }}
      aria-label={`${score} / ${total}`}
    >
      <defs>
        {/* Gradient goes left→right across the arc (135° approx) */}
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          {gradStops.map((color, i) => (
            <stop
              key={i}
              offset={`${Math.round((i / (gradStops.length - 1)) * 100)}%`}
              stopColor={color}
            />
          ))}
        </linearGradient>
      </defs>

      {/* Track */}
      <path
        d={ARC_PATH}
        fill="none"
        stroke={trackColor}
        strokeWidth={STROKE_W}
        strokeLinecap="round"
      />

      {/* Fill arc — gradient stroke */}
      {total > 0 && (
        <path
          d={ARC_PATH}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={STROKE_W}
          strokeLinecap="round"
          strokeDasharray={`${fillLen.toFixed(2)} ${TOTAL_ARC_LEN + 2}`}
        />
      )}

      {/* Score — gradient fill */}
      <text
        x={CX}
        y={94}
        textAnchor="middle"
        dominantBaseline="central"
        fill={`url(#${gradId})`}
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
        y={121}
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
