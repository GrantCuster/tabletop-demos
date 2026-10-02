import { useEffect, useRef } from 'react'
import Hls from 'hls.js'

export function Video({ src, poster, label }: { src: string; poster?: string; label?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const video = ref.current
    if (!video) return
    let hls: Hls | undefined
    let visible = false
    const playIfVisible = () => { if (visible) video.play().catch(() => undefined) }
    // Chromium now reports native HLS support in some builds, but its native
    // pipeline rejects Bluesky's cross-origin segment requests. Prefer hls.js
    // anywhere Media Source Extensions are available; keep native HLS for Safari.
    if (src.includes('.m3u8') && Hls.isSupported()) {
      hls = new Hls({ capLevelToPlayerSize: true })
      hls.loadSource(src)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, playIfVisible)
    } else {
      video.src = src
      video.addEventListener('loadedmetadata', playIfVisible)
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) video.play().catch(() => undefined)
      else video.pause()
    }, { threshold: 0.55 })
    observer.observe(video)
    return () => {
      observer.disconnect()
      video.removeEventListener('loadedmetadata', playIfVisible)
      hls?.off(Hls.Events.MANIFEST_PARSED, playIfVisible)
      hls?.destroy()
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [src])
  return <video ref={ref} poster={poster} aria-label={label || 'Demo video'} muted loop playsInline controls />
}
