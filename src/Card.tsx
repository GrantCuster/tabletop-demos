import type { DemoPost, TextFacet } from './types'
import { Video } from './Video'

function relativeDate(value: string) {
  const elapsed = new Date(value).getTime() - Date.now()
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 365 * 24 * 60 * 60 * 1000],
    ['month', 30 * 24 * 60 * 60 * 1000],
    ['week', 7 * 24 * 60 * 60 * 1000],
    ['day', 24 * 60 * 60 * 1000],
    ['hour', 60 * 60 * 1000],
    ['minute', 60 * 1000],
  ]
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  for (const [unit, duration] of units) {
    if (Math.abs(elapsed) >= duration) return formatter.format(Math.round(elapsed / duration), unit)
  }
  return 'just now'
}

function linkedText(text: string, facets?: TextFacet[]) {
  const links = facets?.filter(facet => facet.features.some(feature => feature.uri)) ?? []
  if (links.length) {
    const bytes = new TextEncoder().encode(text)
    const decode = (start: number, end: number) => new TextDecoder().decode(bytes.slice(start, end))
    const parts = []
    let cursor = 0
    for (const facet of links.sort((a, b) => a.index.byteStart - b.index.byteStart)) {
      const uri = facet.features.find(feature => feature.uri)?.uri
      if (!uri || facet.index.byteStart < cursor) continue
      parts.push(decode(cursor, facet.index.byteStart))
      parts.push(<a key={`${facet.index.byteStart}-${uri}`} href={uri} target="_blank" rel="noreferrer">{decode(facet.index.byteStart, facet.index.byteEnd)}</a>)
      cursor = facet.index.byteEnd
    }
    parts.push(decode(cursor, bytes.length))
    return parts
  }

  const urlPattern = /\b(?:https?:\/\/|www\.|(?:[a-z0-9-]+\.)+[a-z]{2,}\/)[^\s)]+/gi
  const parts = []
  let cursor = 0
  for (const match of text.matchAll(urlPattern)) {
    const start = match.index
    parts.push(text.slice(cursor, start))
    const href = match[0].startsWith('http') ? match[0] : `https://${match[0]}`
    parts.push(<a key={`${start}-${href}`} href={href} target="_blank" rel="noreferrer">{match[0]}</a>)
    cursor = start + match[0].length
  }
  parts.push(text.slice(cursor))
  return parts
}

export function Card({ post, selecting, selected, onToggle }: { post: DemoPost; selecting?: boolean; selected?: boolean; onToggle?: () => void }) {
  const image = post.images?.[0]
  const date = post.createdAt ? relativeDate(post.createdAt) : ''
  return <article className={`card ${selected ? 'selected' : ''}`}>
    <div className="details">
      <div className="caption">
        <p>{post.text ? linkedText(post.text, post.facets) : <em>Untitled demo</em>}</p>
      </div>
    </div>
    <div className="media">
      {post.video ? <Video src={post.video.playlist} poster={post.video.thumbnail} label={post.video.alt} /> : image ? <img src={image.fullsize} alt={image.alt} loading="lazy" /> : <div className="no-media">Text post</div>}
      {selecting && <button className="select" onClick={onToggle} aria-pressed={selected}><span>{selected ? '✓' : '+'}</span>{selected ? 'Selected' : 'Select'}</button>}
    </div>
    {date && <a className="post-date" href={post.postUrl} target="_blank" rel="noreferrer"><time dateTime={post.createdAt}>{date}</time></a>}
  </article>
}
