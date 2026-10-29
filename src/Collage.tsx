import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import type { DemoPost, Selection } from './types'

const WIDTH = 1409
const HEIGHT = 717
const randomTime = () => .05 + Math.random() * .9
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))
type Piece = { id: string; post: DemoPost; frame: number; x: number; y: number; width: number; ratio: number; sizeJitter: number }
type FrameStatus = { ready: boolean; duration: number; error?: string }

function Frame({ piece, register, report }: {
  piece: Piece
  register: (id: string, video: HTMLVideoElement | null) => void
  report: (id: string, status: FrameStatus, ratio?: number) => void
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const fraction = useRef(piece.frame)
  fraction.current = piece.frame
  useEffect(() => {
    const video = ref.current!
    let hls: Hls | undefined
    let disposed = false
    const status = (ready: boolean, error?: string) => {
      if (!disposed) report(piece.id, { ready, duration: Number.isFinite(video.duration) ? video.duration : 0, error }, video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : undefined)
    }
    const seek = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) video.currentTime = fraction.current * Math.max(0, video.duration - .1)
    }
    let timer: ReturnType<typeof setTimeout>
    const pending = () => {
      status(false)
      clearTimeout(timer)
      timer = setTimeout(() => status(false, 'Frame could not load. Try another frame or video.'), 25000)
    }
    const ready = () => { if (video.readyState >= 2 && !video.seeking) { clearTimeout(timer); status(true) } }
    const failed = () => { clearTimeout(timer); status(false, 'Could not load this video. Choose another post or retry.') }
    register(piece.id, video)
    video.addEventListener('loadedmetadata', seek)
    video.addEventListener('seeking', pending)
    video.addEventListener('seeked', ready)
    video.addEventListener('loadeddata', ready)
    video.addEventListener('error', failed)
    pending()
    if (Hls.isSupported()) {
      hls = new Hls({ maxBufferLength: 5, maxMaxBufferLength: 10 })
      hls.on(Hls.Events.ERROR, (_event, data) => { if (data.fatal) failed() })
      hls.loadSource(piece.post.video!.playlist)
      hls.attachMedia(video)
    } else video.src = piece.post.video!.playlist
    return () => {
      disposed = true
      clearTimeout(timer)
      register(piece.id, null)
      video.removeEventListener('loadedmetadata', seek)
      video.removeEventListener('seeking', pending)
      video.removeEventListener('seeked', ready)
      video.removeEventListener('loadeddata', ready)
      video.removeEventListener('error', failed)
      hls?.destroy()
      video.removeAttribute('src')
      video.load()
    }
  }, [piece.id, piece.post.video!.playlist])
  useEffect(() => {
    const video = ref.current!
    report(piece.id, { ready: false, duration: Number.isFinite(video.duration) ? video.duration : 0 })
    const timer = setTimeout(() => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        const time = piece.frame * Math.max(0, video.duration - .1)
        if (Math.abs(time - video.currentTime) < .001 && video.readyState >= 2 && !video.seeking) report(piece.id, { ready: true, duration: video.duration })
        else video.currentTime = time
      }
    }, 120)
    return () => clearTimeout(timer)
  }, [piece.frame, piece.id])
  return <video ref={ref} crossOrigin="anonymous" muted playsInline preload="auto" aria-label={piece.post.video?.alt || 'Selected video frame'} />
}

export function Collage() {
  const [posts, setPosts] = useState<DemoPost[]>([])
  const [pieces, setPieces] = useState<Piece[]>([])
  const [activeId, setActiveId] = useState('')
  const [imageCount, setImageCount] = useState('7')
  const [statuses, setStatuses] = useState<Record<string, FrameStatus>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [background, setBackground] = useState('#000000')
  const [transparentExport, setTransparentExport] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [imageSize, setImageSize] = useState(480)
  const [sizeVariation, setSizeVariation] = useState(18)
  const videos = useRef(new Map<string, HTMLVideoElement>())
  const board = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: string; x: number; y: number; startX: number; startY: number } | null>(null)
  const active = pieces.find(p => p.id === activeId)
  const activeStatus = active ? statuses[active.id] : undefined

  function createPieces(pool: DemoPost[], count: number): Piece[] {
    const shuffled = [...pool]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    // Stagger a loose cluster around the center, with a seventh layer over it.
    const anchors = [
      [.23, .32], [.48, .25], [.75, .34],
      [.25, .64], [.51, .71], [.76, .65], [.49, .48],
    ]
    return Array.from({ length: count }, (_, i) => {
      const post = shuffled[i % shuffled.length]
      const ratio = (post.video?.width || 16) / (post.video?.height || 9)
      const sizeJitter = Math.random() * 2 - 1
      const width = imageSize * (1 + sizeJitter * sizeVariation / 100)
      const [centerX, centerY] = count <= 3
        ? [.5 + (i - (count - 1) / 2) * .22, .5 + (i % 2 ? .08 : -.04)]
        : anchors[i] ?? [.5 + (Math.random() + Math.random() - 1) * .32, .5 + (Math.random() + Math.random() - 1) * .28]
      const height = width / ratio
      return { id: crypto.randomUUID(), post, frame: randomTime(), width, ratio, sizeJitter,
        x: clamp(centerX * WIDTH - width / 2 + (Math.random() - .5) * 90, Math.min(0, WIDTH - width), Math.max(0, WIDTH - width)),
        y: clamp(centerY * HEIGHT - height / 2 + (Math.random() - .5) * 70, Math.min(0, HEIGHT - height), Math.max(0, HEIGHT - height)) }
    })
  }

  function seed(pool: DemoPost[], count = 7) {
    const next = createPieces(pool, count)
    setPieces(next); setActiveId(next[0].id); setStatuses({}); setError(''); setImageCount(String(count))
  }

  function changeCount() {
    const count = Number(imageCount)
    if (!Number.isInteger(count) || count < 1 || count > 50) return
    const next = count <= pieces.length
      ? pieces.slice(0, count)
      : [...pieces, ...createPieces(posts, count - pieces.length)]
    setPieces(next)
    if (!next.some(piece => piece.id === activeId)) setActiveId(next.at(-1)!.id)
    setImageCount(String(count))
  }

  useEffect(() => {
    let ignore = false
    fetch('/selection.json').then(r => { if (!r.ok) throw new Error('Could not load selected posts.'); return r.json() as Promise<Selection> })
      .then(data => { if (!ignore) { const pool = data.posts.filter(p => p.video); setPosts(pool); if (pool.length) seed(pool) } })
      .catch(e => { if (!ignore) setError(e.message) }).finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [])

  function update(id: string, patch: Partial<Piece>) {
    setPieces(current => current.map(p => p.id === id ? { ...p, ...patch } : p))
  }
  // Keep each image centered and preserve any individual width adjustments.
  function resizeAll(nextSize: number, nextVariation: number, reroll = false) {
    setPieces(current => current.map(piece => {
      const sizeJitter = reroll ? Math.random() * 2 - 1 : piece.sizeJitter
      const oldFactor = imageSize * (1 + piece.sizeJitter * sizeVariation / 100)
      const newFactor = nextSize * (1 + sizeJitter * nextVariation / 100)
      const width = piece.width * newFactor / oldFactor
      return { ...piece, sizeJitter, width,
        x: piece.x + (piece.width - width) / 2,
        y: piece.y + (piece.width - width) / (2 * piece.ratio) }
    }))
    setImageSize(nextSize)
    setSizeVariation(nextVariation)
  }
  function report(id: string, status: FrameStatus, ratio?: number) {
    setStatuses(current => ({ ...current, [id]: status }))
    if (ratio) setPieces(current => current.map(p => p.id === id && p.ratio !== ratio ? { ...p, ratio } : p))
  }
  function register(id: string, video: HTMLVideoElement | null) {
    if (video) videos.current.set(id, video)
    else videos.current.delete(id)
  }
  function replace(post: DemoPost) {
    if (!active) return
    const id = crypto.randomUUID()
    update(active.id, { id, post, frame: randomTime() }); setActiveId(id)
  }
  async function download() {
    setExporting(true); setError('')
    try {
      const canvas = document.createElement('canvas')
      canvas.width = WIDTH; canvas.height = HEIGHT
      const ctx = canvas.getContext('2d')!
      if (!transparentExport) {
        ctx.fillStyle = background
        ctx.fillRect(0, 0, WIDTH, HEIGHT)
      }
      for (const piece of pieces) {
        const video = videos.current.get(piece.id)
        if (!video || video.readyState < 2 || video.seeking || !statuses[piece.id]?.ready) throw new Error('Wait for all frames to finish loading before exporting.')
        ctx.drawImage(video, piece.x, piece.y, piece.width, piece.width / piece.ratio)
      }
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Could not create PNG.')), 'image/png'))
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a'); link.href = url; link.download = 'tabletop-collage-1409x717.png'; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) { setError(e instanceof Error && e.name === 'SecurityError' ? 'This video host does not allow image export. Try replacing the video.' : e instanceof Error ? e.message : 'Export failed.') }
    finally { setExporting(false) }
  }

  return <main className="collage-page">
    <nav><a href="/">← Gallery</a><a href="/curate">Choose posts</a></nav>
    <header className="collage-head"><div><h1>Collage</h1><p>1409 × 717 · Frames from your selected posts</p></div>
      <div className="collage-actions"><button disabled={!posts.length} onClick={() => seed(posts, pieces.length || 7)}>Reroll all</button><button className="export" disabled={!pieces.length || exporting || pieces.some(p => !statuses[p.id]?.ready)} onClick={download}>{exporting ? 'Exporting…' : 'Download PNG'}</button></div>
    </header>
    {loading && <p role="status">Loading selected posts…</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {!loading && !posts.length && <p>No selected videos yet. <a href="/curate">Choose and save posts in the curator</a>, then reload this page.</p>}
    {!!pieces.length && <>
      <div className="collage-toolbar"><span>Drag images to arrange · Select an image to edit</span><form className="collage-count" onSubmit={e => { e.preventDefault(); changeCount() }}><label>Images <input type="number" min="1" max="50" step="1" required value={imageCount} onChange={e => setImageCount(e.target.value)} /></label><button type="submit" disabled={Number(imageCount) === pieces.length}>Apply</button></form><label>Background <input type="color" value={background} onChange={e => setBackground(e.target.value)} /></label><label><input type="checkbox" checked={transparentExport} onChange={e => setTransparentExport(e.target.checked)} />Transparent PNG</label></div>
      <div className="collage-sizing">
        <label>Image size · {imageSize}px<input type="range" min="100" max="800" step="5" value={imageSize} onChange={e => resizeAll(Number(e.target.value), sizeVariation)} /></label>
        <label>Size variation · ±{sizeVariation}%<input type="range" min="0" max="70" step="1" value={sizeVariation} onChange={e => resizeAll(imageSize, Number(e.target.value))} /></label>
        <button disabled={!sizeVariation} onClick={() => resizeAll(imageSize, sizeVariation, true)}>Reroll sizes</button>
      </div>
      <div className="collage-board" ref={board} style={{ background }}>
        {pieces.map((piece, index) => <div key={piece.id} role="button" tabIndex={0} aria-label={`Image ${index + 1}: ${piece.post.text.slice(0, 70)}. Use arrow keys to move.`} aria-pressed={activeId === piece.id}
          className={`collage-piece ${activeId === piece.id ? 'active' : ''}`}
          style={{ left: `${piece.x / WIDTH * 100}%`, top: `${piece.y / HEIGHT * 100}%`, width: `${piece.width / WIDTH * 100}%`, aspectRatio: piece.ratio }}
          onFocus={() => setActiveId(piece.id)}
          onPointerDown={e => { e.preventDefault(); e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId); setActiveId(piece.id); setPieces(current => [...current.filter(item => item.id !== piece.id), current.find(item => item.id === piece.id)!]); drag.current = { id: piece.id, x: piece.x, y: piece.y, startX: e.clientX, startY: e.clientY } }}
          onPointerMove={e => { const d = drag.current; if (!d || d.id !== piece.id) return; const scale = WIDTH / board.current!.getBoundingClientRect().width; update(piece.id, { x: clamp(d.x + (e.clientX - d.startX) * scale, -piece.width + 30, WIDTH - 30), y: clamp(d.y + (e.clientY - d.startY) * scale, -piece.width / piece.ratio + 30, HEIGHT - 30) }) }}
          onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }} onLostPointerCapture={() => { drag.current = null }}
          onKeyDown={e => { const delta = e.shiftKey ? 10 : 1; if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) { e.preventDefault(); setPieces(current => [...current.filter(item => item.id !== piece.id), current.find(item => item.id === piece.id)!]); update(piece.id, { x: clamp(piece.x + (e.key === 'ArrowLeft' ? -delta : e.key === 'ArrowRight' ? delta : 0), -piece.width + 30, WIDTH - 30), y: clamp(piece.y + (e.key === 'ArrowUp' ? -delta : e.key === 'ArrowDown' ? delta : 0), -piece.width / piece.ratio + 30, HEIGHT - 30) }) } }}>
          <Frame piece={piece} register={register} report={report} />
          {!statuses[piece.id]?.ready && <span className="frame-status">{statuses[piece.id]?.error ? 'Video unavailable · select to replace' : 'Loading frame…'}</span>}
          <span className="piece-number">{index + 1}</span>
        </div>)}
      </div>
      {active && <section className="frame-editor" aria-label="Selected image controls">
        <div className="frame-editor-title"><span>Image {pieces.findIndex(p => p.id === active.id) + 1}</span><a href={active.post.postUrl} target="_blank" rel="noreferrer">View post ↗</a></div>
        {activeStatus?.error && <p className="error" role="alert">{activeStatus.error} <button onClick={() => replace(active.post)}>Retry</button></p>}
        <div className="frame-controls"><label className="frame-scrubber">Frame <span>{(active.frame * Math.max(0, (activeStatus?.duration || 0) - .1)).toFixed(1)}s / {(activeStatus?.duration || 0).toFixed(1)}s</span><input type="range" min="0" max="1" step="0.001" value={active.frame} onChange={e => update(active.id, { frame: Number(e.target.value) })} /></label>
          <button onClick={() => update(active.id, { frame: randomTime() })}>Random frame</button>
          <label>Width · {Math.round(active.width)}px<input type="range" min={Math.min(30, Math.floor(active.width))} max={Math.max(1400, Math.ceil(active.width))} value={active.width} onChange={e => update(active.id, { width: Number(e.target.value) })} /></label>
          <button onClick={() => setPieces(p => [...p.filter(item => item.id !== active.id), active])}>Bring to front</button>
        </div>
        <div className="frame-controls"><label className="post-picker">Video <select value={active.post.uri} onChange={e => replace(posts.find(p => p.uri === e.target.value)!)}>{posts.map((post, i) => <option key={post.uri} value={post.uri}>{i + 1}. {post.text.slice(0, 100) || post.createdAt}</option>)}</select></label><button onClick={() => { const alternatives = posts.filter(p => p.uri !== active.post.uri); replace(alternatives[Math.floor(Math.random() * alternatives.length)] || active.post) }}>Random video</button></div>
      </section>}
      <p className="collage-hint">Arrow keys move the selected image; hold Shift for larger steps. Set an image count from 1–50. Reducing the count removes the frontmost images. Download your collage before leaving this page.</p>
    </>}
  </main>
}
