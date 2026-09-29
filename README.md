# TikRSS CLI & Official Model Context Protocol (MCP) Server

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![MCP Protocol Compliant](https://img.shields.io/badge/MCP-2024--11--05-emerald.svg)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)

The official command-line interface (CLI) and **Model Context Protocol (MCP) Server** for [TikRSS](https://tikrss.app) — the high-signal daily briefing engine that distills hours of video & podcast content from creators you actually trust into actionable intelligence.

This unified package connects your local developer environment and frontier AI models (**Claude Desktop**, **Cursor**, **Windsurf**, and **Google Antigravity**) directly to your synthesized TikRSS knowledge streams.

---

## ✨ Features

- **🤖 Native AI Agent MCP Server**: Zero-setup integration with Claude Desktop and Cursor. Let your AI agents autonomously query creator briefings, search cross-video arguments, and fetch clean transcripts.
- **⚡ Developer Terminal CLI**: Read your daily video distillation stream right in your terminal with beautiful ANSI formatting, or export as clean Markdown to your local Obsidian vault.
- **🎯 1-Click Fast Ingestion**: Subscribe to YouTube channels (`@handle`), TikTok creators, or podcast feeds with a single command.
- **🔍 Semantic Claims Search**: Search across thousands of synthesized arguments and citations without watching 3-hour long podcasts.
- **🛡️ Built for Power Tier**: Full access to dedicated priority Whisper ASR transcription pipelines and unlimited creators.

---

## 🚀 Quick Start (CLI)

### 1. Install & Login

You can install globally or run via `npx`:

```bash
# Install globally
npm install -g tikrss

# Or run directly with npx
npx -y tikrss whoami
```

Configure your **TikRSS API Key** (obtainable from your [TikRSS Account Settings](https://tikrss.app/settings/account)):

```bash
tikrss login tr_live_your_api_key_here
```

Your credentials are securely saved in `~/.config/tikrss/config.json` with strict `0600` permissions. You can also supply the key via the `TIKRSS_API_KEY` environment variable.

### 2. Common CLI Commands

#### Fetch Today's Briefing
```bash
# Formatted terminal card output
tikrss today

# Export as clean Markdown
tikrss today --format markdown

# Raw JSON output for shell pipelines / jq
tikrss today --format json
```

#### Subscribe a Creator or Channel
```bash
tikrss add https://www.youtube.com/@karpathy
tikrss add https://www.youtube.com/@lexfridman
```

#### Search Claims & Topics
```bash
tikrss search "test-time compute scaling"
```

#### Export Video Distillation to Obsidian / Local Markdown
```bash
tikrss export karpathy-cot-2026 --out ~/Documents/ObsidianVault/Briefings
```

---

## 🤖 Model Context Protocol (MCP) Integration

TikRSS provides a native, compliant MCP Server over `stdio`. It connects your AI agents directly to your video digest archive.

### 1. Claude Desktop Setup

Open your Claude Desktop configuration file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add the `tikrss` server:

```json
{
  "mcpServers": {
    "tikrss": {
      "command": "npx",
      "args": ["-y", "tikrss", "mcp"],
      "env": {
        "TIKRSS_API_KEY": "tr_live_••••••••"
      }
    }
  }
}
```

Restart Claude Desktop. You will see the hammer icon with 5 TikRSS tools enabled!

### 2. Cursor Setup

1. Open **Cursor Settings** > **Features** > **MCP**.
2. Click **+ Add New MCP Server**.
3. Fill in:
   - **Name**: `tikrss`
   - **Type**: `command`
   - **Command**: `npx -y tikrss mcp`
   - **Environment Variables**: `TIKRSS_API_KEY=tr_live_••••••••`

---

## 🛠️ MCP Tools Reference

When connected via MCP, your AI assistant gains access to the following 5 tools:

| Tool | Parameters | Description |
| :--- | :--- | :--- |
| `tikrss_today` | `format` (optional: `markdown` or `json`) | Retrieves today's synthesized briefings from your subscribed creators. |
| `tikrss_read_video` | `video_id` (required) | Reads full distillation (Executive Summary, Why It Matters, core claims, quotes, and research papers). |
| `tikrss_search_claims` | `query` (required) | Semantic search across all video briefings, arguments, and topics in your archive. |
| `tikrss_subscribe` | `url` (required) | Autonomously subscribes a creator URL to your daily morning briefing pipeline. |
| `tikrss_get_transcript` | `video_id` (required) | Retrieves cleaned full-text transcript with commercial sponsors and fluff stripped out. |

---

## 💬 Example Prompts for AI Agents

Once configured, simply chat naturally in Claude or Cursor:

- *"What did Andrej Karpathy and Lex Fridman say about test-time compute in their latest videos?"*
  *(Claude automatically calls `tikrss_search_claims`)*
- *"Give me today's TikRSS morning briefing and draft a 3-bullet summary for our team."*
  *(Claude automatically calls `tikrss_today`)*
- *"Subscribe this YouTube channel: `https://www.youtube.com/@hubermanlab` to my daily TikRSS digests."*
  *(Claude automatically calls `tikrss_subscribe`)*

---

## ⚙️ Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `TIKRSS_API_KEY` | Your TikRSS API Key (starts with `tr_live_`) | None |
| `TIKRSS_API_URL` | Self-hosted or custom TikRSS API endpoint | `https://tikrss.app` |
| `TIKRSS_CONFIG_DIR` | Custom directory for config file | `~/.config/tikrss` |

---

## 🔒 Security & Privacy

- **Minimal Permissions**: The MCP Server runs strictly in stdio mode and only communicates with the official TikRSS HTTPS API endpoint.
- **Safe Token Storage**: Local config files are written with POSIX file permissions `0600` (readable only by the current user).
- **No Telemetry**: No third-party trackers, analytics, or background telemetry.

---

## 📄 License

[MIT License](LICENSE) © 2026 TikRSS Team
