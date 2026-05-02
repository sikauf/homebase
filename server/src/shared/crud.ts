import { Router, Request, Response } from 'express'
import { DatabaseSync } from 'node:sqlite'

type ParamValue = string | number | null | bigint | Uint8Array

export interface FieldDef {
  required?: boolean
  default?: unknown
  validate?: (v: unknown) => boolean
  trim?: boolean
  error?: string
}

export function dateField(error = 'date is required and must be YYYY-MM-DD'): FieldDef {
  return {
    required: true,
    validate: (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v),
    error,
  }
}

export function enumField(
  values: ReadonlySet<string>,
  name: string,
  opts?: { default?: string; error?: string },
): FieldDef {
  return {
    required: opts?.default === undefined,
    default: opts?.default,
    validate: (v) => typeof v === 'string' && values.has(v),
    error: opts?.error ?? `${name} must be one of: ${[...values].join(', ')}`,
  }
}

export function stringField(error: string, opts?: { trim?: boolean }): FieldDef {
  return {
    required: true,
    trim: opts?.trim,
    validate: (v) => typeof v === 'string' && v.length > 0,
    error,
  }
}

interface ListOptions {
  route: string
  orderBy: string
  columns?: string
  map?: (row: Record<string, unknown>) => unknown
}

interface CreateOptions {
  route: string
  fields: Record<string, FieldDef>
  onConflict?: 'fail' | 'ignore' | 'upsert'
  upsertKeys?: string[]
  returns?: 'echo' | 'row'
}

interface RemoveOptions {
  route: string
  keys: string[]
  notFoundError: string
}

export interface CrudOptions {
  db: DatabaseSync
  table: string
  list?: ListOptions
  create?: CreateOptions
  remove?: RemoveOptions
}

export function defineCrud(opts: CrudOptions): Router {
  const router = Router()
  const { db, table } = opts

  if (opts.list) {
    const { route, orderBy, columns = '*', map } = opts.list
    const stmt = db.prepare(`SELECT ${columns} FROM ${table} ORDER BY ${orderBy}`)
    router.get(route, (_req: Request, res: Response) => {
      const rows = stmt.all() as Record<string, unknown>[]
      res.json(map ? rows.map(map) : rows)
    })
  }

  if (opts.create) {
    const { route, fields, onConflict = 'fail', upsertKeys, returns = 'echo' } = opts.create
    const fieldNames = Object.keys(fields)
    const placeholders = fieldNames.map(() => '?').join(', ')
    const cols = fieldNames.join(', ')

    let sql: string
    if (onConflict === 'ignore') {
      sql = `INSERT OR IGNORE INTO ${table} (${cols}) VALUES (${placeholders})`
    } else if (onConflict === 'upsert') {
      if (!upsertKeys || upsertKeys.length === 0) {
        throw new Error(`defineCrud: onConflict 'upsert' requires upsertKeys for table ${table}`)
      }
      const updateCols = fieldNames.filter((f) => !upsertKeys.includes(f))
      if (updateCols.length === 0) {
        throw new Error(`defineCrud: upsert needs at least one non-key column for table ${table}`)
      }
      const setClause = updateCols.map((c) => `${c} = excluded.${c}`).join(', ')
      sql = `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) ON CONFLICT(${upsertKeys.join(', ')}) DO UPDATE SET ${setClause}`
    } else {
      sql = `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`
    }
    const insertStmt = db.prepare(sql)
    const selectByRowid = returns === 'row' ? db.prepare(`SELECT * FROM ${table} WHERE rowid = ?`) : null

    router.post(route, (req: Request, res: Response) => {
      const body = (req.body ?? {}) as Record<string, unknown>
      const values: ParamValue[] = []
      const echo: Record<string, unknown> = {}

      for (const name of fieldNames) {
        const def = fields[name]
        let v = body[name]
        if (typeof v === 'string' && def.trim) v = v.trim()
        const missing = v === undefined || v === null || v === ''
        if (missing) {
          if (def.default !== undefined) {
            v = def.default
          } else if (def.required) {
            res.status(400).json({ error: def.error ?? `${name} is invalid` })
            return
          } else {
            v = null
          }
        }
        if (v !== null && def.validate && !def.validate(v)) {
          res.status(400).json({ error: def.error ?? `${name} is invalid` })
          return
        }
        values.push(v as ParamValue)
        echo[name] = v
      }

      const result = insertStmt.run(...values)

      if (returns === 'row' && selectByRowid) {
        const row = selectByRowid.get(result.lastInsertRowid)
        res.status(201).json(row)
      } else {
        res.status(201).json(echo)
      }
    })
  }

  if (opts.remove) {
    const { route, keys, notFoundError } = opts.remove
    const where = keys.map((k) => `${k} = ?`).join(' AND ')
    const deleteStmt = db.prepare(`DELETE FROM ${table} WHERE ${where}`)

    router.delete(route, (req: Request, res: Response) => {
      const params = keys.map((k) => req.params[k])
      const result = deleteStmt.run(...params)
      if (result.changes === 0) {
        res.status(404).json({ error: notFoundError })
        return
      }
      res.status(204).end()
    })
  }

  return router
}
