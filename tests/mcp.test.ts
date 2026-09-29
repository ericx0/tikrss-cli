// packages/cli/tests/mcp.test.ts
import { describe, it, expect, vi } from 'vitest'
import { createMcpServer } from '../src/mcp.js'
import { TikRssClient } from '../src/client.js'
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js'

describe('TikRSS MCP Server', () => {
  it('exposes the 5 expected MCP tools', async () => {
    const mockClient = {
      getTodayBriefing: vi.fn(),
      getVideoDetail: vi.fn(),
      search: vi.fn(),
      subscribe: vi.fn(),
    } as unknown as TikRssClient

    const server = createMcpServer(mockClient)
    // Directly invoke request handlers registered on server
    const listHandler = (server as any)._requestHandlers.get(ListToolsRequestSchema.shape.method.value)
    expect(listHandler).toBeDefined()

    const result = await listHandler({ method: 'tools/list' })
    const toolNames = result.tools.map((t: any) => t.name)
    expect(toolNames).toContain('tikrss_today')
    expect(toolNames).toContain('tikrss_read_video')
    expect(toolNames).toContain('tikrss_search_claims')
    expect(toolNames).toContain('tikrss_subscribe')
    expect(toolNames).toContain('tikrss_get_transcript')
  })

  it('executes tikrss_today tool successfully', async () => {
    const mockClient = {
      getTodayBriefing: vi.fn().mockResolvedValue({
        date: '2026-09-29',
        total: 1,
        items: [
          {
            id: 'v1',
            rank: 1,
            title: 'Latency in AI Agents',
            creator: 'Theo',
            platform: 'YouTube',
            summary_tldr: 'Cold starts matter.',
            duration_formatted: '10m',
            read_minutes: 2,
            reduction_percentage: '80%',
          },
        ],
      }),
    } as unknown as TikRssClient

    const server = createMcpServer(mockClient)
    const callHandler = (server as any)._requestHandlers.get(CallToolRequestSchema.shape.method.value)

    const res = await callHandler({
      method: 'tools/call',
      params: {
        name: 'tikrss_today',
        arguments: {},
      },
    })

    expect(res.content).toBeDefined()
    expect(res.content[0].text).toContain('Latency in AI Agents')
    expect(res.content[0].text).toContain('Cold starts matter.')
  })

  it('executes tikrss_search_claims tool successfully', async () => {
    const mockClient = {
      search: vi.fn().mockResolvedValue({
        query: 'reasoning',
        total: 1,
        results: [
          {
            id: 'v1',
            title: 'Chain-of-thought activations',
            creator: 'Karpathy',
            summary: 'Latent reasoning branches.',
          },
        ],
      }),
    } as unknown as TikRssClient

    const server = createMcpServer(mockClient)
    const callHandler = (server as any)._requestHandlers.get(CallToolRequestSchema.shape.method.value)

    const res = await callHandler({
      method: 'tools/call',
      params: {
        name: 'tikrss_search_claims',
        arguments: { query: 'reasoning' },
      },
    })

    expect(res.content[0].text).toContain('Chain-of-thought activations')
    expect(res.content[0].text).toContain('Karpathy')
  })
})
