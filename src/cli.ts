// packages/cli/src/cli.ts
import { Command } from 'commander'
import fs from 'node:fs'
import path from 'node:path'
import { saveConfig, getResolvedApiKey, getResolvedApiUrl, getConfigPath } from './config.js'
import { TikRssClient, TikRssError } from './client.js'
import { runMcpServer } from './mcp.js'

export function buildCli(): Command {
  const program = new Command()

  program
    .name('tikrss')
    .description('Official TikRSS Terminal CLI & Model Context Protocol (MCP) Server')
    .version('0.1.0')

  // Command: login
  program
    .command('login')
    .description('Configure your TikRSS API Key (Power Tier)')
    .argument('[apiKey]', 'Your TikRSS API Key (tr_live_...)')
    .action(async (apiKeyArg) => {
      let key = apiKeyArg
      if (!key) {
        console.error('Error: Please provide your API Key: tikrss login <API_KEY>')
        console.error('Get your API Key from https://tikrss.app/settings/account')
        process.exit(1)
      }

      key = key.trim()
      saveConfig({ apiKey: key })
      console.log(`✅ Saved API Key to ${getConfigPath()}`)

      // Verify key
      try {
        const client = new TikRssClient({ apiKey: key })
        const info = await client.whoami()
        console.log(`Logged in as: ${info.user.email} (${info.tier.toUpperCase()} Tier)`)
        if (info.tier !== 'power') {
          console.warn('⚠️ Warning: CLI & MCP access requires a Power subscription.')
          console.warn('Upgrade at: https://tikrss.app/settings/billing')
        }
      } catch (err: any) {
        console.warn(`Saved, but key verification check failed: ${err.message}`)
      }
    })

  // Command: whoami
  program
    .command('whoami')
    .description('Display current authenticated user and subscription tier')
    .action(async () => {
      try {
        const client = new TikRssClient()
        const info = await client.whoami()
        console.log('──────────────────────────────────────────────')
        console.log('⚡ TikRSS Identity & Quotas')
        console.log('──────────────────────────────────────────────')
        console.log(`User ID:        ${info.user.id}`)
        console.log(`Email:          ${info.user.email}`)
        console.log(`Tier:           ${info.tier.toUpperCase()}`)
        console.log(`MCP Enabled:    ${info.permissions.mcp_server ? 'YES' : 'NO'}`)
        console.log(`CLI Access:     ${info.permissions.cli_access ? 'YES' : 'NO'}`)
        console.log(`Tracked Feeds:  ${info.quotas.creators_tracked} / ${info.quotas.creators_limit ?? 'Unlimited'}`)
        console.log('──────────────────────────────────────────────')
      } catch (err: any) {
        handleCliError(err)
      }
    })

  // Command: today
  program
    .command('today')
    .description("Fetch today's video intelligence briefing")
    .option('-f, --format <format>', 'Output format: text, markdown, or json', 'text')
    .action(async (options) => {
      try {
        const client = new TikRssClient()
        const briefing = await client.getTodayBriefing()

        if (options.format === 'json') {
          console.log(JSON.stringify(briefing, null, 2))
          return
        }

        if (options.format === 'markdown') {
          console.log(`# TikRSS Briefing — ${briefing.date}\n`)
          briefing.items.forEach((item) => {
            console.log(`## #${item.rank || 1} ${item.title}`)
            console.log(`*${item.creator} (${item.platform})* · ${item.duration_formatted} → ${item.read_minutes}m`)
            console.log(`\n${item.summary_tldr}\n`)
            if (item.why_it_matters) console.log(`> **Why it matters**: ${item.why_it_matters}\n`)
          })
          return
        }

        // Terminal pretty table output
        console.log(`\n⚡ TikRSS Daily Briefing [${briefing.date}] — ${briefing.total} videos distilled\n`)
        briefing.items.forEach((item) => {
          console.log(`┌─ #${item.rank || 1} ${item.title}`)
          console.log(`│  Creator:  ${item.creator} (${item.platform})`)
          console.log(`│  Savings:  ${item.duration_formatted} original → ${item.read_minutes} min read (${item.reduction_percentage} saved)`)
          console.log(`│  TL;DR:    ${item.summary_tldr}`)
          if (item.why_it_matters) {
            console.log(`│  Impact:   ${item.why_it_matters}`)
          }
          console.log(`└─────────────────────────────────────────────────────────────────\n`)
        })
      } catch (err: any) {
        handleCliError(err)
      }
    })

  // Command: add
  program
    .command('add')
    .description('Subscribe a new creator or video URL into your TikRSS pipeline')
    .argument('<url>', 'YouTube, TikTok, or Podcast channel/video URL')
    .action(async (url) => {
      try {
        const client = new TikRssClient()
        console.log(`Subscribing ${url}...`)
        const res = await client.subscribe(url)
        console.log(`✅ ${res.message}`)
        console.log(`   Platform:  ${res.creator.platform}`)
        console.log(`   Creator:   ${res.creator.name} (${res.creator.handle})`)
        console.log(`   Next Run:  ${res.creator.next_digest_queue || '07:00 UTC'}`)
      } catch (err: any) {
        handleCliError(err)
      }
    })

  // Command: search
  program
    .command('search')
    .description('Search across claims, topics, and video summaries')
    .argument('<query>', 'Search keywords or thesis topic')
    .action(async (query) => {
      try {
        const client = new TikRssClient()
        const res = await client.search(query)
        console.log(`\n🔍 Found ${res.total} results for "${query}":\n`)
        res.results.forEach((r, i) => {
          console.log(`${i + 1}. ${r.title}`)
          if (r.creator) console.log(`   By:      ${r.creator}`)
          if (r.summary) console.log(`   Summary: ${r.summary}`)
          console.log('')
        })
      } catch (err: any) {
        handleCliError(err)
      }
    })

  // Command: export
  program
    .command('export')
    .description('Export video distillation to Markdown file or Obsidian vault')
    .argument('<videoId>', 'Video ID or platform ID (e.g. karpathy-cot-2026)')
    .option('-o, --out <directory>', 'Output directory (defaults to current dir)', '.')
    .action(async (videoId, options) => {
      try {
        const client = new TikRssClient()
        const detail = await client.getVideoDetail(videoId)
        const filename = `${detail.platform_video_id || videoId}.md`
        const targetPath = path.resolve(options.out, filename)

        const md = [
          '---',
          `title: "${detail.title.replace(/"/g, '\\"')}"`,
          `creator: "${detail.creator}"`,
          `platform: "${detail.platform}"`,
          `published: "${detail.published_at || ''}"`,
          `source_url: "${detail.url || ''}"`,
          'tags: [tikrss, video-distill]',
          '---',
          '',
          `# ${detail.title}`,
          '',
          `**Creator**: ${detail.creator} (${detail.handle || ''}) · ${detail.platform}`,
          '',
          '## Executive Summary',
          detail.summary,
          '',
          '## Why It Matters',
          detail.why_it_matters || '',
          '',
          '## Claims & Core Points',
          ...(detail.claims?.map((c) => `- ${c}`) || []),
          '',
          '## Transcript Excerpt',
          detail.transcript ? detail.transcript.slice(0, 1000) + '...' : '',
        ].join('\n')

        fs.writeFileSync(targetPath, md, 'utf-8')
        console.log(`✅ Exported to ${targetPath}`)
      } catch (err: any) {
        handleCliError(err)
      }
    })

  // Command: mcp
  program
    .command('mcp')
    .description('Start the Model Context Protocol (MCP) server over stdio for Claude Desktop / Cursor')
    .action(async () => {
      try {
        await runMcpServer()
      } catch (err: any) {
        console.error('MCP Server error:', err)
        process.exit(1)
      }
    })

  return program
}

function handleCliError(err: any): void {
  if (err instanceof TikRssError) {
    if (err.code === 'TIER_UPGRADE_REQUIRED') {
      console.error(`\n🔒 Power Tier Feature Required:`)
      console.error(`   ${err.message}`)
      console.error(`   Upgrade to Power at: ${err.upgradeUrl || 'https://tikrss.app/settings/billing'}\n`)
      process.exit(2)
    }
    if (err.code === 'MISSING_KEY') {
      console.error(`\n🔑 Authentication Required:`)
      console.error(`   ${err.message}\n`)
      process.exit(1)
    }
    console.error(`\n❌ TikRSS Error: ${err.message}\n`)
    process.exit(1)
  }

  console.error(`\n❌ Error: ${err.message || String(err)}\n`)
  process.exit(1)
}
