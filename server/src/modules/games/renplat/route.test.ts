import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import db from '../../../db/client'
import { setupTestServer } from '../../../shared/test-helpers'
import { buildSave, asBase64, ERASED_COUNTER, type SaveSpec } from './fixture'
import { parseSave, graveMons, LEVEL_CAPS } from './save'

const baseUrl = setupTestServer()
const api = (path: string) => `${baseUrl()}/api/games/renplat${path}`

const json = (path: string, method: string, body: unknown) =>
  fetch(api(path), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

const upload = (spec: SaveSpec, slot1?: SaveSpec) =>
  json('/save', 'POST', { data: asBase64(buildSave(spec, slot1)) })

// Monferno with Mach Punch, held Chesto Berry, met on Route 201 — the same shape
// as the real run this was built against.
const monferno = { pid: 0x8ca019f6, species: 391, level: 26, moves: [183, 172], heldItem: 150, metLocation: 16 }

describe('renplat save parsing', () => {
  it('reads trainer, badges, level cap, playtime and party out of a save', () => {
    const save = parseSave(
      buildSave({
        trainerName: 'SAM',
        trainerId: 55158,
        secretId: 38140,
        badges: 1,
        money: 12194,
        playtime: { hours: 5, minutes: 30, seconds: 50 },
        party: [monferno],
      }),
    )
    assert.equal(save.trainerName, 'SAM')
    assert.equal(save.trainerId, 55158)
    assert.equal(save.secretId, 38140)
    assert.equal(save.badges, 1)
    assert.equal(save.levelCap, 26)
    assert.equal(save.money, 12194)
    assert.deepEqual(save.playtime, { hours: 5, minutes: 30, seconds: 50, total: 19850 })
    assert.equal(save.party.length, 1)
  })

  it('resolves species, types, nature, ability, held item, moves and met location', () => {
    const save = parseSave(buildSave({ party: [{ ...monferno, ability: 89 }] }))
    const mon = save.party[0]
    assert.equal(mon.name, 'Monferno')
    assert.deepEqual(mon.types, ['Fire', 'Fighting'])
    assert.equal(mon.ability, 'Iron Fist')
    assert.equal(mon.heldItem, 'Chesto Berry')
    assert.equal(mon.metLocation, 'Route 201')
    assert.equal(mon.level, 26)
    assert.deepEqual(mon.moves.map((m) => m.name), ['Mach Punch', 'Flame Wheel'])
    assert.equal(mon.moves[0].type, 'Fighting')
  })

  it('keeps a nickname when one is set, and falls back to the species name', () => {
    const save = parseSave(
      buildSave({ party: [{ ...monferno, nickname: 'MATHEW' }, { ...monferno, pid: 0x25510019 }] }),
    )
    assert.equal(save.party[0].nickname, 'MATHEW')
    assert.equal(save.party[1].nickname, 'Monferno')
  })

  // Withdrawing a mon leaves its old box record in the flash, frozen at the
  // level it went in with. Five of this run's six party members had one.
  it('ignores the stale box record a withdrawn Pokemon leaves behind', () => {
    const save = parseSave(
      buildSave({
        party: [monferno],
        boxes: [
          {
            index: 0,
            name: 'BOX 1',
            mons: [
              { pid: monferno.pid, species: 391, exp: 2700 }, // the leftover
              { pid: 0x501, species: 133, exp: 5000 },
            ],
          },
        ],
      }),
    )
    assert.deepEqual(save.boxes[0].mons.map((m) => m.pid), [0x501], 'the party copy is the live one')
    assert.equal(save.party[0].level, 26, 'and the party keeps its real level, not the deposited one')
  })

  it('keeps the Grave copy when a dead mon also has a stale record in another box', () => {
    const save = parseSave(
      buildSave({
        party: [monferno],
        boxes: [
          { index: 0, name: 'BOX 1', mons: [{ pid: 0x777, species: 74, exp: 2700 }] },
          { index: 8, name: 'Grave', mons: [{ pid: 0x777, species: 74, exp: 2700 }] },
        ],
      }),
    )
    assert.deepEqual(save.boxes[0].mons, [], 'the living-box copy is the stale one')
    assert.deepEqual(save.boxes[8].mons.map((m) => m.pid), [0x777])
    assert.deepEqual(graveMons(save).map((m) => m.pid), [0x777], 'so the death still registers')
  })

  it('picks the slot with the higher save counter', () => {
    const save = parseSave(
      buildSave(
        { badges: 1, counter: 6, party: [monferno] },
        { badges: 3, counter: 7, party: [monferno, { ...monferno, pid: 0x583030d1 }] },
      ),
    )
    assert.equal(save.badges, 3, 'should read the newer slot')
    assert.equal(save.party.length, 2)
  })

  // Two of the real snapshots from this run have a slot like this; trusting its
  // counter picks garbage data (8 badges, party count 0xFFFFFFFF).
  it('ignores a slot whose counter is erased flash (0xFFFFFFFF)', () => {
    const save = parseSave(
      buildSave({ badges: 8, counter: ERASED_COUNTER, party: [] }, { badges: 1, counter: 1, party: [monferno] }),
    )
    assert.equal(save.badges, 1)
    assert.equal(save.party.length, 1)
  })

  // The bug that hid a fresh death: saving without touching the PC rewrites only
  // the general block, so the newest storage block sat in the other slot and the
  // parser, reading both from one slot, served a PC with no mon in the Grave box.
  it('picks the general and storage blocks independently', () => {
    const grave = { index: 17, name: 'GRAVE', mons: [{ pid: 0x4242, species: 74, exp: 2700 }] }
    const save = parseSave(
      buildSave(
        { badges: 2, counter: 29, storageCounter: 30, party: [monferno], boxes: [grave] },
        { badges: 3, counter: 30, storageCounter: 29, party: [monferno], boxes: [] },
      ),
    )
    assert.equal(save.badges, 3, 'general block from the slot with the newer general counter')
    assert.deepEqual(graveMons(save).map((m) => m.pid), [0x4242], 'storage block from the other slot')
  })

  it('ignores a block whose CRC does not match', () => {
    const buf = buildSave({ badges: 1, counter: 1, party: [monferno] }, { badges: 3, counter: 2, party: [monferno] })
    buf[0x40000 + 0x82] ^= 0xff // corrupt slot 1's badge byte without fixing its CRC
    assert.equal(parseSave(buf).badges, 1, 'falls back to the intact slot')
  })

  it('rejects a buffer that is not a Platinum save', () => {
    assert.throws(() => parseSave(Buffer.alloc(524288)), /No valid save slot/)
    assert.throws(() => parseSave(Buffer.alloc(64)), /512KB/)
  })

  it('derives a boxed mon\'s level from its experience', () => {
    // Geodude (74) is a "medium slow" curve; 2700 exp lands on level 16.
    const save = parseSave(
      buildSave({ boxes: [{ index: 8, name: 'Grave', mons: [{ pid: 0x111, species: 74, exp: 2700 }] }] }),
    )
    const grave = save.boxes[8]
    assert.equal(grave.name, 'Grave')
    assert.equal(grave.mons[0].name, 'Geodude')
    assert.equal(grave.mons[0].level, 16)
  })

  it('reads box names, defaulting to BOX n', () => {
    const save = parseSave(buildSave({ boxes: [{ index: 17, name: 'Grave', mons: [] }] }))
    assert.equal(save.boxes[0].name, 'BOX 1')
    assert.equal(save.boxes[17].name, 'Grave')
  })

  it('maps every badge count to a level cap', () => {
    assert.deepEqual(LEVEL_CAPS, [16, 26, 33, 39, 44, 53, 56, 62, 78])
    for (let badges = 0; badges <= 8; badges++) {
      assert.equal(parseSave(buildSave({ badges })).levelCap, LEVEL_CAPS[badges])
    }
  })
})

describe('POST /api/games/renplat/save', () => {
  it('requires base64 data', async () => {
    const res = await json('/save', 'POST', {})
    assert.equal(res.status, 400)
  })

  it('rejects a file that is not a Platinum save', async () => {
    const res = await json('/save', 'POST', { data: Buffer.alloc(524288).toString('base64') })
    assert.equal(res.status, 400)
    assert.match(((await res.json()) as { error: string }).error, /valid save slot/)
  })

  it('opens run #1 and reports the party members over the level cap', async () => {
    const res = await upload({
      trainerId: 4001,
      secretId: 1,
      badges: 1,
      party: [monferno, { ...monferno, pid: 0x29cf8d0a, level: 31, nickname: 'TOOBIG' }],
    })
    assert.equal(res.status, 201)
    const body = (await res.json()) as Record<string, any>
    assert.equal(body.newRun, true)
    assert.equal(body.run.number, 1)
    assert.equal(body.levelCap, 26)
    assert.deepEqual(body.overCap, ['TOOBIG'])
  })

  it('attaches a re-upload of the same trainer to the same run', async () => {
    const first = await upload({ trainerId: 4002, secretId: 2, badges: 1, counter: 1, party: [monferno] })
    const firstRun = ((await first.json()) as { run: { id: number } }).run.id
    const second = await upload({ trainerId: 4002, secretId: 2, badges: 2, counter: 2, party: [monferno] })
    const body = (await second.json()) as Record<string, any>
    assert.equal(body.newRun, false)
    assert.equal(body.run.id, firstRun)
    assert.equal(body.badges, 2)
  })

  it('opens the next run when the trainer ID pair is new', async () => {
    const a = await upload({ trainerId: 4003, secretId: 3 })
    const b = await upload({ trainerId: 4004, secretId: 4 })
    const numberA = ((await a.json()) as { run: { number: number } }).run.number
    const numberB = ((await b.json()) as { run: { number: number } }).run.number
    assert.equal(numberB, numberA + 1)
  })

  it('queues mons in the Grave box as pending deaths', async () => {
    const res = await upload({
      trainerId: 4005,
      secretId: 5,
      party: [monferno],
      boxes: [{ index: 8, name: 'Grave', mons: [{ pid: 0x999, species: 74, exp: 2700 }] }],
    })
    const body = (await res.json()) as Record<string, any>
    assert.equal(body.pending.length, 1)
    assert.equal(body.pending[0].name, 'Geodude')
    assert.equal(body.pending[0].pid, 0x999)
  })
})

describe('GET /api/games/renplat/state', () => {
  it('serves the dashboard for the most recent upload', async () => {
    await upload({
      trainerId: 4010,
      secretId: 10,
      badges: 2,
      party: [monferno],
      boxes: [
        { index: 0, name: 'BOX 1', mons: [{ pid: 0x501, species: 133, exp: 5000, metLocation: 19 }] },
        { index: 8, name: 'Grave', mons: [{ pid: 0x502, species: 74, exp: 2700, metLocation: 50 }] },
      ],
    })
    const res = await fetch(api('/state?run=' + (await currentRunId(4010))))
    assert.equal(res.status, 200)
    const body = (await res.json()) as Record<string, any>
    assert.equal(body.save.badges, 2)
    assert.equal(body.save.levelCap, 33)
    assert.equal(body.party.length, 1)
    assert.equal(body.grave.length, 1)
    assert.equal(body.grave[0].death, null, 'unconfirmed grave mon has no death row yet')
    assert.equal(body.pending.length, 1)
    // The Grave box still counts as an encounter, flagged dead rather than dropped.
    // Monferno is the Chimchar line, so it groups under "Starter", not Route 201.
    const byLocation = body.encounters.byLocation as { location: string; mons: { dead: boolean }[] }[]
    assert.deepEqual(byLocation.map((e) => e.location).sort(), ['Mt. Coronet', 'Route 204', 'Starter'])
    const buried = byLocation.find((e) => e.location === 'Mt. Coronet')!
    assert.deepEqual(buried.mons.map((m) => m.dead), [true], 'the Geodude in the Grave box reads as dead')
    assert.deepEqual(
      byLocation.find((e) => e.location === 'Route 204')!.mons.map((m) => m.dead),
      [false],
    )
    assert.ok(body.fights.length > 0, 'fights are seeded')
    assert.deepEqual(body.levelCaps, LEVEL_CAPS)
  })

  // Uploading an old backup shouldn't roll the dashboard back to 0 badges.
  it('stays on the furthest-progress snapshot when an older save is uploaded after', async () => {
    const trainer = { trainerId: 4011, secretId: 11 }
    await upload({ ...trainer, badges: 3, counter: 5, playtime: { hours: 9, minutes: 0, seconds: 0 } })
    await upload({ ...trainer, badges: 1, counter: 2, playtime: { hours: 4, minutes: 0, seconds: 0 } })

    const runId = await currentRunId(4011)
    const body = (await (await fetch(api(`/state?run=${runId}`))).json()) as Record<string, any>
    assert.equal(body.save.badges, 3)
    assert.equal(body.save.playtime.hours, 9)
    assert.equal(body.history.length, 2, 'the older snapshot is still in history')
  })

  it('gives the starter its own box instead of sharing its met location', async () => {
    await upload({
      trainerId: 4080,
      secretId: 80,
      // Monferno (Chimchar line) and Kricketune both met on Route 201.
      party: [
        { ...monferno, metLocation: 16 },
        { pid: 0x402, species: 402, level: 26, metLocation: 16 },
      ],
    })
    const runId = await currentRunId(4080)
    const state = (await (await fetch(api(`/state?run=${runId}`))).json()) as Record<string, any>
    const groups = state.encounters.byLocation as { location: string; mons: { species: number }[] }[]

    assert.equal(groups[0].location, 'Starter', 'the starter box leads the list')
    assert.deepEqual(groups[0].mons.map((m) => m.species), [391])
    const route201 = groups.find((g) => g.location === 'Route 201')!
    assert.deepEqual(route201.mons.map((m) => m.species), [402], 'Route 201 keeps only the real encounter')
  })

  it('leaves a starter-line Pokemon obtained elsewhere at its own location', async () => {
    await upload({
      trainerId: 4082,
      secretId: 82,
      party: [
        { ...monferno, metLocation: 16 }, // the Route 201 starter
        { pid: 0x394, species: 394, level: 20, metLocation: 2 }, // a gift Prinplup, Sandgem Town
      ],
    })
    const runId = await currentRunId(4082)
    const state = (await (await fetch(api(`/state?run=${runId}`))).json()) as Record<string, any>
    const groups = state.encounters.byLocation as { location: string; mons: { species: number }[] }[]
    assert.deepEqual(groups.find((g) => g.location === 'Starter')!.mons.map((m) => m.species), [391])
    assert.deepEqual(groups.find((g) => g.location === 'Sandgem Town')!.mons.map((m) => m.species), [394])
  })

  it('sorts encounter locations naturally after the starter', async () => {
    await upload({
      trainerId: 4081,
      secretId: 81,
      party: [
        { pid: 0x501, species: 402, level: 10, metLocation: 19 }, // Route 204
        { pid: 0x502, species: 133, level: 10, metLocation: 16 }, // Route 201
        { pid: 0x503, species: 74, level: 10, metLocation: 6 }, // Jubilife City
      ],
    })
    const runId = await currentRunId(4081)
    const state = (await (await fetch(api(`/state?run=${runId}`))).json()) as Record<string, any>
    assert.deepEqual(
      (state.encounters.byLocation as { location: string }[]).map((g) => g.location),
      ['Jubilife City', 'Route 201', 'Route 204'],
    )
  })

  it('keeps a dead mon at its encounter location, living ones first', async () => {
    await upload({
      trainerId: 4083,
      secretId: 83,
      party: [monferno, { pid: 0x601, species: 396, level: 12, metLocation: 19 }], // Route 204
      boxes: [
        { index: 8, name: 'Grave', mons: [{ pid: 0x602, species: 399, exp: 2700, metLocation: 19 }] },
      ],
    })
    const runId = await currentRunId(4083)
    const state = (await (await fetch(api(`/state?run=${runId}`))).json()) as Record<string, any>
    const route204 = (state.encounters.byLocation as { location: string; mons: { species: number; dead: boolean }[] }[])
      .find((g) => g.location === 'Route 204')!

    assert.equal(route204.mons.length, 2, 'the dead one is still an encounter from Route 204')
    assert.deepEqual(route204.mons.map((m) => m.dead), [false, true], 'living leads the sprite stack')
    assert.deepEqual(route204.mons.map((m) => m.species), [396, 399])
  })

  it('counts a party mon once when a stale box copy is still in the save', async () => {
    await upload({
      trainerId: 4084,
      secretId: 84,
      party: [{ ...monferno, metLocation: 19 }], // Route 204
      boxes: [
        {
          index: 0,
          name: 'BOX 1',
          // The record the game left behind when Monferno was withdrawn.
          mons: [{ pid: monferno.pid, species: 391, exp: 2700, metLocation: 19 }],
        },
      ],
    })
    const runId = await currentRunId(4084)
    const state = (await (await fetch(api(`/state?run=${runId}`))).json()) as Record<string, any>
    const groups = state.encounters.byLocation as { location: string; mons: { pid: number }[] }[]

    assert.equal(groups.reduce((n, g) => n + g.mons.length, 0), 1, 'one Monferno, not two')
    assert.deepEqual(groups.map((g) => g.location), ['Route 204'])
    assert.deepEqual(state.boxes, [], 'and the empty box drops out of the box list')
  })

  // The raw .sav is the source of truth on read, so a parser fix reaches saves
  // that were uploaded before it — here faked by corrupting the stored JSON.
  it('re-parses the stored save rather than trusting the JSON from upload time', async () => {
    await upload({ trainerId: 4085, secretId: 85, badges: 4, party: [monferno] })
    const runId = await currentRunId(4085)
    db.prepare('UPDATE renplat_snapshot SET parsed = ? WHERE run_id = ?').run(
      JSON.stringify({ trainerName: 'STALE', party: [], boxes: [], badges: 0, levelCap: 16 }),
      runId,
    )

    const state = (await (await fetch(api(`/state?run=${runId}`))).json()) as Record<string, any>
    assert.equal(state.save.trainerName, 'SAM', 'read from the blob, not the stale row')
    assert.equal(state.party.length, 1)

    const run = ((await (await fetch(api('/runs'))).json()) as Record<string, any>[]).find((r) => r.id === runId)!
    assert.deepEqual(run.final_team.map((m: { species: number }) => m.species), [391])
  })

  it('returns an empty shell before any save has been uploaded', async () => {
    const res = await fetch(api('/state?run=99999'))
    assert.equal(res.status, 200)
    const body = (await res.json()) as Record<string, any>
    assert.equal(body.run, null)
    assert.deepEqual(body.party, [])
    assert.ok(body.fights.length > 0)
  })
})

async function currentRunId(trainerId: number): Promise<number> {
  const runs = (await (await fetch(api('/runs'))).json()) as { id: number; trainer_id: number }[]
  return runs.find((r) => r.trainer_id === trainerId)!.id
}

describe('run names', () => {
  it('renames a run and falls back to the number when blanked', async () => {
    await upload({ trainerId: 4090, secretId: 90, party: [monferno] })
    const runId = await currentRunId(4090)

    const named = await json(`/runs/${runId}`, 'PATCH', { name: '  The Infernape one  ' })
    assert.equal(named.status, 200)
    assert.equal(((await named.json()) as Record<string, any>).name, 'The Infernape one', 'trimmed')

    const state = (await (await fetch(api(`/state?run=${runId}`))).json()) as Record<string, any>
    assert.equal(state.run.name, 'The Infernape one')
    assert.equal(
      (((await (await fetch(api('/runs'))).json()) as Record<string, any>[]).find((r) => r.id === runId))!.name,
      'The Infernape one',
      'the runs list carries the name too',
    )

    // Blank means "no name", not an empty title.
    const cleared = await json(`/runs/${runId}`, 'PATCH', { name: '   ' })
    assert.equal(((await cleared.json()) as Record<string, any>).name, null)
  })

  it('rejects a non-string name and an unknown run', async () => {
    await upload({ trainerId: 4091, secretId: 91, party: [monferno] })
    const runId = await currentRunId(4091)
    assert.equal((await json(`/runs/${runId}`, 'PATCH', { name: 7 })).status, 400)
    assert.equal((await json('/runs/999999', 'PATCH', { name: 'nope' })).status, 404)
  })
})

describe('memorable moments', () => {
  const setup = async (trainerId: number, secretId: number) => {
    await upload({
      trainerId,
      secretId,
      party: [monferno, { pid: 0x700, species: 395, level: 30, metLocation: 19 }],
    })
    const runId = await currentRunId(trainerId)
    const fights = (await (await fetch(api('/fights'))).json()) as { id: number; key: string }[]
    return { runId, fight: (key: string) => fights.find((f) => f.key === key)! }
  }

  it('writes a moment against a fight and snapshots the team on request', async () => {
    const { runId, fight } = await setup(4100, 100)
    const res = await json('/moments', 'POST', {
      run_id: runId,
      fight_id: fight('maylene').id,
      note: 'Won on 3 HP after a Drain Punch crit',
      include_team: true,
    })
    assert.equal(res.status, 201)
    const moment = (await res.json()) as Record<string, any>
    assert.equal(moment.fight_id, fight('maylene').id)
    assert.match(moment.note, /Drain Punch/)
    assert.deepEqual(moment.team.map((m: { species: number }) => m.species), [391, 395])
    assert.deepEqual(moment.team[0], { species: 391, nickname: 'Monferno', level: 26 })

    // Served with the run, and standalone.
    const state = (await (await fetch(api(`/state?run=${runId}`))).json()) as Record<string, any>
    assert.equal(state.moments.length, 1)
    assert.equal(state.moments[0].team.length, 2, 'the team comes back parsed, not as JSON text')
    const listed = (await (await fetch(api(`/moments?run=${runId}`))).json()) as Record<string, any>[]
    assert.equal(listed.length, 1)
  })

  it('leaves the team off when it is not asked for', async () => {
    const { runId, fight } = await setup(4101, 101)
    const res = await json('/moments', 'POST', {
      run_id: runId,
      fight_id: fight('roark').id,
      note: 'Cranidos nearly ended it',
    })
    assert.equal(((await res.json()) as Record<string, any>).team, null)
  })

  it('keeps moments per run', async () => {
    const a = await setup(4102, 102)
    const b = await setup(4103, 103)
    await json('/moments', 'POST', { run_id: a.runId, note: 'Run A story' })
    await json('/moments', 'POST', { run_id: b.runId, note: 'Run B story' })

    const forA = (await (await fetch(api(`/moments?run=${a.runId}`))).json()) as Record<string, any>[]
    assert.deepEqual(forA.map((m) => m.note), ['Run A story'])
  })

  it('edits the note and fight, and can drop or retake the team', async () => {
    const { runId, fight } = await setup(4104, 104)
    const created = (await (
      await json('/moments', 'POST', { run_id: runId, fight_id: fight('roark').id, note: 'first pass', include_team: true })
    ).json()) as Record<string, any>

    const edited = (await (
      await json(`/moments/${created.id}`, 'PATCH', { fight_id: fight('wake').id, note: 'Floatzel, actually' })
    ).json()) as Record<string, any>
    assert.equal(edited.fight_id, fight('wake').id)
    assert.equal(edited.note, 'Floatzel, actually')
    assert.equal(edited.team.length, 2, 'editing a note leaves the captured team alone')

    const dropped = (await (
      await json(`/moments/${created.id}`, 'PATCH', { include_team: false })
    ).json()) as Record<string, any>
    assert.equal(dropped.team, null)

    const retaken = (await (
      await json(`/moments/${created.id}`, 'PATCH', { include_team: true })
    ).json()) as Record<string, any>
    assert.equal(retaken.team.length, 2)
  })

  it('takes a moment with no fight attached, but not an empty one', async () => {
    const { runId } = await setup(4105, 105)
    assert.equal((await json('/moments', 'POST', { run_id: runId, note: 'Just a nice bit of luck' })).status, 201)
    assert.equal((await json('/moments', 'POST', { run_id: runId, note: '   ' })).status, 400)
    assert.equal((await json('/moments', 'POST', { run_id: runId })).status, 400)
  })

  it('rejects an unknown run or fight', async () => {
    const { runId } = await setup(4106, 106)
    assert.equal((await json('/moments', 'POST', { run_id: 999999, note: 'nope' })).status, 400)
    assert.equal((await json('/moments', 'POST', { run_id: runId, fight_id: 999999, note: 'nope' })).status, 400)
    assert.equal((await fetch(api('/moments?run=999999'))).status, 400)
  })

  it('deletes a moment, and 404s on anything that touches it after', async () => {
    const { runId } = await setup(4107, 107)
    const moment = (await (
      await json('/moments', 'POST', { run_id: runId, note: 'to be forgotten' })
    ).json()) as Record<string, any>

    assert.equal((await fetch(api(`/moments/${moment.id}`), { method: 'DELETE' })).status, 204)
    assert.equal((await fetch(api(`/moments/${moment.id}`), { method: 'DELETE' })).status, 404)
    assert.equal((await json(`/moments/${moment.id}`, 'PATCH', { note: 'gone' })).status, 404)
  })
})

describe('deaths', () => {
  it('clears a pending death once confirmed, and tallies it against the fight', async () => {
    await upload({
      trainerId: 4020,
      secretId: 20,
      party: [monferno],
      boxes: [{ index: 8, name: 'Grave', mons: [{ pid: 0x777, species: 74, exp: 2700 }] }],
    })
    const runId = await currentRunId(4020)
    const fights = (await (await fetch(api('/fights'))).json()) as { id: number; key: string }[]
    const roark = fights.find((f) => f.key === 'roark')!

    const res = await json('/deaths', 'POST', {
      run_id: runId,
      pid: 0x777,
      species: 74,
      nickname: 'Geodude',
      level: 16,
      fight_id: roark.id,
      note: 'Cranidos Headbutt crit',
    })
    assert.equal(res.status, 201)

    const state = (await (await fetch(api(`/state?run=${runId}`))).json()) as Record<string, any>
    assert.equal(state.pending.length, 0, 'no longer pending')
    assert.equal(state.grave[0].death.note, 'Cranidos Headbutt crit')
    assert.equal(state.run.deaths, 1)
    assert.equal(state.fights.find((f: { key: string }) => f.key === 'roark').kills, 1)
  })

  it('validates run_id, pid and species', async () => {
    assert.equal((await json('/deaths', 'POST', { run_id: 99999, pid: 1, species: 1 })).status, 400)
    const runId = await currentRunId(4020)
    assert.equal((await json('/deaths', 'POST', { run_id: runId, pid: 0, species: 1 })).status, 400)
    assert.equal((await json('/deaths', 'POST', { run_id: runId, pid: 5, species: 999 })).status, 400)
  })

  it('updates and deletes a death', async () => {
    await upload({
      trainerId: 4021,
      secretId: 21,
      boxes: [{ index: 8, name: 'Grave', mons: [{ pid: 0x778, species: 74, exp: 2700 }] }],
    })
    const runId = await currentRunId(4021)
    await json('/deaths', 'POST', { run_id: runId, pid: 0x778, species: 74 })
    const state = (await (await fetch(api(`/state?run=${runId}`))).json()) as Record<string, any>
    const deathId = state.deaths[0].id

    const patched = await json(`/deaths/${deathId}`, 'PATCH', { note: 'revised' })
    assert.equal(patched.status, 200)
    assert.equal((await json('/deaths/999999', 'PATCH', { note: 'x' })).status, 404)

    const removed = await fetch(api(`/deaths/${deathId}`), { method: 'DELETE' })
    assert.equal(removed.status, 204)
    assert.equal((await fetch(api(`/deaths/${deathId}`), { method: 'DELETE' })).status, 404)

    const after = (await (await fetch(api(`/state?run=${runId}`))).json()) as Record<string, any>
    assert.equal(after.pending.length, 1, 'deleting the death makes it pending again')
  })

  it('keeps a recorded death in the graveyard and encounters after it leaves the save', async () => {
    const trainer = { trainerId: 4022, secretId: 22 }
    const geodude = { pid: 0x779, species: 74, exp: 2700, metLocation: 50 }
    await upload({ ...trainer, counter: 1, boxes: [{ index: 8, name: 'Grave', mons: [geodude] }] })
    const runId = await currentRunId(4022)
    await json('/deaths', 'POST', {
      run_id: runId, pid: 0x779, species: 74, nickname: 'ROCKY', level: 16, met_location: 'Mt. Coronet',
    })
    // Released from the Grave box afterwards: the save no longer holds it at all.
    await upload({ ...trainer, counter: 2, playtime: { hours: 1, minutes: 0, seconds: 0 }, party: [monferno] })

    const state = (await (await fetch(api(`/state?run=${runId}`))).json()) as Record<string, any>
    assert.deepEqual(state.grave.map((m: { nickname: string }) => m.nickname), ['ROCKY'])
    assert.equal(state.grave[0].name, 'Geodude')
    assert.equal(state.pending.length, 0)
    const coronet = state.encounters.byLocation.find((g: { location: string }) => g.location === 'Mt. Coronet')
    assert.deepEqual(coronet.mons.map((m: { dead: boolean }) => m.dead), [true], 'still counts as a dead encounter')
  })

  it('lists recorded deaths before unconfirmed Grave-box mons', async () => {
    await upload({
      trainerId: 4023,
      secretId: 23,
      boxes: [{ index: 8, name: 'grave', mons: [{ pid: 0x780, species: 74, exp: 2700 }, { pid: 0x781, species: 399, exp: 2700 }] }],
    })
    const runId = await currentRunId(4023)
    await json('/deaths', 'POST', { run_id: runId, pid: 0x781, species: 399 })
    const state = (await (await fetch(api(`/state?run=${runId}`))).json()) as Record<string, any>
    assert.deepEqual(state.grave.map((m: { pid: number }) => m.pid), [0x781, 0x780])
    assert.deepEqual(state.pending.map((m: { pid: number }) => m.pid), [0x780], 'box name matched case-insensitively')
  })
})

describe('fights', () => {
  it('matches the spreadsheet: gym order, level caps and the real fight list', async () => {
    const fights = (await (await fetch(api('/fights'))).json()) as Record<string, any>[]
    const keys = fights.map((f) => f.key)
    const by = (key: string) => fights.find((f) => f.key === key)!

    // This hack's gym order is Roark, Gardenia, FANTINA, Maylene, Wake, ...
    const gyms = fights.filter((f) => f.badge_award !== null)
    assert.deepEqual(
      gyms.map((f) => f.key),
      ['roark', 'gardenia', 'fantina', 'maylene', 'wake', 'byron', 'candice', 'volkner'],
    )
    assert.deepEqual(gyms.map((f) => f.badge_award), [1, 2, 3, 4, 5, 6, 7, 8])
    // Each gym closes the split it belongs to, so its badge_index is the cap
    // that applied throughout.
    for (const g of gyms) assert.equal(LEVEL_CAPS[g.badge_index], LEVEL_CAPS[g.badge_award - 1])

    // Rival stops, at their spreadsheet places.
    assert.equal(by('barry-hearthome-gate').badge_index, 3)
    assert.ok(keys.indexOf('barry-hearthome-gate') > keys.indexOf('fantina'), 'Hearthome Gate Barry follows Fantina')
    assert.ok(keys.indexOf('barry-pastoria') < keys.indexOf('wake'), 'Pastoria Barry precedes Wake')
    assert.ok(keys.indexOf('barry-canalave') < keys.indexOf('byron'), 'Canalave Barry precedes Byron')
    assert.ok(keys.indexOf('barry-league') < keys.indexOf('aaron'), 'League Barry precedes Aaron')
    assert.ok(keys.indexOf('dawn-207') < keys.indexOf('aaron-early'), 'Route 207 Dawn precedes the early Aaron')
    assert.ok(keys.indexOf('dawn-210') > keys.indexOf('wake'), 'Route 210 Dawn follows Wake')
    assert.ok(keys.indexOf('dawn-gratitude') < keys.indexOf('barry-league'), 'Stone of Gratitude precedes League Barry')

    // The early Aaron is in the Fantina split, before her gym.
    assert.equal(by('aaron-early').badge_index, 2)
    assert.ok(keys.indexOf('aaron-early') < keys.indexOf('fantina'))

    // Companions the hack makes you fight.
    for (const k of ['cheryl-eterna-forest', 'mira-wayward', 'riley-iron-island', 'marley-victory-road']) {
      assert.ok(keys.includes(k), `${k} is a real fight`)
    }
    // Reconstructed rows that the spreadsheet disproved are gone.
    for (const k of ['barry-203', 'dawn-jubilife', 'barry-floaroma', 'barry-eterna', 'dawn-eterna-forest',
                     'dawn-celestic', 'dawn-sunyshore', 'barry-victory-road', 'dawn-league',
                     'saturn-valor', 'mars-verity', 'cyrus-spear', 'barry-hearthome']) {
      assert.ok(!keys.includes(k), `${k} was invented and should be gone`)
    }
    // Sorted, and every row carries a badge_index.
    assert.deepEqual(fights.map((f) => f.sort_order), [...fights.map((f) => f.sort_order)].sort((a, b) => a - b))
    assert.ok(fights.every((f) => f.badge_index !== null))
  })

  it('puts the Route 215 Ace Trainer at the end of the Maylene split', async () => {
    const fights = (await (await fetch(api('/fights'))).json()) as Record<string, any>[]
    const keys = fights.map((f) => f.key)
    const ace = fights.find((f) => f.key === 'ace-trainer-215')!

    assert.equal(ace.location, 'Route 215')
    assert.equal(ace.badge_index, 3, 'fought on 3 badges, inside the Maylene split')
    assert.ok(keys.indexOf('ace-trainer-215') > keys.indexOf('mansion-double'), 'follows the mansion double')
    assert.ok(keys.indexOf('ace-trainer-215') < keys.indexOf('maylene'), 'and comes right before Maylene')
  })

  it('puts Castle Valet Darach straight after the first Cyrus fight', async () => {
    const fights = (await (await fetch(api('/fights'))).json()) as Record<string, any>[]
    const keys = fights.map((f) => f.key)
    const darach = fights.find((f) => f.key === 'darach-castle-valet')!

    assert.equal(darach.name, 'Castle Valet Darach')
    assert.equal(darach.badge_index, 5, 'same split as the Celestic Town Cyrus')
    assert.ok(keys.indexOf('darach-castle-valet') > keys.indexOf('cyrus-celestic'), 'follows that Cyrus')
    assert.ok(keys.indexOf('darach-castle-valet') < keys.indexOf('barry-canalave'), 'and precedes the rest of the split')
  })

  it('records a threat note and danger rating', async () => {
    const fights = (await (await fetch(api('/fights'))).json()) as { id: number; key: string }[]
    const wake = fights.find((f) => f.key === 'wake')!
    const res = await json(`/fights/${wake.id}`, 'PATCH', {
      danger: 5,
      threat_note: 'Floatzel outspeeds everything, Ice Fang on the switch',
    })
    assert.equal(res.status, 200)
    const body = (await res.json()) as Record<string, any>
    assert.equal(body.danger, 5)
    assert.match(body.threat_note, /Floatzel/)
  })

  it('rejects a danger rating outside 1-5', async () => {
    const fights = (await (await fetch(api('/fights'))).json()) as { id: number; key: string }[]
    const id = fights[0].id
    assert.equal((await json(`/fights/${id}`, 'PATCH', { danger: 9 })).status, 400)
    assert.equal((await json(`/fights/${id}`, 'PATCH', { danger: 0 })).status, 400)
    assert.equal((await json('/fights/999999', 'PATCH', { danger: 3 })).status, 404)
  })

  // Badge count alone can't say where you are inside a tier, so "next up" comes
  // from what's been cleared, not from the badge number.
  // Beating a gym proves everything leading up to it is behind you, so the
  // whole run of earlier fights clears with it.
  it('clears every fight up to the last gym whose badge you hold', async () => {
    await upload({ trainerId: 4060, secretId: 60, badges: 3 })
    const runId = await currentRunId(4060)
    const fights = (await (await fetch(api(`/fights?run=${runId}`))).json()) as Record<string, any>[]
    const by = (key: string) => fights.find((f) => f.key === key)!

    assert.equal(by('fantina').cleared, true, 'the 3rd gym itself — Fantina, in this hack')
    assert.equal(by('roark').cleared, true)
    assert.equal(by('gardenia').cleared, true)
    // Non-gym fights before her come along for the ride.
    assert.equal(by('mars-windworks').cleared, true)
    assert.equal(by('mars-windworks').clearedByBadge, true)
    assert.equal(by('cheryl-eterna-forest').cleared, true)
    assert.equal(by('jupiter-eterna').cleared, true)
    assert.equal(by('mira-wayward').cleared, true)
    assert.equal(by('dawn-207').cleared, true)
    assert.equal(by('aaron-early').cleared, true, 'the early Aaron sits inside the Fantina split')
    // Nothing past that gym is touched.
    assert.equal(by('maylene').cleared, false, 'the 4th gym is still ahead at 3 badges')
    assert.equal(by('mansion-double').cleared, false)
    assert.equal(by('barry-pastoria').cleared, false)
    assert.equal(by('wake').cleared, false)

    const third = by('fantina').sort_order
    for (const f of fights) {
      assert.equal(f.clearedByBadge, f.sort_order <= third, `${f.key} cleared-by-badge follows sort order`)
    }
  })

  it('clears nothing from badges alone before the first gym', async () => {
    await upload({ trainerId: 4064, secretId: 64, badges: 0 })
    const runId = await currentRunId(4064)
    const fights = (await (await fetch(api(`/fights?run=${runId}`))).json()) as Record<string, any>[]
    assert.ok(fights.every((f) => !f.clearedByBadge), 'no badges means no cascade')
  })

  it('ticks a non-gym fight off for one run only, and untick restores it', async () => {
    await upload({ trainerId: 4061, secretId: 61, badges: 1 })
    const runA = await currentRunId(4061)
    await upload({ trainerId: 4062, secretId: 62, badges: 1 })
    const runB = await currentRunId(4062)

    const fights = (await (await fetch(api(`/fights?run=${runA}`))).json()) as Record<string, any>[]
    const mars = fights.find((f) => f.key === 'mars-windworks')!
    assert.equal(mars.cleared, false)

    assert.equal((await json(`/fights/${mars.id}/clear`, 'POST', { run_id: runA })).status, 201)

    const afterA = (await (await fetch(api(`/fights?run=${runA}`))).json()) as Record<string, any>[]
    assert.equal(afterA.find((f) => f.key === 'mars-windworks')!.cleared, true)

    const afterB = (await (await fetch(api(`/fights?run=${runB}`))).json()) as Record<string, any>[]
    assert.equal(afterB.find((f) => f.key === 'mars-windworks')!.cleared, false, 'cleared state is per-run')

    const undone = await fetch(api(`/fights/${mars.id}/clear?run=${runA}`), { method: 'DELETE' })
    assert.equal(undone.status, 204)
    const restored = (await (await fetch(api(`/fights?run=${runA}`))).json()) as Record<string, any>[]
    assert.equal(restored.find((f) => f.key === 'mars-windworks')!.cleared, false)
  })

  it('reports cleared state on /state for the run being shown', async () => {
    await upload({ trainerId: 4063, secretId: 63, badges: 2 })
    const runId = await currentRunId(4063)
    const state = (await (await fetch(api(`/state?run=${runId}`))).json()) as Record<string, any>
    const first = state.fights.find((f: { cleared: boolean }) => !f.cleared)
    assert.equal(first.key, 'jupiter-eterna', 'first uncleared fight is what is next up')
    assert.equal(state.fights.find((f: { key: string }) => f.key === 'gardenia').cleared, true)
  })

  it('validates clearing against a real fight and run', async () => {
    const runId = await currentRunId(4063)
    assert.equal((await json('/fights/999999/clear', 'POST', { run_id: runId })).status, 404)
    const fights = (await (await fetch(api('/fights'))).json()) as { id: number }[]
    assert.equal((await json(`/fights/${fights[0].id}/clear`, 'POST', { run_id: 99999 })).status, 400)
    assert.equal((await fetch(api(`/fights/${fights[0].id}/clear`), { method: 'DELETE' })).status, 400)
    assert.equal(
      (await fetch(api(`/fights/${fights[0].id}/clear?run=${runId}`), { method: 'DELETE' })).status,
      404,
      'unticking something never ticked is a 404',
    )
  })

  it('adds and removes a custom fight', async () => {
    const res = await json('/fights', 'POST', { name: 'Barry — Canalave', location: 'Canalave City', badge_index: 5 })
    assert.equal(res.status, 201)
    const created = (await res.json()) as { id: number; name: string }
    assert.equal(created.name, 'Barry — Canalave')
    assert.equal((await json('/fights', 'POST', { name: '  ' })).status, 400)
    assert.equal((await fetch(api(`/fights/${created.id}`), { method: 'DELETE' })).status, 204)
    assert.equal((await fetch(api(`/fights/${created.id}`), { method: 'DELETE' })).status, 404)
  })
})

describe('GET /api/games/renplat/species', () => {
  it('serves all 493 species with names and types for the pickers', async () => {
    const res = await fetch(api('/species'))
    assert.equal(res.status, 200)
    const list = (await res.json()) as { id: number; name: string; types: string[] }[]
    assert.equal(list.length, 493)
    assert.equal(list[0].id, 1)
    assert.equal(list[0].name, 'Bulbasaur')
    assert.equal(list.at(-1)!.id, 493)
    assert.deepEqual(list.find((s) => s.id === 391)!.types, ['Fire', 'Fighting'])
    // Sorted by dex number, so the picker reads in dex order.
    assert.deepEqual(
      list.map((s) => s.id),
      [...list.map((s) => s.id)].sort((a, b) => a - b),
    )
  })
})

describe('encounters', () => {
  it('keeps the species attached to a lost encounter', async () => {
    await upload({ trainerId: 4070, secretId: 70 })
    const runId = await currentRunId(4070)
    const res = await json('/encounters', 'POST', {
      run_id: runId,
      location: 'Route 205',
      species: 74,
      outcome: 'fainted',
      note: 'crit it by accident',
    })
    assert.equal(res.status, 201)

    const state = (await (await fetch(api(`/state?run=${runId}`))).json()) as Record<string, any>
    const loss = state.encounters.losses[0]
    assert.equal(loss.species, 74)
    assert.equal(loss.outcome, 'fainted')
  })

  it('accepts a lost encounter with no species', async () => {
    const runId = await currentRunId(4070)
    const res = await json('/encounters', 'POST', { run_id: runId, location: 'Route 206', outcome: 'fled' })
    assert.equal(res.status, 201)
    const state = (await (await fetch(api(`/state?run=${runId}`))).json()) as Record<string, any>
    assert.equal(state.encounters.losses.find((l: { location: string }) => l.location === 'Route 206').species, null)
  })

  it('logs and removes a lost encounter', async () => {
    await upload({ trainerId: 4030, secretId: 30 })
    const runId = await currentRunId(4030)
    const res = await json('/encounters', 'POST', {
      run_id: runId,
      location: 'Route 205',
      species: 74,
      outcome: 'fled',
      note: 'ran before I could throw a ball',
    })
    assert.equal(res.status, 201)
    const created = (await res.json()) as { id: number }

    const state = (await (await fetch(api(`/state?run=${runId}`))).json()) as Record<string, any>
    assert.equal(state.encounters.losses.length, 1)
    assert.equal(state.encounters.losses[0].outcome, 'fled')

    assert.equal((await fetch(api(`/encounters/${created.id}`), { method: 'DELETE' })).status, 204)
    assert.equal((await fetch(api(`/encounters/${created.id}`), { method: 'DELETE' })).status, 404)
  })

  it('validates run, location and outcome', async () => {
    const runId = await currentRunId(4030)
    assert.equal((await json('/encounters', 'POST', { run_id: 99999, location: 'x', outcome: 'fled' })).status, 400)
    assert.equal((await json('/encounters', 'POST', { run_id: runId, location: '', outcome: 'fled' })).status, 400)
    assert.equal((await json('/encounters', 'POST', { run_id: runId, location: 'x', outcome: 'nope' })).status, 400)
  })
})

describe('run lifecycle', () => {
  it('marks a run dead with a cause, and can reopen it', async () => {
    await upload({ trainerId: 4040, secretId: 40, badges: 3, party: [monferno] })
    const runId = await currentRunId(4040)
    const fights = (await (await fetch(api('/fights'))).json()) as { id: number; key: string }[]
    const wake = fights.find((f) => f.key === 'wake')!

    const res = await json(`/runs/${runId}/end`, 'POST', {
      status: 'lost',
      fight_id: wake.id,
      post_mortem: 'swept by Floatzel',
    })
    assert.equal(res.status, 200)
    const ended = (await res.json()) as Record<string, any>
    assert.equal(ended.status, 'lost')
    assert.equal(ended.death_fight_id, wake.id)
    assert.match(ended.post_mortem, /Floatzel/)
    assert.ok(ended.ended_at)

    const reopened = (await (await json(`/runs/${runId}/reopen`, 'POST', {})).json()) as Record<string, any>
    assert.equal(reopened.status, 'active')
    assert.equal(reopened.ended_at, null)
  })

  it('rejects an unknown status or run', async () => {
    const runId = await currentRunId(4040)
    assert.equal((await json(`/runs/${runId}/end`, 'POST', { status: 'paused' })).status, 400)
    assert.equal((await json('/runs/999999/end', 'POST', { status: 'lost' })).status, 404)
  })

  it('lists runs newest first with badges, deaths and the final team', async () => {
    await upload({
      trainerId: 4050,
      secretId: 50,
      badges: 4,
      party: [monferno, { ...monferno, pid: 0x85073f86, species: 397, level: 30 }],
    })
    const runs = (await (await fetch(api('/runs'))).json()) as Record<string, any>[]
    const run = runs.find((r) => r.trainer_id === 4050)!
    assert.equal(run.badges, 4)
    assert.equal(run.final_team.length, 2)
    assert.equal(run.final_team[1].nickname, 'Staravia')
    assert.ok(run.last_synced_at)
    assert.ok(runs[0].number >= run.number, 'newest first')
  })
})
