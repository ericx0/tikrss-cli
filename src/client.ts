// packages/cli/src/client.ts
import { z } from 'zod'
import { getResolvedApiKey, getResolvedApiUrl } from './config.js'

export const WhoamiResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
  }),
  tier: z.string(),
  permissions: z.record(z.boolean()),
  quotas: z.record(z.any()),
})
export type WhoamiResponse = z.infer<typeof WhoamiResponseSchema>

export const TodayItemSchema = z.object({
  id: z.string(),
  video_id: z.string().optional(),
  rank: z.number().optional(),
  title: z.string(),
  creator: z.string(),
  handle: z.string().optional(),
  platform: z.string(),
  duration_seconds: z.number().optional(),
  duration_formatted: z.string().optional(),
  read_minutes: z.number().optional(),
  reduction_percentage: z.string().optional(),
  summary_tldr: z.string(),
  why_it_matters: z.string().optional().nullable(),
  published_at: z.string().optional(),
  url: z.string().optional(),
})
export type TodayItem = z.infer<typeof TodayItemSchema>

export const TodayResponseSchema = z.object({
  date: z.string(),
  total: z.number(),
  items: z.array(TodayItemSchema),
})
export type TodayResponse = z.infer<typeof TodayResponseSchema>

export const VideoDetailSchema = z.object({
  id: z.string(),
  platform_video_id: z.string().optional(),
  title: z.string(),
  creator: z.string(),
  handle: z.string().optional(),
  platform: z.string(),
  url: z.string().optional().nullable(),
  published_at: z.string().optional().nullable(),
  duration: z.number().optional().nullable(),
  summary: z.string(),
  why_it_matters: z.string().optional().nullable(),
  claims: z.array(z.string()).optional(),
  quotes: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  transcript: z.string().optional(),
  extended_readings: z.array(z.any()).optional(),
})
export type VideoDetail = z.infer<typeof VideoDetailSchema>

export const SearchResponseSchema = z.object({
  query: z.string(),
  total: z.number(),
  results: z.array(
    z.object({
      id: z.string(),
      video_id: z.string().optional(),
      title: z.string(),
      creator: z.string().optional(),
      platform: z.string().optional(),
      summary: z.string().optional(),
      why_it_matters: z.string().optional().nullable(),
      url: z.string().optional(),
    })
  ),
})
export type SearchResponse = z.infer<typeof SearchResponseSchema>

export const SubscribeResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  creator: z.object({
    platform: z.string(),
    handle: z.string(),
    name: z.string(),
    status: z.string(),
    next_digest_queue: z.string().optional(),
  }),
})
export type SubscribeResponse = z.infer<typeof SubscribeResponseSchema>

export class TikRssError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public upgradeUrl?: string
  ) {
    super(message)
    this.name = 'TikRssError'
  }
}

export class TikRssClient {
  private apiKey: string
  private apiUrl: string
  private customFetch: typeof fetch

  constructor(options?: {
    apiKey?: string
    apiUrl?: string
    fetch?: typeof fetch
  }) {
    this.apiKey = options?.apiKey ?? getResolvedApiKey()
    this.apiUrl = (options?.apiUrl ?? getResolvedApiUrl()).replace(/\/$/, '')
    this.customFetch = options?.fetch ?? globalThis.fetch.bind(globalThis)
  }

  private async request<T>(endpoint: string, init?: RequestInit): Promise<T> {
    if (!this.apiKey) {
      throw new TikRssError(
        'Missing TikRSS API Key. Set TIKRSS_API_KEY environment variable or run `tikrss login <key>`.',
        401,
        'MISSING_KEY'
      )
    }

    const url = `${this.apiUrl}${endpoint}`
    const headers = new Headers(init?.headers)
    headers.set('Authorization', `Bearer ${this.apiKey}`)
    headers.set('Content-Type', 'application/json')
    headers.set('Accept', 'application/json')

    const res = await this.customFetch(url, {
      ...init,
      headers,
    })

    const data = ((await res.json().catch(() => null)) as Record<string, any> | null) ?? {}

    if (!res.ok) {
      if (res.status === 403 && data?.code === 'TIER_UPGRADE_REQUIRED') {
        throw new TikRssError(
          data.message || 'TikRSS CLI & MCP Server requires an active Power subscription.',
          403,
          'TIER_UPGRADE_REQUIRED',
          data.upgrade_url || 'https://tikrss.app/settings/billing'
        )
      }
      throw new TikRssError(
        data?.message || data?.error || `HTTP ${res.status} request failed`,
        res.status,
        data?.code || data?.error
      )
    }

    return data as T
  }

  async whoami(): Promise<WhoamiResponse> {
    const raw = await this.request('/api/v1/auth/whoami')
    return WhoamiResponseSchema.parse(raw)
  }

  async getTodayBriefing(): Promise<TodayResponse> {
    const raw = await this.request('/api/v1/today')
    return TodayResponseSchema.parse(raw)
  }

  async getVideoDetail(videoId: string): Promise<VideoDetail> {
    const raw = await this.request(`/api/v1/videos/${encodeURIComponent(videoId)}`)
    return VideoDetailSchema.parse(raw)
  }

  async search(query: string): Promise<SearchResponse> {
    const raw = await this.request(`/api/v1/search?q=${encodeURIComponent(query)}`)
    return SearchResponseSchema.parse(raw)
  }

  async subscribe(creatorUrl: string): Promise<SubscribeResponse> {
    const raw = await this.request('/api/v1/subscribe', {
      method: 'POST',
      body: JSON.stringify({ url: creatorUrl }),
    })
    return SubscribeResponseSchema.parse(raw)
  }
}
