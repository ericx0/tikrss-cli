// packages/cli/tests/client.test.ts
import { describe, it, expect, vi } from 'vitest'
import { TikRssClient, TikRssError } from '../src/client.js'

describe('TikRssClient', () => {
  it('throws MISSING_KEY when no API key is provided', async () => {
    const client = new TikRssClient({ apiKey: '', apiUrl: 'http://api.test' })
    await expect(client.whoami()).rejects.toThrow('Missing TikRSS API Key')
  })

  it('handles whoami successfully with Power tier', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        user: { id: 'u1', email: 'test@tikrss.com' },
        tier: 'power',
        permissions: { mcp_server: true, cli_access: true },
        quotas: { creators_tracked: 5, creators_limit: null },
      }),
    })

    const client = new TikRssClient({
      apiKey: 'test-key',
      apiUrl: 'http://api.test',
      fetch: mockFetch as any,
    })

    const res = await client.whoami()
    expect(res.user.email).toBe('test@tikrss.com')
    expect(res.tier).toBe('power')
    expect(mockFetch).toHaveBeenCalledWith(
      'http://api.test/api/v1/auth/whoami',
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    )
  })

  it('handles 403 TIER_UPGRADE_REQUIRED properly', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        error: 'tier_upgrade_required',
        code: 'TIER_UPGRADE_REQUIRED',
        message: 'Exclusive to Power subscribers.',
        upgrade_url: 'https://tikrss.app/settings/billing',
      }),
    })

    const client = new TikRssClient({
      apiKey: 'pro-key',
      apiUrl: 'http://api.test',
      fetch: mockFetch as any,
    })

    await expect(client.getTodayBriefing()).rejects.toThrowError(TikRssError)
    try {
      await client.getTodayBriefing()
    } catch (e: any) {
      expect(e.code).toBe('TIER_UPGRADE_REQUIRED')
      expect(e.statusCode).toBe(403)
      expect(e.upgradeUrl).toBe('https://tikrss.app/settings/billing')
    }
  })

  it('fetches today briefing correctly', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        date: '2026-09-29',
        total: 1,
        items: [
          {
            id: 'v1',
            title: 'Test Video',
            creator: 'Karpathy',
            platform: 'YouTube',
            summary_tldr: 'TLDR summary content',
          },
        ],
      }),
    })

    const client = new TikRssClient({
      apiKey: 'power-key',
      apiUrl: 'http://api.test',
      fetch: mockFetch as any,
    })

    const res = await client.getTodayBriefing()
    expect(res.items.length).toBe(1)
    expect(res.items[0]?.title).toBe('Test Video')
  })
})
