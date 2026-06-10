import fs from 'fs'
import zlib from 'zlib'

// Player.nfp is a raw-DEFLATE stream. Inflated, it holds one ~289-byte block per
// campaign, each introduced by the campaign's internal code (e.g. "cam1") and
// terminated by a constant 40 e2 01 marker. Per-mission completion is encoded as
// a run of 0x01 flag bytes in the tail of the block, just before that marker.
//
// The flag encoding is heuristic (it conflates a couple of states the game tracks
// internally), so callers clamp the detected count to the campaign's real mission
// count and let manual overrides take precedence. See campaigns.ts.

const TOKEN = /[a-z]{0,3}cam\d/g
const MARKER = Buffer.from([0x40, 0xe2, 0x01])
const FLAG_WINDOW = 24 // bytes before the marker that hold the flag array

/** Inflate a Player.nfp buffer. Returns null if it isn't a valid DEFLATE stream. */
export function inflate(raw: Buffer): Buffer | null {
  try {
    return zlib.inflateRawSync(raw)
  } catch {
    return null
  }
}

/**
 * Map each campaign code found in an inflated profile to the number of missions
 * detected as completed (raw, unclamped).
 */
export function parseProfile(inflated: Buffer): Record<string, number> {
  const text = inflated.toString('latin1')
  const tokens: { code: string; start: number }[] = []
  for (const m of text.matchAll(TOKEN)) tokens.push({ code: m[0], start: m.index! })

  const out: Record<string, number> = {}
  for (let i = 0; i < tokens.length; i++) {
    const start = tokens[i].start
    const end = i + 1 < tokens.length ? tokens[i + 1].start : inflated.length
    const block = inflated.subarray(start, end)

    let mark = block.lastIndexOf(MARKER)
    if (mark < 0) mark = block.length
    const windowStart = Math.max(0, mark - FLAG_WINDOW)

    let completed = 0
    for (let j = windowStart; j < mark; j++) if (block[j] === 0x01) completed++
    out[tokens[i].code] = completed
  }
  return out
}

/**
 * Read the configured profile and return detected completion per campaign code.
 * Returns null when the save isn't configured/readable/parseable — the route
 * treats that as "no auto-detection available" rather than an error.
 */
export function readDetected(): Record<string, number> | null {
  const savePath = process.env.AOE2_SAVE_PATH
  if (!savePath) return null

  let raw: Buffer
  try {
    raw = fs.readFileSync(savePath)
  } catch {
    return null
  }

  const inflated = inflate(raw)
  if (!inflated) return null
  return parseProfile(inflated)
}
