import { Migration } from '../../../db/migrations'

// Seeded skeleton of Platinum's boss progression, in story order. `badge_index`
// is how many badges you hold going *into* the fight, so it lines up with the
// level cap that applies. Threat notes start empty — they're yours to fill in as
// fights hurt you. Seeded with INSERT OR IGNORE on `key`, so later edits and
// deletions stick.
const SEED_FIGHTS: [key: string, name: string, location: string, badges: number][] = [
  ['roark', 'Roark', 'Oreburgh Gym — Rock', 0],
  ['mars-windworks', 'Commander Mars', 'Valley Windworks', 1],
  ['gardenia', 'Gardenia', 'Eterna Gym — Grass', 1],
  ['jupiter-eterna', 'Commander Jupiter', 'Eterna Galactic Building', 2],
  ['maylene', 'Maylene', 'Veilstone Gym — Fighting', 2],
  ['wake', 'Crasher Wake', 'Pastoria Gym — Water', 3],
  ['fantina', 'Fantina', 'Hearthome Gym — Ghost', 4],
  ['saturn-valor', 'Commander Saturn', 'Lake Valor', 4],
  ['mars-verity', 'Commander Mars', 'Lake Verity', 4],
  ['byron', 'Byron', 'Canalave Gym — Steel', 5],
  ['cyrus-hq', 'Cyrus', 'Team Galactic HQ, Veilstone', 5],
  ['candice', 'Candice', 'Snowpoint Gym — Ice', 6],
  ['mars-jupiter-spear', 'Mars & Jupiter (double)', 'Spear Pillar', 7],
  ['cyrus-spear', 'Cyrus', 'Spear Pillar', 7],
  ['cyrus-distortion', 'Cyrus', 'Distortion World', 7],
  ['volkner', 'Volkner', 'Sunyshore Gym — Electric', 7],
  ['aaron', 'Aaron', 'Elite Four — Bug', 8],
  ['bertha', 'Bertha', 'Elite Four — Ground', 8],
  ['flint', 'Flint', 'Elite Four — Fire', 8],
  ['lucian', 'Lucian', 'Elite Four — Psychic', 8],
  ['cynthia', 'Cynthia', 'Champion', 8],
]

export const migrations: Migration[] = [
  {
    id: 'renplat_run_v1',
    up: `CREATE TABLE IF NOT EXISTS renplat_run (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      number         INTEGER NOT NULL,
      trainer_id     INTEGER NOT NULL,
      secret_id      INTEGER NOT NULL,
      trainer_name   TEXT NOT NULL,
      status         TEXT NOT NULL DEFAULT 'active',
      started_at     TEXT NOT NULL DEFAULT (datetime('now')),
      ended_at       TEXT,
      death_fight_id INTEGER,
      post_mortem    TEXT,
      UNIQUE (trainer_id, secret_id)
    )`,
  },
  {
    id: 'renplat_snapshot_v1',
    up: `CREATE TABLE IF NOT EXISTS renplat_snapshot (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id           INTEGER NOT NULL REFERENCES renplat_run(id) ON DELETE CASCADE,
      uploaded_at      TEXT NOT NULL DEFAULT (datetime('now')),
      raw              BLOB NOT NULL,
      parsed           TEXT NOT NULL,
      badges           INTEGER NOT NULL,
      playtime_seconds INTEGER NOT NULL,
      money            INTEGER NOT NULL,
      save_counter     INTEGER NOT NULL
    )`,
  },
  {
    // PID is a Pokémon's permanent 32-bit identity, so it's the natural key for
    // "this exact mon died". Pending deaths are then just the Grave box minus
    // the rows here — no snapshot diffing, and boxing three mons before syncing
    // still works.
    id: 'renplat_death_v1',
    up: `CREATE TABLE IF NOT EXISTS renplat_death (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id       INTEGER NOT NULL REFERENCES renplat_run(id) ON DELETE CASCADE,
      pid          INTEGER NOT NULL,
      species      INTEGER NOT NULL,
      nickname     TEXT,
      level        INTEGER,
      met_location TEXT,
      fight_id     INTEGER REFERENCES renplat_fight(id) ON DELETE SET NULL,
      note         TEXT,
      recorded_at  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (run_id, pid)
    )`,
  },
  {
    id: 'renplat_fight_v1',
    up: `CREATE TABLE IF NOT EXISTS renplat_fight (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      key         TEXT NOT NULL UNIQUE,
      name        TEXT NOT NULL,
      location    TEXT,
      badge_index INTEGER,
      sort_order  INTEGER NOT NULL,
      danger      INTEGER,
      threat_note TEXT
    )`,
  },
  {
    id: 'renplat_encounter_loss_v1',
    up: `CREATE TABLE IF NOT EXISTS renplat_encounter_loss (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id     INTEGER NOT NULL REFERENCES renplat_run(id) ON DELETE CASCADE,
      location   TEXT NOT NULL,
      species    INTEGER,
      outcome    TEXT NOT NULL,
      note       TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  },
  {
    id: 'renplat_fight_seed_v1',
    up: (db) => {
      const insert = db.prepare(
        `INSERT OR IGNORE INTO renplat_fight (key, name, location, badge_index, sort_order)
         VALUES (?, ?, ?, ?, ?)`,
      )
      SEED_FIGHTS.forEach(([key, name, location, badges], i) => {
        insert.run(key, name, location, badges, i * 10)
      })
    },
  },
  {
    // Which badge a gym hands you. Badge count alone can't say where you are
    // *within* a tier, but it does settle the gyms definitively: holding 3
    // badges means Roark, Gardenia and Maylene are behind you. Everything else
    // (Galactic, rivals, the E4) gets cleared by hand.
    id: 'renplat_fight_badge_award_v1',
    up: (db) => {
      db.exec('ALTER TABLE renplat_fight ADD COLUMN badge_award INTEGER')
      const award = db.prepare('UPDATE renplat_fight SET badge_award = ? WHERE key = ?')
      const GYMS = ['roark', 'gardenia', 'maylene', 'wake', 'fantina', 'byron', 'candice', 'volkner']
      GYMS.forEach((key, i) => award.run(i + 1, key))
    },
  },
  {
    // Rival fights. Barry's stops follow Platinum's story; Renegade Platinum
    // also turns the counterpart (Dawn) into a recurring rival. Slotted between
    // the existing sort_orders so they interleave with the bosses.
    //
    // These locations are a best reconstruction, not gospel — especially Dawn's.
    // Both the name and location are editable inline, so correct them in place.
    id: 'renplat_fight_rivals_v1',
    up: (db) => {
      const insert = db.prepare(
        `INSERT OR IGNORE INTO renplat_fight (key, name, location, badge_index, sort_order)
         VALUES (?, ?, ?, ?, ?)`,
      )
      // Nothing before Mars at Valley Windworks (sort_order 10) — the pre-Mars
      // Barry and Dawn fights aren't worth tracking; see the drop migration below.
      const RIVALS: [key: string, name: string, location: string, badges: number, order: number][] = [
        ['dawn-eterna-forest', 'Dawn', 'Eterna Forest', 1, 22],
        ['barry-eterna', 'Barry', 'Eterna City', 1, 26],
        ['barry-pastoria', 'Barry', 'Pastoria City', 3, 48],
        ['barry-hearthome', 'Barry', 'Hearthome City', 3, 55],
        ['barry-canalave', 'Barry', 'Canalave City', 5, 85],
        ['dawn-celestic', 'Dawn', 'Celestic Town', 5, 88],
        ['dawn-sunyshore', 'Dawn', 'Sunyshore City', 7, 145],
        ['barry-victory-road', 'Barry', 'Victory Road', 8, 155],
        ['dawn-league', 'Dawn', 'Pokémon League', 8, 158],
        ['barry-league', 'Barry', 'Pokémon League', 8, 159],
      ]
      for (const [key, name, location, badges, order] of RIVALS) {
        insert.run(key, name, location, badges, order)
      }
    },
  },
  {
    // Two Renegade Platinum additions that aren't in vanilla's progression:
    // Aaron turns up at Valor Lakefront long before the Elite Four (slotted
    // just ahead of Saturn at the lake), and there's a double battle in the
    // Route 212 mansion on the way to Pastoria.
    id: 'renplat_fight_rp_extras_v1',
    up: (db) => {
      const insert = db.prepare(
        `INSERT OR IGNORE INTO renplat_fight (key, name, location, badge_index, sort_order)
         VALUES (?, ?, ?, ?, ?)`,
      )
      insert.run('mansion-double', 'Double battle — Mansion', 'Pokémon Mansion, Route 212', 3, 45)
      insert.run('aaron-early', 'Aaron', 'Valor Lakefront', 4, 65)
    },
  },
  {
    // Per-run, unlike the fight row itself: a threat note is worth keeping
    // across attempts, "I've beaten this" is not.
    id: 'renplat_fight_cleared_v1',
    up: `CREATE TABLE IF NOT EXISTS renplat_fight_cleared (
      run_id     INTEGER NOT NULL REFERENCES renplat_run(id) ON DELETE CASCADE,
      fight_id   INTEGER NOT NULL REFERENCES renplat_fight(id) ON DELETE CASCADE,
      cleared_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (run_id, fight_id)
    )`,
  },
  {
    // The rival fights ahead of Mars at Valley Windworks were seeded by
    // renplat_fight_rivals_v1 before being dropped from that list, so any
    // database that already applied it still holds them. Removing the rows
    // cascades to their cleared marks and nulls any death that pointed at them.
    id: 'renplat_fight_drop_pre_mars_rivals_v1',
    up: (db) => {
      const drop = db.prepare('DELETE FROM renplat_fight WHERE key = ?')
      for (const key of ['barry-203', 'dawn-jubilife']) drop.run(key)
    },
  },
  {
    // There is no Barry fight in Floaroma Town — that row was a bad guess in
    // renplat_fight_rivals_v1. Cheryl in Eterna Forest is a real one, and it
    // comes before Eterna City, so it sorts ahead of Gardenia.
    id: 'renplat_fight_cheryl_v1',
    up: (db) => {
      db.prepare('DELETE FROM renplat_fight WHERE key = ?').run('barry-floaroma')
      db.prepare(
        `INSERT OR IGNORE INTO renplat_fight (key, name, location, badge_index, sort_order)
         VALUES (?, ?, ?, ?, ?)`,
      ).run('cheryl-eterna-forest', 'Cheryl', 'Eterna Forest', 1, 16)
    },
  },
  {
    // The rival stops seeded by renplat_fight_rivals_v1 were reconstructed and
    // largely wrong. Replaced wholesale with the real ones.
    //
    // Fantina also moves: her gym opens after the Lake Valor and Lake Verity
    // events, so she has to sort after them for the Hearthome Gate Barry fight
    // to sit "right after Fantina" and for the badge counts to stay coherent
    // (everything between Wake and Fantina is at 4 badges, everything after her
    // at 5).
    id: 'renplat_fight_real_rivals_v1',
    up: (db) => {
      const drop = db.prepare("DELETE FROM renplat_fight WHERE key LIKE 'barry-%' OR key LIKE 'dawn-%'")
      drop.run()

      db.prepare('UPDATE renplat_fight SET sort_order = ? WHERE key = ?').run(82, 'fantina')

      const insert = db.prepare(
        `INSERT OR IGNORE INTO renplat_fight (key, name, location, badge_index, sort_order)
         VALUES (?, ?, ?, ?, ?)`,
      )
      const RIVALS: [key: string, name: string, location: string, badges: number, order: number][] = [
        ['barry-pastoria', 'Barry', 'Pastoria City', 3, 48], // right before Wake
        ['dawn-207', 'Dawn', 'Route 207', 4, 52], // before the early Aaron fight
        ['dawn-210', 'Dawn', 'Route 210', 4, 56], // after Wake
        ['barry-hearthome-gate', 'Barry', 'Hearthome Gate', 5, 84], // right after Fantina
        ['barry-canalave', 'Barry', 'Canalave City', 5, 88], // before Byron
        ['dawn-gratitude', 'Dawn', 'Stone of Gratitude', 8, 154], // before the League Barry
        ['barry-league', 'Barry', 'Pokémon League', 8, 156], // before Aaron
      ]
      for (const [key, name, location, badges, order] of RIVALS) {
        insert.run(key, name, location, badges, order)
      }
    },
  },
]
