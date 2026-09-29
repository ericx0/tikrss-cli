// packages/cli/src/index.ts
import { buildCli } from './cli.js'
import { runMcpServer, createMcpServer } from './mcp.js'
import { TikRssClient, TikRssError } from './client.js'

export { buildCli, createMcpServer, runMcpServer, TikRssClient, TikRssError }

// Direct execution detection
const isDirectRun =
  process.argv[1]?.endsWith('tikrss') ||
  process.argv[1]?.endsWith('tikrss.js') ||
  process.argv[1]?.endsWith('index.js') ||
  process.argv[1]?.endsWith('index.ts')

if (isDirectRun) {
  const args = process.argv.slice(2)
  if (args[0] === 'mcp') {
    // Run pure MCP stdio server without commander stdout banners
    runMcpServer().catch((err) => {
      console.error('Fatal MCP Server error:', err)
      process.exit(1)
    })
  } else {
    buildCli().parseAsync(process.argv).catch((err) => {
      console.error(err)
      process.exit(1)
    })
  }
}
