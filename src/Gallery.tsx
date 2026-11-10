import { useEffect, useRef, useState } from 'react'
import { Card } from './Card'
import type { Selection } from './types'

const PAGE_SIZE = 9

export function Gallery() {
  const [selection, setSelection] = useState<Selection | null>(null)
  const [visible, setVisible] = useState(PAGE_SIZE)
  const sentinel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    fetch('/selection.json').then(r => r.json()).then(setSelection).catch(() => setSelection({ updatedAt: '', posts: [] }))
  }, [])
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setVisible(n => n + PAGE_SIZE), { rootMargin: '500px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [selection])
  if (!selection) return <main className="status">Loading demos…</main>
  const posts = [...selection.posts].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  return <>
    <header className="gallery-head">
      <div className="gallery-head-row">
        <span className="gallery-title">Tabletop</span>
        <span className="byline">by <a href="https://grantcuster.com" target="_blank" rel="noreferrer">Grant Custer</a></span>
      </div>
      <p className="gallery-description">An ongoing series of demos exploring creative interfaces for a large multi-touch digital canvas.</p>
      <a className="gallery-setup-link" href="https://feed.grantcuster.com/post/2026-11-03-10-51-03-my-tabletop-computer-setup" target="_blank" rel="noreferrer">Read more about the physical setup</a>
    </header>
    <main>
      {posts.length ? <div className="grid">{posts.slice(0, visible).map(post => <Card key={post.uri} post={post} />)}</div> : <section className="empty"><p>No demos selected yet.</p><a href="/curate">Open the curator</a></section>}
      <div ref={sentinel} className="sentinel" />
    </main>
  </>
}
