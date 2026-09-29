// packages/cli/src/mcp.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js'
import { TikRssClient, TikRssError } from './client.js'

export function createMcpServer(client?: TikRssClient) {
  const tikrss = client ?? new TikRssClient()

  const server = new Server(
    {
      name: 'tikrss-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  )

  // 1. List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'tikrss_today',
          description:
            "Retrieve today's synthesized video intelligence briefings from your subscribed creators. Returns ranked TLDRs, Why It Matters, duration compression rates, and links.",
          inputSchema: {
            type: 'object',
            properties: {
              format: {
                type: 'string',
                enum: ['markdown', 'json'],
                description: 'Output format (default: markdown)',
              },
            },
          },
        },
        {
          name: 'tikrss_read_video',
          description:
            'Read the in-depth distillation for a specific video, including executive summary, why it matters, core claims, verbatim quotes, and related readings.',
          inputSchema: {
            type: 'object',
            properties: {
              video_id: {
                type: 'string',
                description: 'The platform video ID or TikRSS UUID (e.g. karpathy-cot-2026)',
              },
            },
            required: ['video_id'],
          },
        },
        {
          name: 'tikrss_search_claims',
          description:
            'Search across video intelligence summaries, claims, creator thesis points, and topics in your knowledge archive.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search keywords or semantic topic query',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'tikrss_subscribe',
          description:
            'Add a new creator or video URL (YouTube, TikTok, or Apple/RSS Podcast) to your autonomous TikRSS daily briefing pipeline.',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'The creator channel or video URL to subscribe',
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'tikrss_get_transcript',
          description:
            'Retrieve the clean, full-text transcript of a video with commercial sponsor ads and fluff stripped out.',
          inputSchema: {
            type: 'object',
            properties: {
              video_id: {
                type: 'string',
                description: 'The platform video ID or TikRSS UUID',
              },
            },
            required: ['video_id'],
          },
        },
      ],
    }
  })

  // 2. Call tool execution handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    try {
      switch (name) {
        case 'tikrss_today': {
          const briefing = await tikrss.getTodayBriefing()
          const format = (args?.format as string) || 'markdown'

          if (format === 'json') {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(briefing, null, 2),
                },
              ],
            }
          }

          // Markdown output
          const mdLines = [
            `# ⚡ TikRSS Daily Briefing — ${briefing.date}`,
            `*${briefing.total} videos distilled into actionable intelligence*\n`,
          ]

          briefing.items.forEach((item) => {
            mdLines.push(`### #${item.rank || 1} ${item.title}`)
            mdLines.push(`**Creator**: ${item.creator} (${item.platform}) | **Time Saved**: ${item.duration_formatted || ''} → ${item.read_minutes}m (${item.reduction_percentage || ''} reduction)`)
            mdLines.push(`\n**TL;DR**: ${item.summary_tldr}`)
            if (item.why_it_matters) {
              mdLines.push(`**Why it matters**: ${item.why_it_matters}`)
            }
            if (item.url) {
              mdLines.push(`[Read full distillation on TikRSS](${item.url})`)
            }
            mdLines.push('\n---\n')
          })

          return {
            content: [{ type: 'text', text: mdLines.join('\n') }],
          }
        }

        case 'tikrss_read_video': {
          const videoId = String(args?.video_id || '')
          if (!videoId) {
            throw new McpError(ErrorCode.InvalidParams, 'video_id is required')
          }

          const detail = await tikrss.getVideoDetail(videoId)
          const mdLines = [
            `# ${detail.title}`,
            `**Creator**: ${detail.creator} (${detail.handle || ''}) · ${detail.platform}`,
            detail.published_at ? `**Published**: ${detail.published_at}` : '',
            detail.url ? `**Source URL**: ${detail.url}` : '',
            '\n## Executive Summary',
            detail.summary,
            '\n## Why It Matters',
            detail.why_it_matters || 'Critical industry update.',
          ]

          if (detail.claims && detail.claims.length > 0) {
            mdLines.push('\n## Core Claims & Evidence')
            detail.claims.forEach((claim) => mdLines.push(`- ${claim}`))
          }

          if (detail.quotes && detail.quotes.length > 0) {
            mdLines.push('\n## Verbatim Key Quotes')
            detail.quotes.forEach((q) => mdLines.push(`> ${q}`))
          }

          if (detail.extended_readings && detail.extended_readings.length > 0) {
            mdLines.push('\n## Extended References & Papers')
            detail.extended_readings.forEach((r) => {
              mdLines.push(`- [${r.title}](${r.url}): ${r.excerpt || ''}`)
            })
          }

          return {
            content: [{ type: 'text', text: mdLines.join('\n') }],
          }
        }

        case 'tikrss_search_claims': {
          const query = String(args?.query || '')
          if (!query) {
            throw new McpError(ErrorCode.InvalidParams, 'query is required')
          }

          const results = await tikrss.search(query)
          if (results.results.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: `No matching claims found in TikRSS archive for query: "${query}".`,
                },
              ],
            }
          }

          const lines = [
            `# Search results for "${query}" (${results.total} matches):`,
            '',
          ]

          results.results.forEach((r, idx) => {
            lines.push(`### ${idx + 1}. ${r.title}`)
            if (r.creator) lines.push(`**Creator**: ${r.creator}`)
            if (r.summary) lines.push(`**Summary**: ${r.summary}`)
            if (r.why_it_matters) lines.push(`**Why it matters**: ${r.why_it_matters}`)
            lines.push('')
          })

          return {
            content: [{ type: 'text', text: lines.join('\n') }],
          }
        }

        case 'tikrss_subscribe': {
          const url = String(args?.url || '')
          if (!url) {
            throw new McpError(ErrorCode.InvalidParams, 'url is required')
          }

          const res = await tikrss.subscribe(url)
          return {
            content: [
              {
                type: 'text',
                text: `✅ ${res.message}\nPlatform: ${res.creator.platform}\nHandle: ${res.creator.handle}\nQueue: Next scheduled digest at ${res.creator.next_digest_queue || '07:00 UTC'}.`,
              },
            ],
          }
        }

        case 'tikrss_get_transcript': {
          const videoId = String(args?.video_id || '')
          if (!videoId) {
            throw new McpError(ErrorCode.InvalidParams, 'video_id is required')
          }

          const detail = await tikrss.getVideoDetail(videoId)
          const transcript = detail.transcript || 'No transcript available for this video.'

          return {
            content: [
              {
                type: 'text',
                text: `# Transcript: ${detail.title} (${detail.creator})\n\n${transcript}`,
              },
            ],
          }
        }

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`)
      }
    } catch (err: any) {
      if (err instanceof TikRssError) {
        if (err.code === 'TIER_UPGRADE_REQUIRED') {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `🔒 Power Tier Required: ${err.message}\nUpgrade your plan at: ${err.upgradeUrl || 'https://tikrss.app/settings/billing'}`,
              },
            ],
          }
        }
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `TikRSS API Error: ${err.message}`,
            },
          ],
        }
      }

      if (err instanceof McpError) throw err

      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Execution failed: ${err?.message || String(err)}`,
          },
        ],
      }
    }
  })

  return server
}

export async function runMcpServer(client?: TikRssClient) {
  const server = createMcpServer(client)
  const transport = new StdioServerTransport()
  await server.connect(transport)
  // Process keeps running via stdio
}
