import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

export function Video({ src, poster, label }: { src: string; poster?: string; label?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [showControls, setShowControls] = useState(false)
  useEffect(() => {
    const video = ref.current
    if (!video) return
    let hls: Hls | undefined
    let visible = false
    setShowControls(false)
    const play = () => video.play().catch(() => undefined)
    const playIfVisible = () => { if (visible) play() }
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
      if (visible) play()
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
  return <video
    ref={ref}
    poster={poster}
    aria-label={label || 'Demo video'}
    muted
    loop
    playsInline
    controls={showControls}
    onMouseEnter={() => setShowControls(true)}
    onMouseLeave={() => setShowControls(false)}
    onFocus={() => setShowControls(true)}
    onBlur={() => setShowControls(false)}
    onTouchStart={() => setShowControls(true)}
  />
}
