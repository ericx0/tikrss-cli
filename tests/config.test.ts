// packages/cli/tests/config.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { loadConfig, saveConfig, getResolvedApiKey, getResolvedApiUrl } from '../src/config.js'

describe('CLI Config Manager', () => {
  const tmpDir = path.join(os.tmpdir(), `tikrss-test-${Date.now()}`)
  const tmpConfig = path.join(tmpDir, 'config.json')

  beforeEach(() => {
    process.env.TIKRSS_CONFIG_PATH = tmpConfig
    delete process.env.TIKRSS_API_KEY
    delete process.env.TIKRSS_API_URL
  })

  afterEach(() => {
    delete process.env.TIKRSS_CONFIG_PATH
    delete process.env.TIKRSS_API_KEY
    delete process.env.TIKRSS_API_URL
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('returns empty config when file does not exist', () => {
    const config = loadConfig()
    expect(config).toEqual({})
  })

  it('saves and reloads config correctly', () => {
    saveConfig({ apiKey: 'tr_live_testkey123', apiUrl: 'https://api.tikrss.com' })
    const reloaded = loadConfig()
    expect(reloaded.apiKey).toBe('tr_live_testkey123')
    expect(reloaded.apiUrl).toBe('https://api.tikrss.com')
  })

  it('prefers environment variables over config file', () => {
    saveConfig({ apiKey: 'from_file', apiUrl: 'http://from-file.com' })
    process.env.TIKRSS_API_KEY = 'from_env'
    process.env.TIKRSS_API_URL = 'http://from-env.com/'

    expect(getResolvedApiKey()).toBe('from_env')
    expect(getResolvedApiUrl()).toBe('http://from-env.com')
  })
})
