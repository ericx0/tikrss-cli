// packages/cli/tests/cli.test.ts
import { describe, it, expect } from 'vitest'
import { buildCli } from '../src/cli.js'

describe('TikRSS CLI Commander', () => {
  it('builds CLI with expected commands', () => {
    const program = buildCli()
    const commandNames = program.commands.map((c) => c.name())
    expect(commandNames).toContain('login')
    expect(commandNames).toContain('whoami')
    expect(commandNames).toContain('today')
    expect(commandNames).toContain('add')
    expect(commandNames).toContain('search')
    expect(commandNames).toContain('export')
    expect(commandNames).toContain('mcp')
  })

  it('outputs help text with description', () => {
    const program = buildCli()
    const help = program.helpInformation()
    expect(help).toContain('Official TikRSS Terminal CLI & Model Context Protocol (MCP) Server')
    expect(help).toContain('today')
    expect(help).toContain('mcp')
  })
})
