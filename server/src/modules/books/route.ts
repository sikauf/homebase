import { Router, Request, Response } from 'express'
import { Vibrant } from 'node-vibrant/node'
import db from '../../db/client'

const SELECT_ACCENT = db.prepare('SELECT accent_rgb FROM book_accent_cache WHERE cover_url = ?')
const UPSERT_ACCENT = db.prepare('INSERT OR REPLACE INTO book_accent_cache (cover_url, accent_rgb) VALUES (?, ?)')
const HAS_CACHED_VIDEOS = db.prepare(
  `SELECT 1 FROM book_video_cache WHERE book_id = ? AND cached_at > datetime('now', '-30 days') LIMIT 1`
)
const SELECT_UNDISMISSED_FOR_BOOK = db.prepare(`
  SELECT video_id, title, channel, thumbnail_url FROM book_video_cache
  WHERE book_id = ? AND cached_at > datetime('now', '-30 days')
  AND video_id NOT IN (SELECT video_id FROM book_video_dismissed)
`)
const INSERT_VIDEO = db.prepare(
  `INSERT OR REPLACE INTO book_video_cache (book_id, video_id, title, channel, thumbnail_url, cached_at)
   VALUES (?, ?, ?, ?, ?, datetime('now'))`
)
const INSERT_DISMISSED = db.prepare(`INSERT OR IGNORE INTO book_video_dismissed (video_id) VALUES (?)`)

async function getAccentRgb(cover_url: string): Promise<string | null> {
  const cached = SELECT_ACCENT.get(cover_url) as { accent_rgb: string | null } | undefined
  if (cached !== undefined) return cached.accent_rgb

  let accent_rgb: string | null = null
  try {
    const palette = await Vibrant.from(cover_url).getPalette()
    const usable = Object.values(palette)
      .filter(Boolean)
      .filter((s) => {
        const [, sat, light] = s!.hsl
        return sat > 0.15 && light > 0.2
      })
      .sort((a, b) => (b?.population ?? 0) - (a?.population ?? 0))
    const swatch = usable[0] ?? palette.Vibrant ?? palette.DarkVibrant
    if (swatch) {
      const [r, g, b] = swatch.rgb
      accent_rgb = `${Math.round(r)},${Math.round(g)},${Math.round(b)}`
    }
  } catch { /* fall through — client will use a default */ }

  UPSERT_ACCENT.run(cover_url, accent_rgb)
  return accent_rgb
}

// --- In-memory TTL cache for Hardcover API responses (5 min) ----------------
const _cache = new Map<string, { payload: unknown; exp: number }>()
const CACHE_TTL = 5 * 60 * 1000

function hitCache<T>(key: string): T | null {
  const e = _cache.get(key)
  return e && e.exp > Date.now() ? (e.payload as T) : null
}
function setCache(key: string, payload: unknown): void {
  _cache.set(key, { payload, exp: Date.now() + CACHE_TTL })
}
export function clearBooksCache(): void { _cache.clear() }
// ---------------------------------------------------------------------------

const router = Router()
const HARDCOVER_URL = 'https://api.hardcover.app/v1/graphql'

async function hardcoverQuery<T>(token: string, query: string): Promise<{ data?: T; errors?: { message: string }[] }> {
  const r = await fetch(HARDCOVER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query }),
  })
  return r.json() as Promise<{ data?: T; errors?: { message: string }[] }>
}

router.get('/profile', async (_req: Request, res: Response) => {
  const token = process.env.HARDCOVER_API_TOKEN
  if (!token) { res.status(503).json({ error: 'HARDCOVER_API_TOKEN not configured' }); return }

  let data: { data?: { me?: { username: string; id: number }[] }; errors?: { message: string }[] }
  try {
    data = await hardcoverQuery<{ me: { username: string; id: number }[] }>(token, '{ me { id username } }')
  } catch {
    res.status(503).json({ error: 'Failed to reach Hardcover API' }); return
  }

  if (data.errors?.length) { res.status(502).json({ error: data.errors[0].message }); return }
  const me = data.data?.me?.[0]
  if (!me) { res.status(502).json({ error: 'Unexpected response from Hardcover API' }); return }
  res.json({ id: me.id, username: me.username })
})

const CURRENTLY_READING_QUERY = `{
  me {
    user_books(where: { status_id: { _eq: 2 } }) {
      user_book_reads(order_by: { started_at: desc_nulls_last }, limit: 1) {
        progress_pages
        started_at
        edition {
          pages
        }
      }
      book {
        id
        title
        pages
        image { url }
        contributions {
          author { name }
        }
      }
    }
  }
}`

interface HardcoverBook {
  user_book_reads: { progress_pages: number; started_at: string | null; edition: { pages: number } | null }[]
  book: {
    id: number
    title: string
    pages: number
    image: { url: string } | null
    contributions: { author: { name: string } }[]
  }
}

router.get('/currently-reading', async (_req: Request, res: Response) => {
  const token = process.env.HARDCOVER_API_TOKEN
  if (!token) { res.status(503).json({ error: 'HARDCOVER_API_TOKEN not configured' }); return }

  const cached = hitCache('currently-reading')
  if (cached) { res.json(cached); return }

  let data: { data?: { me?: { user_books: HardcoverBook[] }[] }; errors?: { message: string }[] }
  try {
    data = await hardcoverQuery<{ me: { user_books: HardcoverBook[] }[] }>(token, CURRENTLY_READING_QUERY)
  } catch {
    res.status(503).json({ error: 'Failed to reach Hardcover API' }); return
  }

  if (data.errors?.length) { res.status(502).json({ error: data.errors[0].message }); return }

  const userBooks = data.data?.me?.[0]?.user_books ?? []

  const books = await Promise.all(userBooks.map(async (ub) => {
    const cover_url = ub.book.image?.url ?? null
    const accent_rgb = cover_url ? await getAccentRgb(cover_url) : null
    const currentRead = ub.user_book_reads[0]
    return {
      book_id: ub.book.id,
      title: ub.book.title,
      author: ub.book.contributions[0]?.author.name ?? null,
      pages: currentRead?.edition?.pages ?? ub.book.pages,
      progress_pages: currentRead?.progress_pages ?? null,
      started_at: currentRead?.started_at ?? null,
      cover_url,
      accent_rgb,
    }
  }))

  setCache('currently-reading', books)
  res.json(books)
})

const COMPLETED_QUERY = `{
  me {
    user_books(where: { status_id: { _eq: 3 } }, order_by: { user_book_reads_aggregate: { max: { finished_at: desc_nulls_last } } }) {
      user_book_reads(order_by: { finished_at: desc_nulls_last }, limit: 1) {
        started_at
        finished_at
      }
      book {
        id
        title
        image { url }
        contributions {
          author { name }
        }
      }
    }
  }
}`

interface HardcoverCompletedBook {
  user_book_reads: { started_at: string | null; finished_at: string | null }[]
  book: {
    id: number
    title: string
    image: { url: string } | null
    contributions: { author: { name: string } }[]
  }
}

interface CompletedBook {
  book_id: number
  title: string
  author: string | null
  cover_url: string | null
  accent_rgb: string | null
  started_at: string | null
  finished_at: string | null
}

type CompletedResult =
  | { ok: true; books: CompletedBook[] }
  | { ok: false; status: number; error: string }

// Shared by both the /completed route and the screening picker so the
// Hardcover fetch + accent-extraction lives in exactly one place.
async function getCompletedBooks(token: string): Promise<CompletedResult> {
  const cached = hitCache<CompletedBook[]>('completed')
  if (cached) return { ok: true, books: cached }

  let data: { data?: { me?: { user_books: HardcoverCompletedBook[] }[] }; errors?: { message: string }[] }
  try {
    data = await hardcoverQuery<{ me: { user_books: HardcoverCompletedBook[] }[] }>(token, COMPLETED_QUERY)
  } catch {
    return { ok: false, status: 503, error: 'Failed to reach Hardcover API' }
  }
  if (data.errors?.length) return { ok: false, status: 502, error: data.errors[0].message }

  const userBooks = data.data?.me?.[0]?.user_books ?? []
  const books = await Promise.all(userBooks.map(async (ub) => {
    const cover_url = ub.book.image?.url ?? null
    const accent_rgb = cover_url ? await getAccentRgb(cover_url) : null
    const read = ub.user_book_reads[0]
    return {
      book_id: ub.book.id,
      title: ub.book.title,
      author: ub.book.contributions[0]?.author.name ?? null,
      cover_url,
      accent_rgb,
      started_at: read?.started_at ?? null,
      finished_at: read?.finished_at ?? null,
    }
  }))

  setCache('completed', books)
  return { ok: true, books }
}

router.get('/completed', async (_req: Request, res: Response) => {
  const token = process.env.HARDCOVER_API_TOKEN
  if (!token) { res.status(503).json({ error: 'HARDCOVER_API_TOKEN not configured' }); return }

  const result = await getCompletedBooks(token)
  if (!result.ok) { res.status(result.status).json({ error: result.error }); return }
  res.json(result.books)
})

const SHELF_QUERY = `{
  me {
    user_books(where: { status_id: { _eq: 1 } }, order_by: { id: asc }) {
      book {
        id
        title
        image { url }
        contributions {
          author { name }
        }
      }
    }
  }
}`

interface HardcoverShelfBook {
  book: {
    id: number
    title: string
    image: { url: string } | null
    contributions: { author: { name: string } }[]
  }
}

router.get('/shelf', async (_req: Request, res: Response) => {
  const token = process.env.HARDCOVER_API_TOKEN
  if (!token) { res.status(503).json({ error: 'HARDCOVER_API_TOKEN not configured' }); return }

  const cached = hitCache('shelf')
  if (cached) { res.json(cached); return }

  let data: { data?: { me?: { user_books: HardcoverShelfBook[] }[] }; errors?: { message: string }[] }
  try {
    data = await hardcoverQuery<{ me: { user_books: HardcoverShelfBook[] }[] }>(token, SHELF_QUERY)
  } catch {
    res.status(503).json({ error: 'Failed to reach Hardcover API' }); return
  }

  if (data.errors?.length) { res.status(502).json({ error: data.errors[0].message }); return }

  const userBooks = data.data?.me?.[0]?.user_books ?? []

  const books = await Promise.all(userBooks.map(async (ub) => {
    const cover_url = ub.book.image?.url ?? null
    const accent_rgb = cover_url ? await getAccentRgb(cover_url) : null
    return {
      book_id: ub.book.id,
      title: ub.book.title,
      author: ub.book.contributions[0]?.author.name ?? null,
      cover_url,
      accent_rgb,
    }
  }))

  setCache('shelf', books)
  res.json(books)
})

// ---- Journal -------------------------------------------------------------
// reading_journals isn't reachable through `me`, so we resolve our user id
// once (it never changes for this single-user app) and reuse it.
let cachedUserId: { token: string; id: number } | null = null

async function getMyUserId(token: string): Promise<number | null> {
  if (cachedUserId?.token === token) return cachedUserId.id
  const data = await hardcoverQuery<{ me: { id: number }[] }>(token, '{ me { id } }')
  const id = data.data?.me?.[0]?.id
  if (typeof id !== 'number') return null
  cachedUserId = { token, id }
  return id
}

const journalQuery = (userId: number, bookId: number) => `{
  me {
    user_books(where: { book_id: { _eq: ${bookId} } }) {
      rating
      review_raw
    }
  }
  reading_journals(
    where: { user_id: { _eq: ${userId} }, book_id: { _eq: ${bookId} } }
    order_by: { action_at: asc }
  ) {
    event
    entry
    action_at
    metadata
  }
}`

interface RawJournal {
  event: string
  entry: string | null
  action_at: string
  metadata: {
    position?: { percent?: number }
    started_at?: string
    finished_at?: string
  } | null
}

// What we send the client. Notes & quotes are "writing"; started/finished are
// thin markers. progress_updated (redundant — every note carries its position)
// and standalone rated/reviewed events are dropped: rating/review come from user_books.
interface JournalEntry {
  kind: 'note' | 'quote' | 'started' | 'finished'
  text: string | null
  percent: number | null
  date: string
}

function normalizeEntry(raw: RawJournal): JournalEntry | null {
  const m = raw.metadata ?? {}
  switch (raw.event) {
    case 'note':
    case 'quote': {
      const pos = m.position ?? {}
      return {
        kind: raw.event,
        text: raw.entry,
        percent: typeof pos.percent === 'number' ? pos.percent : null,
        date: raw.action_at,
      }
    }
    case 'user_book_read_started':
      return { kind: 'started', text: null, percent: null, date: m.started_at ?? raw.action_at }
    case 'user_book_read_finished':
      return { kind: 'finished', text: null, percent: null, date: m.finished_at ?? raw.action_at }
    default:
      return null
  }
}

router.get('/journal/:bookId', async (req: Request, res: Response) => {
  const token = process.env.HARDCOVER_API_TOKEN
  if (!token) { res.status(503).json({ error: 'HARDCOVER_API_TOKEN not configured' }); return }

  const bookId = Number(req.params.bookId)
  if (!Number.isInteger(bookId) || bookId <= 0) { res.status(400).json({ error: 'Invalid book id' }); return }

  const cacheKey = `journal:${bookId}`
  const cachedJournal = hitCache(cacheKey)
  if (cachedJournal) { res.json(cachedJournal); return }

  let data: {
    data?: {
      me?: { user_books: { rating: number | null; review_raw: string | null }[] }[]
      reading_journals?: RawJournal[]
    }
    errors?: { message: string }[]
  }
  try {
    const userId = await getMyUserId(token)
    if (userId == null) { res.status(502).json({ error: 'Unexpected response from Hardcover API' }); return }
    data = await hardcoverQuery(token, journalQuery(userId, bookId))
  } catch {
    res.status(503).json({ error: 'Failed to reach Hardcover API' }); return
  }

  if (data.errors?.length) { res.status(502).json({ error: data.errors[0].message }); return }

  const userBook = data.data?.me?.[0]?.user_books?.[0]
  const review = userBook?.review_raw?.trim() || null
  const entries = (data.data?.reading_journals ?? [])
    .map(normalizeEntry)
    .filter((e): e is JournalEntry => e !== null)

  const result = { rating: userBook?.rating ?? null, review, entries }
  setCache(cacheKey, result)
  res.json(result)
})

// ---- Reading progress (pages per update, for the calendar) -----------------
// One query returns every progress_updated journal event across all books;
// each carries the absolute page position before/after, so pages read per day
// is just the per-day sum of deltas (computed client-side in local time).

// Hardcover caps result sets at 100 rows, so page with offset until a short page.
const PROGRESS_PAGE_SIZE = 100

const progressQuery = (userId: number, offset: number) => `{
  reading_journals(
    where: { user_id: { _eq: ${userId} }, event: { _eq: "progress_updated" } }
    order_by: { action_at: asc }
    limit: ${PROGRESS_PAGE_SIZE}
    offset: ${offset}
  ) {
    book_id
    action_at
    metadata
    book { title }
  }
}`

interface RawProgress {
  book_id: number
  action_at: string
  metadata: { progress_pages?: number | null; progress_pages_was?: number | null } | null
  book: { title: string } | null
}

router.get('/reading-progress', async (_req: Request, res: Response) => {
  const token = process.env.HARDCOVER_API_TOKEN
  if (!token) { res.status(503).json({ error: 'HARDCOVER_API_TOKEN not configured' }); return }

  const cached = hitCache('reading-progress')
  if (cached) { res.json(cached); return }

  const journals: RawProgress[] = []
  try {
    const userId = await getMyUserId(token)
    if (userId == null) { res.status(502).json({ error: 'Unexpected response from Hardcover API' }); return }
    // 50 pages = 5000 updates; plenty of headroom while still bounded.
    for (let page = 0; page < 50; page++) {
      const data: { data?: { reading_journals?: RawProgress[] }; errors?: { message: string }[] } =
        await hardcoverQuery(token, progressQuery(userId, page * PROGRESS_PAGE_SIZE))
      if (data.errors?.length) { res.status(502).json({ error: data.errors[0].message }); return }
      const batch = data.data?.reading_journals ?? []
      journals.push(...batch)
      if (batch.length < PROGRESS_PAGE_SIZE) break
    }
  } catch {
    res.status(503).json({ error: 'Failed to reach Hardcover API' }); return
  }

  const updates = journals.flatMap((j) => {
    const pages = j.metadata?.progress_pages
    if (typeof pages !== 'number') return []
    const was = typeof j.metadata?.progress_pages_was === 'number' ? j.metadata.progress_pages_was : 0
    const pages_read = pages - was
    if (pages_read === 0) return []
    return [{
      book_id: j.book_id,
      title: j.book?.title ?? 'Unknown',
      at: j.action_at,
      pages_read,
      progress_pages: pages,
    }]
  })

  setCache('reading-progress', updates)
  res.json(updates)
})

// ---- Screening Room -------------------------------------------------------
// Surfaces a random completed book plus YouTube analysis videos for it.

interface VideoResult {
  video_id: string
  title: string
  channel: string
  thumbnail_url: string
}

async function searchYouTube(
  ytKey: string,
  book: { title: string; author: string | null },
): Promise<VideoResult[] | null> {
  const q = [`"${book.title}"`, book.author, 'book analysis'].filter(Boolean).join(' ')
  const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=4&q=${encodeURIComponent(q)}&key=${ytKey}`
  let ytData: {
    error?: { message: string }
    items?: { id: { videoId: string }; snippet: { title: string; channelTitle: string; thumbnails: { medium?: { url: string }; default?: { url: string } } } }[]
  }
  try {
    const r = await fetch(ytUrl)
    ytData = await r.json() as typeof ytData
  } catch {
    return null
  }
  if (ytData.error) return null
  return (ytData.items ?? [])
    .map((item) => ({
      video_id: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail_url: item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url ?? '',
    }))
    .filter((v) => v.video_id)
}

// Fisher–Yates — an unbiased shuffle, unlike `sort(() => Math.random() - 0.5)`.
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function parseIdList(raw: unknown): Set<number> {
  return new Set<number>(
    (typeof raw === 'string' ? raw.split(',') : [])
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0)
  )
}

router.post('/videos/dismiss', (req: Request, res: Response) => {
  const { video_id } = req.body as { video_id?: unknown }
  if (!video_id || typeof video_id !== 'string') {
    res.status(400).json({ error: 'video_id required' }); return
  }
  INSERT_DISMISSED.run(video_id)
  res.status(204).end()
})

router.get('/screening', async (req: Request, res: Response) => {
  const token = process.env.HARDCOVER_API_TOKEN
  if (!token) { res.status(503).json({ error: 'HARDCOVER_API_TOKEN not configured' }); return }
  const ytKey = process.env.YOUTUBE_API_KEY
  if (!ytKey) { res.status(503).json({ error: 'YOUTUBE_API_KEY not configured' }); return }

  const result = await getCompletedBooks(token)
  if (!result.ok) { res.status(result.status).json({ error: result.error }); return }

  const excludeIds = parseIdList(req.query.exclude_book_ids)
  const pool = result.books.filter((b) => !excludeIds.has(b.book_id))
  if (!pool.length) { res.status(404).json({ error: 'No books available' }); return }

  // Walk a shuffled pool until a book yields at least one undismissed video.
  // Dismissed filtering happens in SQL (indexed PK anti-join) — never a full load.
  for (const book of shuffle(pool)) {
    if (!HAS_CACHED_VIDEOS.get(book.book_id)) {
      const found = await searchYouTube(ytKey, book)
      if (!found || !found.length) continue
      for (const v of found) INSERT_VIDEO.run(book.book_id, v.video_id, v.title, v.channel, v.thumbnail_url)
    }

    const videos = SELECT_UNDISMISSED_FOR_BOOK.all(book.book_id) as unknown as VideoResult[]
    if (videos.length) {
      res.json({
        book: {
          book_id: book.book_id,
          title: book.title,
          author: book.author,
          cover_url: book.cover_url,
          accent_rgb: book.accent_rgb,
        },
        videos,
      })
      return
    }
  }

  res.status(404).json({ error: 'No undismissed videos available' })
})

// ---- Recommendations ------------------------------------------------------
// No runtime LLM key: the recommendation pool is generated by the assistant in
// a chat session (which reads /recommendations/profile, then POSTs to
// /recommendations/pool). The server just pages through that pool a WINDOW at a
// time — each promoted pick is resolved against Hardcover for a cover + id/slug
// and persisted in book_recommendation (the active window). The active window
// is filtered against the live library at read time, so a book silently leaves
// once it's shelved/read on Hardcover — no dismissal tracking needed.

const WINDOW = 12

const SELECT_RECS = db.prepare(
  `SELECT id, hardcover_id, title, author, blurb, cover_url, accent_rgb, hardcover_slug
   FROM book_recommendation ORDER BY id ASC`
)
const CLEAR_RECS = db.prepare('DELETE FROM book_recommendation')
const INSERT_REC = db.prepare(
  `INSERT INTO book_recommendation (hardcover_id, title, author, blurb, cover_url, accent_rgb, hardcover_slug)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
)
const DELETE_REC = db.prepare('DELETE FROM book_recommendation WHERE id = ?')

// The pool: the full ~200-pick batch the assistant seeded. `promoted` flips to
// 1 once a row has been pulled into a window (whether or not it ended up shown).
const CLEAR_POOL = db.prepare('DELETE FROM book_recommendation_pool')
const INSERT_POOL = db.prepare(
  'INSERT INTO book_recommendation_pool (position, title, author, blurb) VALUES (?, ?, ?, ?)'
)
const NEXT_POOL = db.prepare(
  'SELECT id, title, author, blurb FROM book_recommendation_pool WHERE promoted = 0 ORDER BY position ASC'
)
const MARK_PROMOTED = db.prepare('UPDATE book_recommendation_pool SET promoted = 1 WHERE id = ?')
const COUNT_POOL_REMAINING = db.prepare('SELECT COUNT(*) AS n FROM book_recommendation_pool WHERE promoted = 0')

function poolRemaining(): number {
  return (COUNT_POOL_REMAINING.get() as { n: number }).n
}

interface StoredRec {
  id: number
  hardcover_id: number | null
  title: string
  author: string | null
  blurb: string
  cover_url: string | null
  accent_rgb: string | null
  hardcover_slug: string | null
}

// One round trip: every book the user has logged, partitioned in JS. status_id
// 3 = read (the rating signal); any logged book is excluded from suggestions.
const LIBRARY_QUERY = `{
  me {
    user_books {
      status_id
      rating
      review_raw
      book {
        id
        title
        contributions { author { name } }
      }
    }
  }
}`

interface RawLibraryBook {
  status_id: number
  rating: number | null
  review_raw: string | null
  book: { id: number; title: string; contributions: { author: { name: string } }[] } | null
}

interface ReadBook { title: string; author: string | null; rating: number | null; review: string | null }
interface Library { read: ReadBook[]; excludeIds: Set<number>; excludeTitles: string[] }

type LibraryResult = { ok: true; library: Library } | { ok: false; status: number; error: string }

async function getLibrary(token: string): Promise<LibraryResult> {
  const cached = hitCache<Library>('recs-library')
  if (cached) return { ok: true, library: cached }

  let data: { data?: { me?: { user_books: RawLibraryBook[] }[] }; errors?: { message: string }[] }
  try {
    data = await hardcoverQuery(token, LIBRARY_QUERY)
  } catch {
    return { ok: false, status: 503, error: 'Failed to reach Hardcover API' }
  }
  if (data.errors?.length) return { ok: false, status: 502, error: data.errors[0].message }

  const userBooks = data.data?.me?.[0]?.user_books ?? []
  const excludeIds = new Set<number>()
  const excludeTitles: string[] = []
  const read: ReadBook[] = []
  for (const ub of userBooks) {
    if (!ub.book) continue
    excludeIds.add(ub.book.id)
    excludeTitles.push(ub.book.title)
    if (ub.status_id === 3) {
      read.push({
        title: ub.book.title,
        author: ub.book.contributions[0]?.author.name ?? null,
        rating: ub.rating,
        review: ub.review_raw?.trim() || null,
      })
    }
  }

  const library: Library = { read, excludeIds, excludeTitles }
  setCache('recs-library', library)
  return { ok: true, library }
}

interface Pick { title: string; author: string; blurb: string }

// Hardcover blocks _ilike, so we use its Typesense-backed `search` endpoint,
// which ranks by popularity and returns a cover + id/slug in one hit. We query
// by title only (folding the author in lets study-guide knockoffs that put the
// author in their title outrank the real book) and disambiguate same-titled
// books by author in the selection below.
const RESOLVE_QUERY = (title: string) =>
  `{ search(query: ${JSON.stringify(title)}, query_type: "Book", per_page: 5) { results } }`

interface SearchDoc {
  id: number
  slug: string | null
  title: string
  image: { url: string } | null
  author_names?: string[]
}

interface ResolvedBook {
  hardcover_id: number
  title: string
  author: string | null
  cover_url: string | null
  hardcover_slug: string | null
}

// Looks up a pool pick on Hardcover. Returns null when the title genuinely has
// no match (the pick is dropped); throws on an API/transport error so the
// caller can stop instead of burning through the whole pool during an outage.
async function resolveHardcoverBook(token: string, pick: Pick): Promise<ResolvedBook | null> {
  const data = await hardcoverQuery<{ search?: { results?: { hits?: { document: SearchDoc }[] } } }>(
    token, RESOLVE_QUERY(pick.title)
  )
  if (data.errors?.length) throw new Error(data.errors[0].message)

  const hits = data.data?.search?.results?.hits ?? []
  if (!hits.length) return null

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const want = norm(pick.title)
  const wantAuthor = pick.author ? norm(pick.author) : null
  const titleMatch = (d: SearchDoc) => norm(d.title) === want
  const authorMatch = (d: SearchDoc) =>
    !wantAuthor || (d.author_names ?? []).some((a) => { const n = norm(a); return n.includes(wantAuthor) || wantAuthor.includes(n) })
  const docs = hits.map((h) => h.document)
  const best =
    docs.find((d) => titleMatch(d) && authorMatch(d)) ??
    docs.find(titleMatch) ??
    docs.find(authorMatch) ??
    docs[0]

  return {
    hardcover_id: best.id,
    title: best.title,
    author: best.author_names?.[0] ?? pick.author ?? null,
    cover_url: best.image?.url ?? null,
    hardcover_slug: best.slug ?? null,
  }
}

// Pulls the next `count` un-promoted pool picks into the active window: each is
// resolved against Hardcover and inserted (skipping anything already owned or a
// duplicate). A pick is only marked promoted once it resolves or is genuinely
// not found — an API error breaks the loop so an outage can't drain the pool.
// We also cap how many candidates a single window will burn through.
async function fillWindow(token: string, count: number): Promise<StoredRec[]> {
  const lib = await getLibrary(token)
  const excludeIds = lib.ok ? lib.library.excludeIds : new Set<number>()

  CLEAR_RECS.run()
  const candidates = NEXT_POOL.all() as { id: number; title: string; author: string | null; blurb: string }[]
  const seen = new Set<number>()
  let filled = 0
  let scanned = 0
  for (const c of candidates) {
    if (filled >= count || scanned >= count * 4) break
    scanned++
    let resolved: ResolvedBook | null
    try {
      resolved = await resolveHardcoverBook(token, { title: c.title, author: c.author ?? '', blurb: c.blurb })
    } catch {
      break // API error — leave this pick (and the rest) un-promoted for a retry
    }
    MARK_PROMOTED.run(c.id)
    if (!resolved) continue
    if (excludeIds.has(resolved.hardcover_id) || seen.has(resolved.hardcover_id)) continue
    seen.add(resolved.hardcover_id)
    const accent = resolved.cover_url ? await getAccentRgb(resolved.cover_url) : null
    INSERT_REC.run(resolved.hardcover_id, resolved.title, resolved.author, c.blurb, resolved.cover_url, accent, resolved.hardcover_slug)
    filled++
  }
  return SELECT_RECS.all() as unknown as StoredRec[]
}

router.get('/recommendations', async (_req: Request, res: Response) => {
  const stored = SELECT_RECS.all() as unknown as StoredRec[]

  // Filter out anything that's since landed in the live library (shelved/read
  // on Hardcover). If we can't reach Hardcover, fall back to the stored set.
  const token = process.env.HARDCOVER_API_TOKEN
  let excludeIds = new Set<number>()
  if (token) {
    const lib = await getLibrary(token)
    if (lib.ok) excludeIds = lib.library.excludeIds
  }

  const recommendations = stored.filter((r) => r.hardcover_id == null || !excludeIds.has(r.hardcover_id))
  res.json({ recommendations, pool_remaining: poolRemaining() })
})

// Read-only taste profile, consumed by the assistant when generating a pool.
router.get('/recommendations/profile', async (_req: Request, res: Response) => {
  const token = process.env.HARDCOVER_API_TOKEN
  if (!token) { res.status(503).json({ error: 'HARDCOVER_API_TOKEN not configured' }); return }

  const lib = await getLibrary(token)
  if (!lib.ok) { res.status(lib.status).json({ error: lib.error }); return }

  res.json({
    read: lib.library.read,
    total_read: lib.library.read.length,
    library_titles: lib.library.excludeTitles,
  })
})

// Seeds a fresh pool (the assistant's ~200 picks) and opens the first window.
router.post('/recommendations/pool', async (req: Request, res: Response) => {
  const token = process.env.HARDCOVER_API_TOKEN
  if (!token) { res.status(503).json({ error: 'HARDCOVER_API_TOKEN not configured' }); return }

  const raw = (req.body as { picks?: unknown })?.picks
  if (!Array.isArray(raw)) { res.status(400).json({ error: 'picks array required' }); return }
  const picks = raw.filter((p): p is Pick =>
    !!p && typeof p === 'object' &&
    typeof (p as Pick).title === 'string' && (p as Pick).title.trim() !== '' &&
    typeof (p as Pick).blurb === 'string')
  if (!picks.length) { res.status(400).json({ error: 'no valid picks supplied' }); return }

  CLEAR_POOL.run()
  CLEAR_RECS.run()
  picks.forEach((p, i) => INSERT_POOL.run(i, p.title, typeof p.author === 'string' ? p.author : null, p.blurb))

  const recommendations = await fillWindow(token, WINDOW)
  res.json({ recommendations, pool_remaining: poolRemaining() })
})

// Advances to the next window of picks. Leaves the current window intact when
// the pool is spent so the page doesn't go blank.
router.post('/recommendations/more', async (_req: Request, res: Response) => {
  const token = process.env.HARDCOVER_API_TOKEN
  if (!token) { res.status(503).json({ error: 'HARDCOVER_API_TOKEN not configured' }); return }

  if (poolRemaining() === 0) {
    res.json({ recommendations: SELECT_RECS.all() as unknown as StoredRec[], pool_remaining: 0, exhausted: true })
    return
  }

  const recommendations = await fillWindow(token, WINDOW)
  res.json({ recommendations, pool_remaining: poolRemaining(), exhausted: false })
})

router.delete('/recommendations/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: 'Invalid id' }); return }
  DELETE_REC.run(id)
  res.status(204).end()
})

// ---- Library (every logged book, for pickers) -------------------------------
// LIBRARY_QUERY above serves the recommendations flow and carries no covers;
// this variant fetches what a book picker needs and nothing else.

const LIBRARY_BOOKS_QUERY = `{
  me {
    user_books {
      book {
        id
        title
        image { url }
        contributions { author { name } }
      }
    }
  }
}`

interface RawPickerBook {
  book: {
    id: number
    title: string
    image: { url: string } | null
    contributions: { author: { name: string } }[]
  } | null
}

router.get('/library', async (_req: Request, res: Response) => {
  const token = process.env.HARDCOVER_API_TOKEN
  if (!token) { res.status(503).json({ error: 'HARDCOVER_API_TOKEN not configured' }); return }

  const cached = hitCache('library-books')
  if (cached) { res.json(cached); return }

  let data: { data?: { me?: { user_books: RawPickerBook[] }[] }; errors?: { message: string }[] }
  try {
    data = await hardcoverQuery(token, LIBRARY_BOOKS_QUERY)
  } catch {
    res.status(503).json({ error: 'Failed to reach Hardcover API' }); return
  }

  if (data.errors?.length) { res.status(502).json({ error: data.errors[0].message }); return }

  const byId = new Map<number, { book_id: number; title: string; author: string | null; cover_url: string | null }>()
  for (const ub of data.data?.me?.[0]?.user_books ?? []) {
    if (!ub.book || byId.has(ub.book.id)) continue
    byId.set(ub.book.id, {
      book_id: ub.book.id,
      title: ub.book.title,
      author: ub.book.contributions[0]?.author.name ?? null,
      cover_url: ub.book.image?.url ?? null,
    })
  }
  const books = [...byId.values()].sort((a, b) => a.title.localeCompare(b.title))

  setCache('library-books', books)
  res.json(books)
})

// ---- Parallels --------------------------------------------------------------
// A parallel links exactly two books with a free-text note; the graph tab
// derives edge weight from how many parallels share a pair. Rows snapshot both
// books' metadata so reads never touch Hardcover, and store the smaller book id
// as book_a so a pair is a canonical key.

const SELECT_PARALLELS = db.prepare(
  `SELECT id, book_a_id, book_a_title, book_a_author, book_a_cover_url,
          book_b_id, book_b_title, book_b_author, book_b_cover_url,
          note, created_at
   FROM book_parallel ORDER BY created_at DESC, id DESC`
)
const INSERT_PARALLEL = db.prepare(
  `INSERT INTO book_parallel (book_a_id, book_a_title, book_a_author, book_a_cover_url,
                              book_b_id, book_b_title, book_b_author, book_b_cover_url, note)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
)
const SELECT_PARALLEL_BY_ROWID = db.prepare(
  'SELECT id, book_a_id, book_b_id, note, created_at FROM book_parallel WHERE rowid = ?'
)
const DELETE_PARALLEL = db.prepare('DELETE FROM book_parallel WHERE id = ?')

interface ParallelRow {
  id: number
  book_a_id: number
  book_a_title: string
  book_a_author: string | null
  book_a_cover_url: string | null
  book_b_id: number
  book_b_title: string
  book_b_author: string | null
  book_b_cover_url: string | null
  note: string
  created_at: string
}

interface ParallelBookInput {
  book_id: number
  title: string
  author: string | null
  cover_url: string | null
}

function parseParallelBook(raw: unknown): ParallelBookInput | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Record<string, unknown>
  if (!Number.isInteger(b.book_id) || (b.book_id as number) <= 0) return null
  if (typeof b.title !== 'string' || !b.title.trim()) return null
  return {
    book_id: b.book_id as number,
    title: b.title.trim(),
    author: typeof b.author === 'string' && b.author.trim() ? b.author.trim() : null,
    cover_url: typeof b.cover_url === 'string' && b.cover_url ? b.cover_url : null,
  }
}

router.get('/parallels', async (_req: Request, res: Response) => {
  const rows = SELECT_PARALLELS.all() as unknown as ParallelRow[]

  // Node list: every distinct book across both endpoints. Rows arrive
  // newest-first, so a book's first sighting carries its freshest snapshot.
  const byId = new Map<number, { book_id: number; title: string; author: string | null; cover_url: string | null }>()
  for (const r of rows) {
    if (!byId.has(r.book_a_id)) {
      byId.set(r.book_a_id, { book_id: r.book_a_id, title: r.book_a_title, author: r.book_a_author, cover_url: r.book_a_cover_url })
    }
    if (!byId.has(r.book_b_id)) {
      byId.set(r.book_b_id, { book_id: r.book_b_id, title: r.book_b_title, author: r.book_b_author, cover_url: r.book_b_cover_url })
    }
  }
  const books = await Promise.all([...byId.values()].map(async (b) => ({
    ...b,
    accent_rgb: b.cover_url ? await getAccentRgb(b.cover_url) : null,
  })))

  res.json({
    books,
    parallels: rows.map((r) => ({
      id: r.id,
      book_a_id: r.book_a_id,
      book_b_id: r.book_b_id,
      note: r.note,
      created_at: r.created_at,
    })),
  })
})

router.post('/parallels', (req: Request, res: Response) => {
  const body = (req.body ?? {}) as { book_a?: unknown; book_b?: unknown; note?: unknown }
  const a = parseParallelBook(body.book_a)
  const b = parseParallelBook(body.book_b)
  if (!a || !b) { res.status(400).json({ error: 'book_a and book_b must each have a book_id and title' }); return }
  if (a.book_id === b.book_id) { res.status(400).json({ error: 'A parallel needs two different books' }); return }
  const note = typeof body.note === 'string' ? body.note.trim() : ''
  if (!note) { res.status(400).json({ error: 'note required' }); return }

  const [first, second] = a.book_id < b.book_id ? [a, b] : [b, a]
  const result = INSERT_PARALLEL.run(
    first.book_id, first.title, first.author, first.cover_url,
    second.book_id, second.title, second.author, second.cover_url,
    note,
  )
  res.status(201).json(SELECT_PARALLEL_BY_ROWID.get(result.lastInsertRowid))
})

router.delete('/parallels/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: 'Invalid id' }); return }
  const result = DELETE_PARALLEL.run(id)
  if (result.changes === 0) { res.status(404).json({ error: 'Parallel not found' }); return }
  res.status(204).end()
})

export default router
