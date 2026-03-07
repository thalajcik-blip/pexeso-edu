const MUTE_KEY = 'qm_muted'

let _ctx: AudioContext | null = null

function ac(): AudioContext {
  if (!_ctx) _ctx = new AudioContext()
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}

export function isMuted(): boolean {
  return localStorage.getItem(MUTE_KEY) === '1'
}

export function setMuted(v: boolean): void {
  localStorage.setItem(MUTE_KEY, v ? '1' : '0')
}

export function toggleMuted(): boolean {
  const next = !isMuted()
  setMuted(next)
  return next
}

function tone(
  freq: number,
  duration: number,
  delay = 0,
  volume = 0.25,
  type: OscillatorType = 'sine',
): void {
  if (isMuted()) return
  const a = ac()
  const osc = a.createOscillator()
  const gain = a.createGain()
  osc.connect(gain)
  gain.connect(a.destination)
  osc.type = type
  osc.frequency.setValueAtTime(freq, a.currentTime + delay)
  gain.gain.setValueAtTime(0, a.currentTime + delay)
  gain.gain.linearRampToValueAtTime(volume, a.currentTime + delay + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + delay + duration)
  osc.start(a.currentTime + delay)
  osc.stop(a.currentTime + delay + duration + 0.05)
}

function slide(
  freqStart: number,
  freqEnd: number,
  duration: number,
  delay = 0,
  volume = 0.18,
  type: OscillatorType = 'sine',
): void {
  if (isMuted()) return
  const a = ac()
  const osc = a.createOscillator()
  const gain = a.createGain()
  osc.connect(gain)
  gain.connect(a.destination)
  osc.type = type
  osc.frequency.setValueAtTime(freqStart, a.currentTime + delay)
  osc.frequency.exponentialRampToValueAtTime(freqEnd, a.currentTime + delay + duration)
  gain.gain.setValueAtTime(volume, a.currentTime + delay)
  gain.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + delay + duration)
  osc.start(a.currentTime + delay)
  osc.stop(a.currentTime + delay + duration + 0.05)
}

// Card flip — quick tap
export function soundFlip(): void {
  tone(680, 0.07, 0, 0.13, 'triangle')
}

// Pair matched — ascending major third
export function soundMatch(): void {
  tone(523, 0.18, 0,    0.28)       // C5
  tone(659, 0.25, 0.14, 0.28)       // E5
}

// Wrong pair — downward slide
export function soundWrong(): void {
  slide(360, 160, 0.22, 0, 0.18)
}

// Quiz option selected — neutral soft tap
export function soundQuizSelect(): void {
  tone(480, 0.08, 0, 0.18, 'sine')
}

// Quiz answer revealed as wrong
export function soundQuizWrong(): void {
  slide(310, 140, 0.28, 0, 0.2)
}

// Quiz answered correctly — C E G arpeggio
export function soundQuizCorrect(): void {
  tone(523, 0.12, 0,    0.22)       // C5
  tone(659, 0.12, 0.11, 0.22)       // E5
  tone(784, 0.24, 0.22, 0.22)       // G5
}

// Game won — fanfare
export function soundWin(): void {
  tone(523,  0.15, 0,    0.28)      // C5
  tone(659,  0.15, 0.14, 0.28)      // E5
  tone(784,  0.15, 0.28, 0.28)      // G5
  tone(1047, 0.45, 0.42, 0.35)      // C6
}
