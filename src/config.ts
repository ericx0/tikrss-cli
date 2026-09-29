// packages/cli/src/config.ts
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export interface TikRssConfig {
  apiKey?: string
  apiUrl?: string
}

function getConfigDir(): string {
  const custom = process.env.TIKRSS_CONFIG_DIR
  if (custom) return custom
  return path.join(os.homedir(), '.config', 'tikrss')
}

export function getConfigPath(): string {
  if (process.env.TIKRSS_CONFIG_PATH) return process.env.TIKRSS_CONFIG_PATH
  return path.join(getConfigDir(), 'config.json')
}

export function loadConfig(): TikRssConfig {
  try {
    const configPath = getConfigPath()
    if (!fs.existsSync(configPath)) {
      return {}
    }
    const raw = fs.readFileSync(configPath, 'utf-8')
    return JSON.parse(raw) as TikRssConfig
  } catch {
    return {}
  }
}

export function saveConfig(updates: Partial<TikRssConfig>): TikRssConfig {
  const current = loadConfig()
  const next: TikRssConfig = { ...current, ...updates }
  const configPath = getConfigPath()
  const dir = path.dirname(configPath)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
  }

  fs.writeFileSync(configPath, JSON.stringify(next, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  })

  return next
}

export function getResolvedApiKey(): string {
  const envKey = process.env.TIKRSS_API_KEY
  if (envKey && envKey.trim()) {
    return envKey.trim()
  }
  const config = loadConfig()
  return config.apiKey || ''
}

export function getResolvedApiUrl(): string {
  const envUrl = process.env.TIKRSS_API_URL
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, '')
  }
  const config = loadConfig()
  return (config.apiUrl || 'http://localhost:3000').replace(/\/$/, '')
}
