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
]
