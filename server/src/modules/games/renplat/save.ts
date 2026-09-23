// Pokémon Platinum (USA) save-file parser — Renegade Platinum is a ROM hack of
// Platinum, so the save layout is byte-identical to the retail cart.
//
// Every offset below was verified against real saves from this run (see
// route.test.ts fixtures): playtime climbs monotonically across snapshots,
// badges go 0 -> 1, held items resolve to Charcoal / Sharp Beak / Twisted Spoon,
// and met locations resolve to Route 201 / Route 204 / Mt. Coronet.
//
// Layout: two 0x40000 save slots, each holding a "general" block (0xCF2C) then a
// "storage" block (0x121E4). Each block ends in a footer carrying its own size,
// save counter and CRC. The game only rewrites the storage block when the PC
// changed, so the two blocks are picked *independently* — the newest general
// block and the newest storage block routinely live in different slots.

import speciesData from './tables/species.json'
import movesData from './tables/moves.json'
import abilitiesData from './tables/abilities.json'
import itemsData from './tables/items.json'
import locationsData from './tables/locations.json'
import growthData from './tables/growth.json'

const SLOT_SIZE = 0x40000
const GENERAL_SIZE = 0xcf2c
const STORAGE_SIZE = 0x121e4
// Footer: save counter at (size - 0x14), block size at (size - 0xC), CRC16 of
// everything before the footer at (size - 0x2).
const FOOTER_LENGTH = 0x14
const FOOTER_COUNTER_AT = 0x14
const FOOTER_SIZE_AT = 0xc
const FOOTER_CRC_AT = 0x2

// General block (Platinum; the DP offsets are these minus 4).
const OFF_TRAINER_NAME = 0x68
const OFF_TRAINER_ID = 0x78
const OFF_SECRET_ID = 0x7a
const OFF_MONEY = 0x7c
const OFF_GENDER = 0x80
const OFF_BADGES = 0x82
const OFF_PLAYTIME = 0x8a
const OFF_PARTY_COUNT = 0x9c
const OFF_PARTY = 0xa0

// Storage block.
const OFF_BOX_DATA = 0x04
const BOX_COUNT = 18
const BOX_SLOTS = 30
const BOX_MON_SIZE = 136
const OFF_BOX_NAMES = OFF_BOX_DATA + BOX_COUNT * BOX_SLOTS * BOX_MON_SIZE
const BOX_NAME_SIZE = 40

// A party record is the 136-byte box record plus 100 bytes of battle stats.
const PARTY_MON_SIZE = 236
const OFF_BATTLE_STATS = 0x88
const BATTLE_STATS_SIZE = 100

// Renegade Platinum's hard level caps, indexed by badge count (0-8).
export const LEVEL_CAPS = [16, 26, 33, 39, 44, 53, 56, 62, 78]

const SPECIES = speciesData as Record<string, { name: string; types: string[] }>
const MOVES = movesData as Record<string, { name: string; type: string; category: string; power: number | null }>
const ABILITIES = abilitiesData as Record<string, string>
const ITEMS = itemsData as Record<string, string>
const LOCATIONS = locationsData as Record<string, string>
const GROWTH = growthData as { curves: Record<string, number[]>; rates: Record<string, number> }

/**
 * Box records store experience, not level — only *party* records carry a level
 * byte. So a mon sitting in the Grave box has to have its level derived from its
 * exp and its species' growth curve.
 */
function levelFromExp(species: number, exp: number): number {
  const curve = GROWTH.curves[String(GROWTH.rates[String(species)])]
  if (!curve) return 0
  let level = 1
  while (level < 100 && curve[level] <= exp) level++
  return level
}

const NATURES = [
  'Hardy', 'Lonely', 'Brave', 'Adamant', 'Naughty',
  'Bold', 'Docile', 'Relaxed', 'Impish', 'Lax',
  'Timid', 'Hasty', 'Serious', 'Jolly', 'Naive',
  'Modest', 'Mild', 'Quiet', 'Bashful', 'Rash',
  'Calm', 'Gentle', 'Sassy', 'Careful', 'Quirky',
]

const STAT_ORDER = ['hp', 'atk', 'def', 'spe', 'spa', 'spd'] as const
type StatKey = (typeof STAT_ORDER)[number]

/**
 * Gen-IV character codes. The alphanumeric ranges and the space were recovered
 * from the default box names ("BOX 1".."BOX 17") in a real save, which pins the
 * table exactly. Codes outside these ranges (accents, symbols) are dropped —
 * add them here if a nickname ever comes back with characters missing.
 */
function decodeChar(code: number): string {
  if (code >= 0x121 && code <= 0x12a) return String.fromCharCode(0x30 + code - 0x121) // 0-9
  if (code >= 0x12b && code <= 0x144) return String.fromCharCode(0x41 + code - 0x12b) // A-Z
  if (code >= 0x145 && code <= 0x15e) return String.fromCharCode(0x61 + code - 0x145) // a-z
  if (code === 0x1de) return ' '
  return ''
}

function decodeString(buf: Buffer, offset: number, maxChars: number): string {
  let out = ''
  for (let i = 0; i < maxChars; i++) {
    const at = offset + i * 2
    if (at + 1 >= buf.length) break
    const code = buf.readUInt16LE(at)
    if (code === 0xffff || code === 0) break
    out += decodeChar(code)
  }
  return out.trim()
}

/** Gen-IV LCRNG stream cipher: XOR each u16 with the high half of the next seed. */
function crypt(buf: Buffer, seed: number): Buffer {
  const out = Buffer.from(buf)
  let s = seed >>> 0
  for (let i = 0; i + 1 < out.length; i += 2) {
    s = (Math.imul(0x41c64e6d, s) + 0x6073) >>> 0
    out.writeUInt16LE(out.readUInt16LE(i) ^ (s >>> 16), i)
  }
  return out
}

// The 24 orderings the four 32-byte substructures can appear in, selected by PID.
const SHUFFLE_ORDERS: number[][] = (() => {
  const perms: number[][] = []
  const walk = (left: number[], acc: number[]) => {
    if (left.length === 0) return void perms.push(acc)
    for (let i = 0; i < left.length; i++) {
      walk([...left.slice(0, i), ...left.slice(i + 1)], [...acc, left[i]])
    }
  }
  walk([0, 1, 2, 3], [])
  return perms
})()

export interface Mon {
  pid: number
  species: number
  name: string
  types: string[]
  nickname: string
  level: number
  hp: number
  maxHp: number
  nature: string
  ability: string
  heldItem: string | null
  metLocation: string
  metLevel: number
  shiny: boolean
  moves: { name: string; type: string; category: string; power: number | null; pp: number }[]
  ivs: Record<StatKey, number>
  evs: Record<StatKey, number>
}

export interface Box {
  index: number
  name: string
  mons: Mon[]
}

export interface ParsedSave {
  trainerName: string
  trainerId: number
  secretId: number
  gender: 'male' | 'female'
  money: number
  badges: number
  levelCap: number
  playtime: { hours: number; minutes: number; seconds: number; total: number }
  saveCounter: number
  party: Mon[]
  boxes: Box[]
}

/** CRC-16/CCITT (poly 0x1021, init 0xFFFF) — the checksum Gen IV block footers carry. */
export function crc16(data: Buffer): number {
  let crc = 0xffff
  for (const byte of data) {
    crc ^= byte << 8
    for (let bit = 0; bit < 8; bit++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc
}

/**
 * The save counter of the block at `offset`, or null if the block isn't usable:
 * wrong size in the footer, an erased counter (0xFFFFFFFF — two of this run's own
 * snapshots have a slot like that, and trusting it reads garbage), or a CRC that
 * doesn't match (a write the game never finished).
 */
function blockCounter(buf: Buffer, offset: number, size: number): number | null {
  if (offset + size > buf.length) return null
  if (buf.readUInt32LE(offset + size - FOOTER_SIZE_AT) !== size) return null
  const counter = buf.readUInt32LE(offset + size - FOOTER_COUNTER_AT)
  if (counter === 0xffffffff) return null
  if (crc16(buf.subarray(offset, offset + size - FOOTER_LENGTH)) !== buf.readUInt16LE(offset + size - FOOTER_CRC_AT)) {
    return null
  }
  return counter
}

/**
 * The live copy of one block: whichever slot holds it with the higher valid
 * counter. Chosen per block, never per slot — saving without touching the PC
 * writes only a new general block, so after a box change the latest storage is
 * often in the *other* slot. Reading both from the general block's slot served a
 * PC from a save or more ago, and a mon just moved to the Grave box never showed.
 */
function newestBlock(buf: Buffer, offsetInSlot: number, size: number): { offset: number; counter: number } | null {
  let best: { offset: number; counter: number } | null = null
  for (const slot of [0, SLOT_SIZE]) {
    const offset = slot + offsetInSlot
    const counter = blockCounter(buf, offset, size)
    if (counter !== null && (!best || counter > best.counter)) best = { offset, counter }
  }
  return best
}

/**
 * Withdrawing a Pokémon doesn't clear the box slot it came from: the old record
 * stays in the flash, frozen at the level it had when it went in. So the same
 * PID can sit in the party *and* in a box, which double-counts the mon
 * everywhere it's listed. The live copy wins — the party first, then, between
 * two box copies, the Grave box (being dead is the claim worth keeping) and
 * failing that the higher level, since the stale record is always the older one.
 */
function dropStaleCopies(party: Mon[], boxes: Box[]): Box[] {
  const inParty = new Set(party.map((m) => m.pid))
  const live = new Map<number, { box: Box; mon: Mon }>()

  for (const box of boxes) {
    for (const mon of box.mons) {
      if (inParty.has(mon.pid)) continue
      const held = live.get(mon.pid)
      const wins = !held || (isGraveBox(box) !== isGraveBox(held.box) ? isGraveBox(box) : mon.level > held.mon.level)
      if (wins) live.set(mon.pid, { box, mon })
    }
  }

  return boxes.map((box) => ({ ...box, mons: box.mons.filter((mon) => live.get(mon.pid)?.mon === mon) }))
}

function decodeMon(record: Buffer): Mon | null {
  const pid = record.readUInt32LE(0)
  if (pid === 0) return null
  const checksum = record.readUInt16LE(6)

  // Body: 4 x 32-byte blocks, encrypted with the checksum then shuffled by PID.
  const body = crypt(record.subarray(8, 8 + 128), checksum)
  const order = SHUFFLE_ORDERS[((pid >>> 0xd) & 0x1f) % 24]
  const m = Buffer.alloc(128)
  order.forEach((block, position) => {
    body.copy(m, block * 32, position * 32, (position + 1) * 32)
  })

  const species = m.readUInt16LE(0x00)
  const info = SPECIES[String(species)]
  if (!info) return null

  const ivBits = m.readUInt32LE(0x30)
  const ivs = {} as Record<StatKey, number>
  const evs = {} as Record<StatKey, number>
  STAT_ORDER.forEach((stat, i) => {
    ivs[stat] = (ivBits >>> (5 * i)) & 31
    evs[stat] = m[0x10 + i]
  })

  const moves: Mon['moves'] = []
  for (let i = 0; i < 4; i++) {
    const id = m.readUInt16LE(0x20 + i * 2)
    if (id === 0) continue
    const move = MOVES[String(id)]
    moves.push({
      name: move?.name ?? `Move ${id}`,
      type: move?.type ?? 'Normal',
      category: move?.category ?? 'status',
      power: move?.power ?? null,
      pp: m[0x28 + i],
    })
  }

  // Battle stats (party records only) are encrypted separately, seeded by the
  // PID. Box records stop at 136 bytes, so fall back to the exp curve.
  const exp = m.readUInt32LE(0x08)
  let level = levelFromExp(species, exp)
  let hp = 0
  let maxHp = 0
  if (record.length >= OFF_BATTLE_STATS + BATTLE_STATS_SIZE) {
    const stats = crypt(record.subarray(OFF_BATTLE_STATS, OFF_BATTLE_STATS + BATTLE_STATS_SIZE), pid)
    level = stats[4]
    hp = stats.readUInt16LE(6)
    maxHp = stats.readUInt16LE(8)
  }

  const heldItemId = m.readUInt16LE(0x02)
  const otId = m.readUInt16LE(0x04)
  const otSecret = m.readUInt16LE(0x06)
  // Pt/HGSS keep their extended met location in block B; the block-D field is a
  // DP-compatibility leftover and reads 0xFFFF here.
  const metLocationId = m.readUInt16LE(0x3e)

  return {
    pid,
    species,
    name: info.name,
    types: info.types,
    nickname: decodeString(m, 0x40, 11) || info.name,
    level,
    hp,
    maxHp,
    nature: NATURES[pid % 25],
    ability: ABILITIES[String(m[0x0d])] ?? `Ability ${m[0x0d]}`,
    heldItem: heldItemId ? (ITEMS[String(heldItemId)] ?? `Item ${heldItemId}`) : null,
    metLocation: LOCATIONS[String(metLocationId)] ?? 'Unknown',
    metLevel: m[0x7a] & 0x7f,
    shiny: ((otId ^ otSecret ^ (pid & 0xffff) ^ (pid >>> 16)) & 0xffff) < 8,
    moves,
    ivs,
    evs,
  }
}

export class InvalidSaveError extends Error {}

export function parseSave(buf: Buffer): ParsedSave {
  if (buf.length < SLOT_SIZE + GENERAL_SIZE + STORAGE_SIZE) {
    throw new InvalidSaveError('Not a Platinum save file (expected 512KB)')
  }

  const generalBlock = newestBlock(buf, 0, GENERAL_SIZE)
  const storageBlock = newestBlock(buf, GENERAL_SIZE, STORAGE_SIZE)
  if (!generalBlock || !storageBlock) {
    throw new InvalidSaveError('No valid save slot found — is this a Platinum .sav?')
  }
  const general = generalBlock.offset
  const storage = storageBlock.offset

  const badgeBits = buf[general + OFF_BADGES]
  let badges = 0
  for (let i = 0; i < 8; i++) if (badgeBits & (1 << i)) badges++

  const hours = buf.readUInt16LE(general + OFF_PLAYTIME)
  const minutes = buf[general + OFF_PLAYTIME + 2]
  const seconds = buf[general + OFF_PLAYTIME + 3]

  const partyCount = Math.min(buf.readUInt32LE(general + OFF_PARTY_COUNT), 6)
  const party: Mon[] = []
  for (let i = 0; i < partyCount; i++) {
    const at = general + OFF_PARTY + i * PARTY_MON_SIZE
    const mon = decodeMon(buf.subarray(at, at + PARTY_MON_SIZE))
    if (mon) party.push(mon)
  }

  const boxes: Box[] = []
  for (let b = 0; b < BOX_COUNT; b++) {
    const mons: Mon[] = []
    for (let s = 0; s < BOX_SLOTS; s++) {
      const at = storage + OFF_BOX_DATA + (b * BOX_SLOTS + s) * BOX_MON_SIZE
      const mon = decodeMon(buf.subarray(at, at + BOX_MON_SIZE))
      if (mon) mons.push(mon)
    }
    boxes.push({
      index: b,
      name: decodeString(buf, storage + OFF_BOX_NAMES + b * BOX_NAME_SIZE, 20) || `Box ${b + 1}`,
      mons,
    })
  }

  return {
    trainerName: decodeString(buf, general + OFF_TRAINER_NAME, 8),
    trainerId: buf.readUInt16LE(general + OFF_TRAINER_ID),
    secretId: buf.readUInt16LE(general + OFF_SECRET_ID),
    gender: buf[general + OFF_GENDER] === 0 ? 'male' : 'female',
    money: buf.readUInt32LE(general + OFF_MONEY),
    badges,
    levelCap: LEVEL_CAPS[Math.min(badges, 8)],
    playtime: { hours, minutes, seconds, total: hours * 3600 + minutes * 60 + seconds },
    saveCounter: generalBlock.counter,
    party,
    boxes: dropStaleCopies(party, boxes),
  }
}

/**
 * Dex number + name for all 493 species, for the client's species pickers.
 * Served from the same table the parser resolves against, so there's one source
 * of truth rather than a duplicated list in the client bundle.
 */
export function speciesList(): { id: number; name: string; types: string[] }[] {
  return Object.entries(SPECIES)
    .map(([id, info]) => ({ id: Number(id), name: info.name, types: info.types }))
    .sort((a, b) => a.id - b.id)
}

/** The box a dead Pokémon gets dumped in. Matched case-insensitively. */
export const GRAVE_BOX_NAME = 'grave'

export const isGraveBox = (box: Box) => box.name.trim().toLowerCase() === GRAVE_BOX_NAME

export function graveMons(save: ParsedSave): Mon[] {
  return save.boxes.filter(isGraveBox).flatMap((b) => b.mons)
}
