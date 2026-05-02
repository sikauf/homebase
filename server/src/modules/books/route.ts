import { Router, Request, Response } from 'express'
import { Vibrant } from 'node-vibrant/node'
import db from '../../db/client'

const SELECT_ACCENT = db.prepare('SELECT accent_rgb FROM book_accent_cache WHERE cover_url = ?')
const UPSERT_ACCENT = db.prepare('INSERT OR REPLACE INTO book_accent_cache (cover_url, accent_rgb) VALUES (?, ?)')

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
        edition {
          pages
        }
      }
      book {
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
  user_book_reads: { progress_pages: number; edition: { pages: number } | null }[]
  book: {
    title: string
    pages: number
    image: { url: string } | null
    contributions: { author: { name: string } }[]
  }
}

router.get('/currently-reading', async (_req: Request, res: Response) => {
  const token = process.env.HARDCOVER_API_TOKEN
  if (!token) { res.status(503).json({ error: 'HARDCOVER_API_TOKEN not configured' }); return }

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
      title: ub.book.title,
      author: ub.book.contributions[0]?.author.name ?? null,
      pages: currentRead?.edition?.pages ?? ub.book.pages,
      progress_pages: currentRead?.progress_pages ?? null,
      cover_url,
      accent_rgb,
    }
  }))

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
    title: string
    image: { url: string } | null
    contributions: { author: { name: string } }[]
  }
}

router.get('/completed', async (_req: Request, res: Response) => {
  const token = process.env.HARDCOVER_API_TOKEN
  if (!token) { res.status(503).json({ error: 'HARDCOVER_API_TOKEN not configured' }); return }

  let data: { data?: { me?: { user_books: HardcoverCompletedBook[] }[] }; errors?: { message: string }[] }
  try {
    data = await hardcoverQuery<{ me: { user_books: HardcoverCompletedBook[] }[] }>(token, COMPLETED_QUERY)
  } catch {
    res.status(503).json({ error: 'Failed to reach Hardcover API' }); return
  }

  if (data.errors?.length) { res.status(502).json({ error: data.errors[0].message }); return }

  const userBooks = data.data?.me?.[0]?.user_books ?? []

  const books = await Promise.all(userBooks.map(async (ub) => {
    const cover_url = ub.book.image?.url ?? null
    const accent_rgb = cover_url ? await getAccentRgb(cover_url) : null
    const read = ub.user_book_reads[0]
    return {
      title: ub.book.title,
      author: ub.book.contributions[0]?.author.name ?? null,
      cover_url,
      accent_rgb,
      started_at: read?.started_at ?? null,
      finished_at: read?.finished_at ?? null,
    }
  }))

  res.json(books)
})

const SHELF_QUERY = `{
  me {
    user_books(where: { status_id: { _eq: 1 } }, order_by: { id: asc }) {
      book {
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
    title: string
    image: { url: string } | null
    contributions: { author: { name: string } }[]
  }
}

router.get('/shelf', async (_req: Request, res: Response) => {
  const token = process.env.HARDCOVER_API_TOKEN
  if (!token) { res.status(503).json({ error: 'HARDCOVER_API_TOKEN not configured' }); return }

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
      title: ub.book.title,
      author: ub.book.contributions[0]?.author.name ?? null,
      cover_url,
      accent_rgb,
    }
  }))

  res.json(books)
})

export default router
