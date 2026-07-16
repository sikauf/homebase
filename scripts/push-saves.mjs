#!/usr/bin/env node
// Pushes the local Steam save files to the remote homebase server so the
// StS2 / Shovel Knight tabs work away from this Mac (snapshot model).
// Usage: npm run push-saves   (reads HOMEBASE_URL, AUTH_PASSWORD and the
// save paths from the root .env)

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  const env = { ...process.env }
  const file = path.join(root, '.env')
  if (!fs.existsSync(file)) return env
  for (const line of fs.readFileSync(file, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) env[key] = value
  }
  return env
}

const env = loadEnv()
const baseUrl = env.HOMEBASE_URL?.replace(/\/$/, '')
// HOMEBASE_PASSWORD locally (so the dev server doesn't turn auth on by
// loading .env); AUTH_PASSWORD is the name the server itself uses in prod.
const password = env.HOMEBASE_PASSWORD ?? env.AUTH_PASSWORD

if (!baseUrl) {
  console.error('HOMEBASE_URL is not set in .env (e.g. https://sam-homebase.fly.dev)')
  process.exit(1)
}
if (!password) {
  console.error('HOMEBASE_PASSWORD is not set in .env')
  process.exit(1)
}

const targets = [
  { name: 'Slay the Spire 2', file: env.STS2_SAVE_PATH, endpoint: '/api/games/sts2/save' },
  { name: 'Shovel Knight', file: env.SHOVEL_KNIGHT_SAVE_PATH, endpoint: '/api/games/shovelknight/save' },
]

let failed = false
for (const { name, file, endpoint } of targets) {
  if (!file) {
    console.log(`- ${name}: save path not configured, skipping`)
    continue
  }
  let data
  try {
    data = fs.readFileSync(file).toString('base64')
  } catch (err) {
    console.error(`- ${name}: could not read ${file} (${err.message})`)
    failed = true
    continue
  }
  try {
    const res = await fetch(baseUrl + endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${password}`,
      },
      body: JSON.stringify({ data }),
    })
    if (res.ok) {
      console.log(`✓ ${name}: pushed`)
    } else {
      const body = await res.json().catch(() => null)
      console.error(`- ${name}: server said ${res.status} ${body?.error ?? ''}`)
      failed = true
    }
  } catch (err) {
    console.error(`- ${name}: could not reach ${baseUrl} (${err.message})`)
    failed = true
  }
}

process.exit(failed ? 1 : 0)
