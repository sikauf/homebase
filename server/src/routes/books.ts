import { Router, Request, Response } from 'express'

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
      user_book_reads {
        progress_pages
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
  user_book_reads: { progress_pages: number }[]
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
  const books = userBooks.map((ub) => ({
    title: ub.book.title,
    author: ub.book.contributions[0]?.author.name ?? null,
    pages: ub.book.pages,
    progress_pages: ub.user_book_reads[0]?.progress_pages ?? null,
    cover_url: ub.book.image?.url ?? null,
  }))

  res.json(books)
})

export default router
