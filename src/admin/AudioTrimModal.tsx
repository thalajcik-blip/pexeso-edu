import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { decodeAudioFile, trimAndCompressAudio, getPeaks, getSupportedOpusMimeType } from '../utils/audioEncoder'

type Props = {
  file: File
  onConfirm: (blob: Blob, durationSec: number, mimeType: string) => void
  onClose: () => void
}

const CANVAS_BUCKETS = 300

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

export default function AudioTrimModal({ file, onConfirm, onClose }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const audioRef   = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [duration, setDuration]       = useState(0)
  const [startSec, setStartSec]       = useState(0)
  const [endSec, setEndSec]           = useState(0)
  const [peaks, setPeaks]             = useState<number[]>([])
  const [isPlaying, setIsPlaying]     = useState(false)
  const [processing, setProcessing]   = useState(false)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')

  // Decode on mount
  useEffect(() => {
    let cancelled = false
    decodeAudioFile(file)
      .then(buf => {
        if (cancelled) return
        setAudioBuffer(buf)
        setDuration(buf.duration)
        setStartSec(0)
        setEndSec(Math.min(buf.duration, 60))
        setPeaks(getPeaks(buf, CANVAS_BUCKETS))
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) { setError('Nepodařilo se načíst audio soubor.'); setLoading(false) }
      })
    return () => { cancelled = true }
  }, [file])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => stopPreview()
  }, [])

  // Draw waveform whenever peaks/trim changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || peaks.length === 0 || duration === 0) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width
    const H = canvas.height
    ctx.clearRect(0, 0, W, H)

    const startFrac = startSec / duration
    const endFrac   = endSec   / duration
    const startX    = startFrac * W
    const endX      = endFrac   * W

    // Dimmed background
    ctx.fillStyle = 'rgba(148,163,184,0.15)'
    ctx.fillRect(0, 0, W, H)

    // Selected region
    ctx.fillStyle = 'rgba(99,102,241,0.12)'
    ctx.fillRect(startX, 0, endX - startX, H)

    // Bars
    const barW = W / peaks.length
    peaks.forEach((peak, i) => {
      const x     = i * barW
      const barH  = peak * H * 0.88
      const fracX = x / W
      const inRange = fracX >= startFrac && fracX <= endFrac
      ctx.fillStyle = inRange ? '#6366f1' : '#94a3b8'
      ctx.fillRect(x, (H - barH) / 2, Math.max(1, barW - 0.5), barH)
    })

    // Trim lines
    ctx.strokeStyle = '#818cf8'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(startX, 0); ctx.lineTo(startX, H); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(endX, 0);   ctx.lineTo(endX, H);   ctx.stroke()
  }, [peaks, startSec, endSec, duration])

  function stopPreview() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.onended = null
      audioRef.current = null
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    setIsPlaying(false)
  }

  function togglePreview() {
    if (isPlaying) { stopPreview(); return }
    const url = URL.createObjectURL(file)
    objectUrlRef.current = url
    const audio = new Audio(url)
    audio.currentTime = startSec
    audioRef.current = audio
    const trimDur = endSec - startSec
    const timeout = setTimeout(() => stopPreview(), trimDur * 1000)
    audio.onended = () => { stopPreview(); clearTimeout(timeout) }
    audio.play().then(() => setIsPlaying(true)).catch(() => { stopPreview(); clearTimeout(timeout) })
  }

  async function handleConfirm() {
    if (!audioBuffer) return
    stopPreview()
    setProcessing(true)
    try {
      const { blob, mimeType } = await trimAndCompressAudio(audioBuffer, { startSec, endSec })
      onConfirm(blob, endSec - startSec, mimeType)
    } catch {
      setError('Chyba při zpracování audia.')
      setProcessing(false)
    }
  }

  const trimDuration = endSec - startSec
  // Opus ~48kbps (OGG or WebM container), WAV fallback mono 16-bit 22050 Hz
  const opusMimeType = getSupportedOpusMimeType()
  const sizeKB = opusMimeType
    ? Math.round(trimDuration * 48000 / 8 / 1024)
    : Math.round(trimDuration * 22050 * 2 / 1024)

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg" onInteractOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Oříznout audio</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="h-24 flex items-center justify-center text-sm text-slate-500">
            Načítání...
          </div>
        )}

        {error && (
          <div className="text-sm text-red-500">{error}</div>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            {/* Waveform */}
            <canvas
              ref={canvasRef}
              width={460}
              height={80}
              className="w-full rounded-lg border border-slate-200"
              style={{ height: 80 }}
            />

            {/* Time info */}
            <div className="flex justify-between text-xs text-slate-500 tabular-nums">
              <span>Začátek: {fmt(startSec)}</span>
              <span className="font-medium">Délka: {fmt(trimDuration)}</span>
              <span>Konec: {fmt(endSec)}</span>
            </div>

            {/* Start slider */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Začátek</label>
              <input
                type="range"
                min={0} max={duration} step={0.1}
                value={startSec}
                onChange={e => {
                  const v = parseFloat(e.target.value)
                  if (v < endSec - 1) setStartSec(v)
                }}
                className="w-full"
              />
            </div>

            {/* End slider */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Konec</label>
              <input
                type="range"
                min={0} max={duration} step={0.1}
                value={endSec}
                onChange={e => {
                  const v = parseFloat(e.target.value)
                  if (v > startSec + 1) setEndSec(v)
                }}
                className="w-full"
              />
            </div>

            <p className="text-xs text-slate-400">
              Výsledný soubor: ~{sizeKB} KB ({opusMimeType ? 'Opus 48 kbps' : 'WAV mono 22 kHz'})
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={togglePreview}
                disabled={processing}
                className="flex-1"
              >
                {isPlaying ? '⏹ Zastavit' : '▶ Přehrát výběr'}
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={processing}
                className="flex-1"
              >
                {processing ? 'Zpracovávám...' : 'Potvrdit'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
