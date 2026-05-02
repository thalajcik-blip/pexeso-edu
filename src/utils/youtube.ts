export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?#]+)/,
    /youtube\.com\/embed\/([^?]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export function buildEmbedUrl(videoId: string, startSec: number, endSec: number): string {
  const params = new URLSearchParams({
    start:          String(startSec),
    end:            String(endSec),
    autoplay:       '1',
    controls:       '0',
    modestbranding: '1',
    rel:            '0',
    enablejsapi:    '1',
  })
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`
}
