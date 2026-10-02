import type { DemoPost, FeedViewPost } from './types'

const API = 'https://public.api.bsky.app/xrpc'

export function actorFromInput(input: string) {
  const value = input.trim().replace(/^@/, '')
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`)
    const match = url.pathname.match(/^\/profile\/([^/]+)/)
    return match?.[1] ?? value
  } catch {
    return value
  }
}

export function toDemo(view: FeedViewPost): DemoPost {
  const { post } = view
  const rkey = post.uri.split('/').at(-1) ?? ''
  const embed = post.embed
  const isVideo = embed?.$type?.includes('video') || Boolean(embed?.playlist)
  return {
    uri: post.uri,
    cid: post.cid,
    text: post.record.text ?? '',
    createdAt: post.record.createdAt ?? '',
    author: {
      handle: post.author.handle,
      displayName: post.author.displayName || post.author.handle,
      avatar: post.author.avatar,
    },
    postUrl: `https://bsky.app/profile/${post.author.handle}/post/${rkey}`,
    facets: post.record.facets,
    video: isVideo && embed?.playlist ? {
      playlist: embed.playlist,
      thumbnail: embed.thumbnail,
      alt: embed.alt,
      width: embed.aspectRatio?.width,
      height: embed.aspectRatio?.height,
    } : undefined,
    images: embed?.images?.map(image => ({ ...image, alt: image.alt ?? '' })),
  }
}

export async function getAuthorPosts(actor: string, cursor?: string) {
  const params = new URLSearchParams({ actor: actorFromInput(actor), limit: '50', filter: 'posts_no_replies' })
  if (cursor) params.set('cursor', cursor)
  const response = await fetch(`${API}/app.bsky.feed.getAuthorFeed?${params}`)
  if (!response.ok) throw new Error(response.status === 400 ? 'That Bluesky profile could not be found.' : `Bluesky returned ${response.status}.`)
  const data = await response.json() as { feed: FeedViewPost[]; cursor?: string }
  return { posts: data.feed.filter(item => !item.reason).map(toDemo), cursor: data.cursor }
}
