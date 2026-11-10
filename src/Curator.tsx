import { useEffect, useRef, useState } from 'react'
import { getAuthorPosts } from './bluesky'
import { Card } from './Card'
import type { DemoPost, Selection } from './types'

const AUTOSAVE_DELAY = 500

export function Curator() {
  const [posts, setPosts] = useState<DemoPost[]>([])
  const [savedPosts, setSavedPosts] = useState<DemoPost[]>([])
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [selectionReady, setSelectionReady] = useState(false)
  const [cursor, setCursor] = useState<string>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const postsRef = useRef<DemoPost[]>([])
  const savedPostsRef = useRef<DemoPost[]>([])
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const saveQueue = useRef(Promise.resolve())
  const actor = 'grantcuster.com'

  useEffect(() => {
    void load()
    let ignore = false
    fetch('/selection.json')
      .then(response => response.ok ? response.json() as Promise<Selection> : Promise.reject(new Error('Could not load saved selection.')))
      .then(data => {
        if (ignore) return
        savedPostsRef.current = data.posts
        setSavedPosts(data.posts)
        setSelected(new Set(data.posts.map(post => post.uri)))
      })
      .catch(() => { if (!ignore) setError('Could not load the saved selection.') })
      .finally(() => { if (!ignore) setSelectionReady(true) })
    return () => { ignore = true; clearTimeout(saveTimer.current) }
  }, [])

  async function load(more = false) {
    setLoading(true); setError('')
    try {
      const result = await getAuthorPosts(actor, more ? cursor : undefined)
      const mediaPosts = result.posts.filter(post => post.video || post.images?.length)
      setPosts(current => {
        const next = more ? [...current, ...mediaPosts] : mediaPosts
        postsRef.current = next
        return next
      })
      setCursor(result.cursor)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load posts.') }
    finally { setLoading(false) }
  }

  function toggle(uri: string) {
    setError('')
    setSelected(current => {
      const next = new Set(current)
      next.has(uri) ? next.delete(uri) : next.add(uri)
      scheduleSave(next)
      return next
    })
  }

  function selectionData(next: Set<string>): Selection {
    const latest = new Map(postsRef.current.map(post => [post.uri, post]))
    const savedUris = new Set(savedPostsRef.current.map(post => post.uri))
    const retained = savedPostsRef.current
      .filter(post => next.has(post.uri))
      .map(post => latest.get(post.uri) ?? post)
    const additions = postsRef.current.filter(post => next.has(post.uri) && !savedUris.has(post.uri))
    return {
      updatedAt: new Date().toISOString(),
      posts: [...retained, ...additions].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    }
  }

  function scheduleSave(next: Set<string>) {
    clearTimeout(saveTimer.current)
    setSaveStatus('saving')
    saveTimer.current = setTimeout(() => {
      const data = selectionData(next)
      saveQueue.current = saveQueue.current
        .catch(() => undefined)
        .then(async () => {
          const response = await fetch('/api/selection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })
          if (!response.ok) throw new Error('Save failed')
          savedPostsRef.current = data.posts
          setSavedPosts(data.posts)
          setSaveStatus('saved')
        })
        .catch(() => {
          setSaveStatus('error')
          setError('Could not save automatically. Run the curator with npm run dev.')
        })
    }, AUTOSAVE_DELAY)
  }

  const savedCount = savedPosts.filter(post => selected.has(post.uri)).length

  return <main className="curator">
    <nav><a href="/" className="back">← Gallery</a><a href="/collage">Collage</a><span>{selected.size} selected</span></nav>
    <section className="curator-head">
      <div><h1>Choose posts</h1><p>Posts by @{actor}</p></div>
      <div className="save-area" aria-live="polite">{saveStatus === 'saving' ? 'Saving…' : saveStatus === 'error' ? 'Save failed' : 'Saved automatically'}</div>
    </section>
    {!selectionReady && <p className="notice">Loading saved selection…</p>}
    {loading && !posts.length && <p className="notice">Loading posts…</p>}
    {error && <p className="error">{error} <button onClick={() => load()}>Try again</button></p>}
    {posts.length > 0 && selectionReady && <><div className="filter-line"><span>{posts.length} posts loaded</span><span>{posts.filter(p => p.video).length} videos</span><span>{savedCount} saved</span></div><div className="grid curate-grid">{posts.map(post => <Card key={post.uri} post={post} selecting selected={selected.has(post.uri)} onToggle={() => toggle(post.uri)} />)}</div>{cursor && <button className="more" onClick={() => load(true)} disabled={loading}>Load older posts</button>}</>}
  </main>
}
