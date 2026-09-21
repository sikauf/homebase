import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { setupTestServer } from '../../../shared/test-helpers'
import { buildSave, asBase64, ERASED_COUNTER, type SaveSpec } from './fixture'
import { parseSave, LEVEL_CAPS } from './save'

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
    // The Grave box is excluded from encounters — it lists living catches only.
    const locations = body.encounters.byLocation.map((e: { location: string }) => e.location)
    assert.deepEqual(locations.sort(), ['Route 201', 'Route 204'])
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
})

describe('fights', () => {
  it('seeds the boss skeleton in story order with badge indexes', async () => {
    const fights = (await (await fetch(api('/fights'))).json()) as Record<string, any>[]
    const keys = fights.map((f) => f.key)
    assert.ok(keys.includes('roark'))
    assert.ok(keys.includes('cynthia'))
    // Rivals interleave with the bosses by sort_order.
    assert.ok(keys.includes('dawn-eterna-forest'))
    assert.ok(keys.includes('cheryl-eterna-forest'))
    assert.ok(!keys.includes('barry-floaroma'), 'there is no Barry fight in Floaroma Town')
    assert.ok(
      keys.indexOf('cheryl-eterna-forest') < keys.indexOf('gardenia'),
      'Eterna Forest comes before the Eterna City gym',
    )
    assert.ok(keys.indexOf('cheryl-eterna-forest') > keys.indexOf('mars-windworks'), 'and after Windworks')
    assert.ok(keys.indexOf('barry-league') > keys.indexOf('volkner'), 'the League rematch is last')
    // Nothing rival-shaped sits ahead of Mars at Valley Windworks.
    assert.ok(!keys.includes('barry-203'), 'the Route 203 Barry fight is dropped')
    assert.ok(!keys.includes('dawn-jubilife'), 'the Jubilife Dawn fight is dropped')
    const beforeMars = fights.slice(0, keys.indexOf('mars-windworks'))
    assert.deepEqual(beforeMars.map((f) => f.key), ['roark'], 'only Roark precedes the first Mars fight')
    // Renegade Platinum's own additions, in their story slots.
    assert.ok(keys.indexOf('mansion-double') < keys.indexOf('wake'), 'Route 212 mansion precedes Pastoria')
    assert.ok(keys.indexOf('aaron-early') < keys.indexOf('saturn-valor'), 'early Aaron precedes Saturn')
    assert.ok(keys.indexOf('aaron-early') < keys.indexOf('aaron'), 'and precedes the Elite Four Aaron')
    assert.equal(fights.find((f) => f.key === 'aaron-early')!.badge_index, 4)
    assert.equal(fights.find((f) => f.key === 'mansion-double')!.badge_index, 3)
    // Neither is a gym, so neither is auto-cleared by a badge.
    assert.equal(fights.find((f) => f.key === 'aaron-early')!.badge_award, null)
    assert.equal(fights.find((f) => f.key === 'mansion-double')!.badge_award, null)
    assert.ok(keys.indexOf('roark') < keys.indexOf('volkner'), 'story order')
    assert.equal(fights.find((f) => f.key === 'roark')!.badge_index, 0)
    assert.equal(fights.find((f) => f.key === 'cynthia')!.badge_index, 8)
    assert.equal(fights.find((f) => f.key === 'roark')!.threat_note, null)
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
  it('auto-clears gyms whose badge you already hold, and only those', async () => {
    await upload({ trainerId: 4060, secretId: 60, badges: 3 })
    const runId = await currentRunId(4060)
    const fights = (await (await fetch(api(`/fights?run=${runId}`))).json()) as Record<string, any>[]
    const by = (key: string) => fights.find((f) => f.key === key)!

    assert.equal(by('roark').cleared, true)
    assert.equal(by('roark').clearedByBadge, true)
    assert.equal(by('gardenia').cleared, true)
    assert.equal(by('maylene').cleared, true)
    assert.equal(by('wake').cleared, false, 'the 4th gym is still ahead at 3 badges')
    // A Galactic fight in an already-passed tier is NOT settled by badges.
    assert.equal(by('mars-windworks').cleared, false)
    assert.equal(by('mars-windworks').clearedByBadge, false)
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
    assert.equal(first.key, 'mars-windworks', 'first uncleared fight is what is next up')
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
