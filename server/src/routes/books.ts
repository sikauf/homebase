import { Router, Request, Response } from 'express'
import { Vibrant } from 'node-vibrant/node'

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
    let accent_rgb: string | null = null
    if (cover_url) {
      try {
        const palette = await Vibrant.from(cover_url).getPalette()
        // Among swatches that are bright enough to work as an accent on a dark
        // background (hsl lightness > 0.2, saturation > 0.15), pick the most
        // populous. Fall back to Vibrant/DarkVibrant if nothing qualifies.
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
    }
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

export default router
