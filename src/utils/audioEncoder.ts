export interface TrimOptions {
  startSec: number
  endSec: number
  targetSampleRate?: number // default 22050 (mono, reasonable quality for voices/music)
}

export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer()
  const audioCtx = new AudioContext()
  try {
    return await audioCtx.decodeAudioData(arrayBuffer)
  } finally {
    await audioCtx.close()
  }
}

export async function trimAndCompressAudio(
  audioBuffer: AudioBuffer,
  opts: TrimOptions,
): Promise<Blob> {
  const { startSec, endSec, targetSampleRate = 22050 } = opts
  const duration = endSec - startSec

  // OfflineAudioContext with mono + lower sample rate = compression
  const offlineCtx = new OfflineAudioContext(
    1, // mono
    Math.ceil(duration * targetSampleRate),
    targetSampleRate,
  )

  const source = offlineCtx.createBufferSource()
  source.buffer = audioBuffer
  source.connect(offlineCtx.destination)
  source.start(0, startSec, duration)

  const rendered = await offlineCtx.startRendering()
  return audioBufferToWav(rendered)
}

/** Returns per-bucket peak amplitude values (one per canvas pixel / bucket) */
export function getPeaks(audioBuffer: AudioBuffer, numBuckets: number): number[] {
  const data = audioBuffer.getChannelData(0)
  const blockSize = Math.floor(data.length / numBuckets)
  const peaks: number[] = []
  for (let i = 0; i < numBuckets; i++) {
    let max = 0
    const start = i * blockSize
    for (let j = 0; j < blockSize; j++) {
      const val = Math.abs(data[start + j] ?? 0)
      if (val > max) max = val
    }
    peaks.push(max)
  }
  return peaks
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const sampleRate  = buffer.sampleRate
  const numChannels = buffer.numberOfChannels
  const numSamples  = buffer.length
  const blockAlign  = numChannels * 2
  const byteRate    = sampleRate * blockAlign
  const dataLength  = numSamples * blockAlign

  const ab   = new ArrayBuffer(44 + dataLength)
  const view = new DataView(ab)

  writeString(view,  0, 'RIFF')
  view.setUint32(    4, 36 + dataLength, true)
  writeString(view,  8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(   16, 16, true)           // chunk size
  view.setUint16(   20, 1,  true)           // PCM
  view.setUint16(   22, numChannels, true)
  view.setUint32(   24, sampleRate, true)
  view.setUint32(   28, byteRate, true)
  view.setUint16(   32, blockAlign, true)
  view.setUint16(   34, 16, true)           // bit depth
  writeString(view, 36, 'data')
  view.setUint32(   40, dataLength, true)

  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]))
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      offset += 2
    }
  }

  return new Blob([ab], { type: 'audio/wav' })
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}
