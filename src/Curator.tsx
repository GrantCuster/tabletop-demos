import { useEffect, useMemo, useState } from 'react'
import { getAuthorPosts } from './bluesky'
import { Card } from './Card'
import type { DemoPost, Selection } from './types'

export function Curator() {
  const [posts, setPosts] = useState<DemoPost[]>([])
  const [selected, setSelected] = useState<Set<string>>(() => new Set(JSON.parse(localStorage.getItem('tabletop-selected') ?? '[]')))
  const [cursor, setCursor] = useState<string>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const selectedPosts = useMemo(() => posts.filter(post => selected.has(post.uri)), [posts, selected])
  const actor = 'grantcuster.com'

  useEffect(() => { load() }, [])

  async function load(more = false) {
    setLoading(true); setError('')
    try {
      const result = await getAuthorPosts(actor, more ? cursor : undefined)
      const mediaPosts = result.posts.filter(post => post.video || post.images?.length)
      setPosts(current => more ? [...current, ...mediaPosts] : mediaPosts)
      setCursor(result.cursor)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load posts.') }
    finally { setLoading(false) }
  }

  function toggle(uri: string) {
    setSaved(false)
    setSelected(current => {
      const next = new Set(current)
      next.has(uri) ? next.delete(uri) : next.add(uri)
      localStorage.setItem('tabletop-selected', JSON.stringify([...next]))
      return next
    })
  }

  async function save() {
    const data: Selection = { updatedAt: new Date().toISOString(), posts: selectedPosts }
    setSaving(true); setSaved(false); setError('')
    try {
      const response = await fetch('/api/selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Save failed')
      setSaved(true)
    } catch {
      setError('Could not save. Run the curator with npm run dev.')
    } finally { setSaving(false) }
  }

  return <main className="curator">
    <nav><a href="/" className="back">← Gallery</a><span>{selectedPosts.length} selected</span></nav>
    <section className="curator-head">
      <div><h1>Choose posts</h1><p>Posts by @{actor}</p></div>
      <div className="save-area">{saved && <span>Saved</span>}<button className="export" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button></div>
    </section>
    {loading && !posts.length && <p className="notice">Loading posts…</p>}
    {error && <p className="error">{error} <button onClick={() => load()}>Try again</button></p>}
    {posts.length > 0 && <><div className="filter-line"><span>{posts.length} posts</span><span>{posts.filter(p => p.video).length} videos</span></div><div className="grid curate-grid">{posts.map(post => <Card key={post.uri} post={post} selecting selected={selected.has(post.uri)} onToggle={() => toggle(post.uri)} />)}</div>{cursor && <button className="more" onClick={() => load(true)} disabled={loading}>Load older posts</button>}</>}
  </main>
}
