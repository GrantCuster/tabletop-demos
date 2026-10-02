export type DemoPost = {
  uri: string
  cid: string
  text: string
  createdAt: string
  author: { handle: string; displayName: string; avatar?: string }
  postUrl: string
  facets?: TextFacet[]
  video?: { playlist: string; thumbnail?: string; alt?: string; width?: number; height?: number }
  images?: { thumb: string; fullsize: string; alt: string }[]
}

export type TextFacet = {
  index: { byteStart: number; byteEnd: number }
  features: { $type?: string; uri?: string }[]
}

export type Selection = { updatedAt: string; posts: DemoPost[] }

export type FeedViewPost = {
  post: {
    uri: string
    cid: string
    author: { handle: string; displayName?: string; avatar?: string }
    record: { text?: string; createdAt?: string; facets?: TextFacet[] }
    embed?: {
      $type?: string
      playlist?: string
      thumbnail?: string
      alt?: string
      aspectRatio?: { width: number; height: number }
      images?: { thumb: string; fullsize: string; alt?: string }[]
    }
  }
  reply?: unknown
  reason?: unknown
}
