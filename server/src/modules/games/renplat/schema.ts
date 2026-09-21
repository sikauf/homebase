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
    // Definitive fight list, transcribed from the Renegade Platinum trainer
    // spreadsheet's per-gym SPLIT sheets. Everything seeded before this was
    // reconstructed from vanilla Platinum and much of it was wrong — most
    // importantly the gym order: this hack runs Roark, Gardenia, FANTINA,
    // Maylene, Wake, Byron, Candice, Volkner, so Fantina is 3rd, not 5th.
    //
    // `badge_index` is the badges held during that split, and lines up with the
    // "LVL CAP" the sheet prints on each split sheet (16/26/33/39/44/53/56/62/78).
    // Rivals who fight alongside you (Barry in the mansion double, Dawn/Lucas as
    // partners) are not fights and are left out.
    //
    // Upserts rather than replaces, so threat notes and danger ratings already
    // entered survive on any key that carries over.
    id: 'renplat_fight_from_spreadsheet_v1',
    up: (db) => {
      type Row = [key: string, name: string, location: string, badges: number, order: number, award: number | null]
      const FIGHTS: Row[] = [
        // ROARK SPLIT — 0 badges, cap 16
        ['roark', 'Roark', 'Oreburgh Gym', 0, 100, 1],
        // GARDENIA SPLIT — 1 badge, cap 26
        ['mars-windworks', 'Commander Mars', 'Valley Windworks', 1, 200, null],
        ['cheryl-eterna-forest', 'Cheryl', 'Eterna Forest', 1, 210, null],
        ['gardenia', 'Gardenia', 'Eterna Gym', 1, 220, 2],
        // FANTINA SPLIT — 2 badges, cap 33
        ['jupiter-eterna', 'Commander Jupiter', 'Galactic Eterna Building 4F', 2, 300, null],
        ['mira-wayward', 'Mira', 'Wayward Cave', 2, 310, null],
        ['dawn-207', 'Dawn', 'Route 207', 2, 320, null],
        ['aaron-early', 'Aaron', 'Hearthome City Gate West', 2, 330, null],
        ['fantina', 'Fantina', 'Hearthome Gym', 2, 340, 3],
        // MAYLENE SPLIT — 3 badges, cap 39
        ['barry-hearthome-gate', 'Barry', 'Hearthome City Gate East', 3, 400, null],
        ['mansion-double', 'Saturn & Backlot (double)', 'Pokémon Mansion, Route 212', 3, 410, null],
        ['maylene', 'Maylene', 'Veilstone Gym', 3, 420, 4],
        // WAKE SPLIT — 4 badges, cap 44
        ['barry-pastoria', 'Barry', 'Pastoria City, at the gym door', 4, 500, null],
        ['wake', 'Crasher Wake', 'Pastoria Gym', 4, 510, 5],
        // BYRON SPLIT — 5 badges, cap 53
        ['dawn-210', 'Dawn', 'Route 210 North', 5, 600, null],
        ['cyrus-celestic', 'Cyrus', 'Celestic Town Ruins', 5, 610, null],
        ['barry-canalave', 'Barry', 'Canalave City', 5, 620, null],
        ['riley-iron-island', 'Riley', 'Iron Island', 5, 630, null],
        ['byron', 'Byron', 'Canalave Gym', 5, 640, 6],
        // CANDICE SPLIT — 6 badges, cap 56
        ['saturn-lake-valor', 'Commander Saturn', 'Lake Valor', 6, 700, null],
        ['mars-lake-verity', 'Commander Mars', 'Lake Verity', 6, 710, null],
        ['candice', 'Candice', 'Snowpoint Gym', 6, 720, 7],
        // VOLKNER SPLIT — 7 badges, cap 62
        ['cyrus-hq', 'Cyrus', 'Galactic HQ 3F', 7, 800, null],
        ['saturn-hq', 'Commander Saturn', 'Galactic HQ Laboratory', 7, 810, null],
        ['mars-jupiter-spear', 'Mars & Jupiter (multi)', 'Galactic HQ', 7, 820, null],
        ['cyrus-distortion', 'Cyrus', 'Distortion World (double)', 7, 830, null],
        ['cyrus-distortion-2', 'Cyrus', 'Distortion World (single)', 7, 840, null],
        ['volkner', 'Volkner', 'Sunyshore Gym', 7, 850, 8],
        // CHAMPION SPLIT — 8 badges, cap 78
        ['marley-victory-road', 'Marley', 'Victory Road', 8, 900, null],
        ['dawn-gratitude', 'Dawn', 'Route 224, Stone of Gratitude', 8, 910, null],
        ['barry-league', 'Barry', 'Pokémon League', 8, 920, null],
        ['aaron', 'Aaron', 'Elite Four — Bug', 8, 930, null],
        ['bertha', 'Bertha', 'Elite Four — Ground', 8, 940, null],
        ['flint', 'Flint', 'Elite Four — Fire', 8, 950, null],
        ['lucian', 'Lucian', 'Elite Four — Psychic', 8, 960, null],
        ['cynthia', 'Cynthia', 'Champion', 8, 970, null],
      ]

      const insert = db.prepare(
        `INSERT OR IGNORE INTO renplat_fight (key, name, location, badge_index, sort_order, badge_award)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      const update = db.prepare(
        `UPDATE renplat_fight SET name = ?, location = ?, badge_index = ?, sort_order = ?, badge_award = ?
         WHERE key = ?`,
      )
      for (const [key, name, location, badges, order, award] of FIGHTS) {
        insert.run(key, name, location, badges, order, award)
        update.run(name, location, badges, order, award, key)
      }

      // Drop everything the spreadsheet doesn't list, except fights added by hand.
      const keep = FIGHTS.map(() => '?').join(', ')
      db.prepare(
        `DELETE FROM renplat_fight WHERE key NOT IN (${keep}) AND key NOT LIKE 'custom-%'`,
      ).run(...FIGHTS.map(([key]) => key))
    },
  },
]
