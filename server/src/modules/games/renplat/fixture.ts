// Builds real Platinum save buffers for tests: same footers, same checksum-seeded
// encryption, same PID block shuffle the cartridge writes. Encoding here and
// decoding in save.ts means the tests exercise the actual crypto path instead of
// trusting a committed binary blob.

const SLOT_SIZE = 0x40000
const GENERAL_SIZE = 0xcf2c
const STORAGE_SIZE = 0x121e4
const BOX_MON_SIZE = 136
const PARTY_MON_SIZE = 236

export const ERASED_COUNTER = 0xffffffff

function encodeChar(ch: string): number {
  const c = ch.charCodeAt(0)
  if (c >= 0x30 && c <= 0x39) return 0x121 + (c - 0x30)
  if (c >= 0x41 && c <= 0x5a) return 0x12b + (c - 0x41)
  if (c >= 0x61 && c <= 0x7a) return 0x145 + (c - 0x61)
  if (ch === ' ') return 0x1de
  return 0x1de
}

function writeString(buf: Buffer, offset: number, text: string, maxChars: number): void {
  for (let i = 0; i < maxChars; i++) {
    buf.writeUInt16LE(i < text.length ? encodeChar(text[i]) : 0xffff, offset + i * 2)
  }
}

function crypt(buf: Buffer, seed: number): Buffer {
  const out = Buffer.from(buf)
  let s = seed >>> 0
  for (let i = 0; i + 1 < out.length; i += 2) {
    s = (Math.imul(0x41c64e6d, s) + 0x6073) >>> 0
    out.writeUInt16LE(out.readUInt16LE(i) ^ (s >>> 16), i)
  }
  return out
}

const SHUFFLE_ORDERS: number[][] = (() => {
  const perms: number[][] = []
  const walk = (left: number[], acc: number[]) => {
    if (left.length === 0) return void perms.push(acc)
    for (let i = 0; i < left.length; i++) walk([...left.slice(0, i), ...left.slice(i + 1)], [...acc, left[i]])
  }
  walk([0, 1, 2, 3], [])
  return perms
})()

export interface MonSpec {
  pid: number
  species: number
  /** Party records carry an explicit level byte; box records don't (see `exp`). */
  level?: number
  /** Box records derive their level from this via the species' growth curve. */
  exp?: number
  nickname?: string
  heldItem?: number
  ability?: number
  moves?: number[]
  metLocation?: number
  hp?: number
  maxHp?: number
}

function encodeMon(spec: MonSpec, withBattleStats: boolean): Buffer {
  const plain = Buffer.alloc(128)
  plain.writeUInt16LE(spec.species, 0x00)
  plain.writeUInt16LE(spec.heldItem ?? 0, 0x02)
  plain.writeUInt16LE(1234, 0x04) // OT id
  plain.writeUInt16LE(5678, 0x06) // OT secret id
  plain.writeUInt32LE(spec.exp ?? 0, 0x08)
  plain[0x0d] = spec.ability ?? 1
  ;(spec.moves ?? []).slice(0, 4).forEach((id, i) => {
    plain.writeUInt16LE(id, 0x20 + i * 2)
    plain[0x28 + i] = 20
  })
  plain.writeUInt32LE(0, 0x30) // IVs
  plain.writeUInt16LE(spec.metLocation ?? 0, 0x3e)
  writeString(plain, 0x40, spec.nickname ?? '', 11)

  let checksum = 0
  for (let i = 0; i < 128; i += 2) checksum = (checksum + plain.readUInt16LE(i)) & 0xffff

  // Inverse of the parser's unshuffle: block `order[position]` goes at `position`.
  const order = SHUFFLE_ORDERS[((spec.pid >>> 0xd) & 0x1f) % 24]
  const shuffled = Buffer.alloc(128)
  order.forEach((block, position) => {
    plain.copy(shuffled, position * 32, block * 32, (block + 1) * 32)
  })

  const record = Buffer.alloc(withBattleStats ? PARTY_MON_SIZE : BOX_MON_SIZE)
  record.writeUInt32LE(spec.pid, 0)
  record.writeUInt16LE(checksum, 6)
  crypt(shuffled, checksum).copy(record, 8)

  if (withBattleStats) {
    const stats = Buffer.alloc(100)
    stats[4] = spec.level ?? 1
    stats.writeUInt16LE(spec.hp ?? 10, 6)
    stats.writeUInt16LE(spec.maxHp ?? 10, 8)
    crypt(stats, spec.pid).copy(record, 0x88)
  }
  return record
}

export interface SaveSpec {
  trainerName?: string
  trainerId?: number
  secretId?: number
  badges?: number
  money?: number
  playtime?: { hours: number; minutes: number; seconds: number }
  party?: MonSpec[]
  /** Box index (0-17) -> name, plus the mons inside it. */
  boxes?: { index: number; name: string; mons: MonSpec[] }[]
  counter?: number
}

function writeSlot(buf: Buffer, slot: number, spec: SaveSpec, counter: number): void {
  const general = slot
  const storage = slot + GENERAL_SIZE

  writeString(buf, general + 0x68, spec.trainerName ?? 'SAM', 8)
  buf.writeUInt16LE(spec.trainerId ?? 1111, general + 0x78)
  buf.writeUInt16LE(spec.secretId ?? 2222, general + 0x7a)
  buf.writeUInt32LE(spec.money ?? 3000, general + 0x7c)
  buf[general + 0x80] = 0
  buf[general + 0x82] = (1 << (spec.badges ?? 0)) - 1
  buf.writeUInt16LE(spec.playtime?.hours ?? 0, general + 0x8a)
  buf[general + 0x8c] = spec.playtime?.minutes ?? 0
  buf[general + 0x8d] = spec.playtime?.seconds ?? 0

  const party = spec.party ?? []
  buf.writeUInt32LE(party.length, general + 0x9c)
  party.forEach((mon, i) => {
    encodeMon(mon, true).copy(buf, general + 0xa0 + i * PARTY_MON_SIZE)
  })

  // Footer: block size then save counter, both read back by the parser.
  buf.writeUInt32LE(GENERAL_SIZE, general + GENERAL_SIZE - 0xc)
  buf.writeUInt32LE(counter, general + GENERAL_SIZE - 0x14)

  const namesAt = storage + 0x04 + 18 * 30 * BOX_MON_SIZE
  for (let b = 0; b < 18; b++) writeString(buf, namesAt + b * 40, `BOX ${b + 1}`, 20)
  for (const box of spec.boxes ?? []) {
    writeString(buf, namesAt + box.index * 40, box.name, 20)
    box.mons.forEach((mon, s) => {
      encodeMon(mon, false).copy(buf, storage + 0x04 + (box.index * 30 + s) * BOX_MON_SIZE)
    })
  }

  buf.writeUInt32LE(STORAGE_SIZE, storage + STORAGE_SIZE - 0xc)
  buf.writeUInt32LE(counter, storage + STORAGE_SIZE - 0x14)
}

/** A 512KB save. `slot1` fills the second slot, for save-counter/validity tests. */
export function buildSave(spec: SaveSpec, slot1?: SaveSpec): Buffer {
  const buf = Buffer.alloc(SLOT_SIZE * 2)
  writeSlot(buf, 0, spec, spec.counter ?? 1)
  if (slot1) writeSlot(buf, SLOT_SIZE, slot1, slot1.counter ?? 1)
  return buf
}

export const asBase64 = (buf: Buffer) => buf.toString('base64')
