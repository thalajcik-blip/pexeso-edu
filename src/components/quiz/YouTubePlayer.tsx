import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    YT: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string
          playerVars: Record<string, unknown>
          events: { onStateChange?: (e: { data: number }) => void; onReady?: (e: { target: { playVideo: () => void; stopVideo: () => void; getCurrentTime: () => number } }) => void }
        }
      ) => { destroy: () => void; stopVideo: () => void; getCurrentTime: () => number }
      PlayerState: { ENDED: number }
    }
    onYouTubeIframeAPIReady: () => void
  }
}

interface YouTubePlayerProps {
  videoId: string
  startSec: number
  endSec: number
  onEnded: () => void
}

export function YouTubePlayer({ videoId, startSec, endSec, onEnded }: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef    = useRef<ReturnType<Window['YT']['Player']> | null>(null)
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const endedRef     = useRef(false)

  useEffect(() => {
    endedRef.current = false

    const handleEnded = () => {
      if (endedRef.current) return
      endedRef.current = true
      if (intervalRef.current) clearInterval(intervalRef.current)
      onEnded()
    }

    const initPlayer = () => {
      if (!containerRef.current) return
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          start:          startSec,
          end:            endSec,
          autoplay:       1,
          controls:       0,
          modestbranding: 1,
          rel:            0,
        },
        events: {
          onStateChange: (e) => {
            if (e.data === 0) handleEnded()
          },
          onReady: (e) => {
            e.target.playVideo()
            intervalRef.current = setInterval(() => {
              const current = playerRef.current?.getCurrentTime?.() ?? 0
              if (current >= endSec) {
                playerRef.current?.stopVideo()
                handleEnded()
              }
            }, 500)
          },
        },
      })
    }

    if (window.YT?.Player) {
      initPlayer()
    } else {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => { prev?.(); initPlayer() }
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const script = document.createElement('script')
        script.src = 'https://www.youtube.com/iframe_api'
        document.head.appendChild(script)
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      playerRef.current?.destroy()
      playerRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, startSec, endSec])

  return (
    <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 12, overflow: 'hidden', width: '100%' }}>
      <div
        ref={containerRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />
    </div>
  )
}
