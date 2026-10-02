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
  return <>
    <header className="gallery-head">
      <span>{selection.posts.length} tabletop demos</span>
      <span className="byline">by <a href="https://grantcuster.com" target="_blank" rel="noreferrer">Grant Custer</a></span>
    </header>
    <main>
      {selection.posts.length ? <div className="grid">{selection.posts.slice(0, visible).map(post => <Card key={post.uri} post={post} />)}</div> : <section className="empty"><p>No demos selected yet.</p><a href="/curate">Open the curator</a></section>}
      <div ref={sentinel} className="sentinel" />
    </main>
  </>
}
