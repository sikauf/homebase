import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { setupTestServer } from '../../shared/test-helpers'

const baseUrl = setupTestServer()
const realFetch = globalThis.fetch

function mockHardcover(payload: unknown) {
  globalThis.fetch = async (url: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    if (url.toString().includes('hardcover.app')) {
      return { json: async () => payload } as Response
    }
    return realFetch(url, init)
  }
}

describe('GET /api/books/profile', () => {
  it('returns 503 when HARDCOVER_API_TOKEN is not set', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    delete process.env.HARDCOVER_API_TOKEN
    const res = await realFetch(`${baseUrl()}/api/books/profile`)
    assert.equal(res.status, 503)
    process.env.HARDCOVER_API_TOKEN = orig
  })
})

describe('GET /api/books/currently-reading', () => {
  it('returns 503 when HARDCOVER_API_TOKEN is not set', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    delete process.env.HARDCOVER_API_TOKEN
    const res = await realFetch(`${baseUrl()}/api/books/currently-reading`)
    assert.equal(res.status, 503)
    process.env.HARDCOVER_API_TOKEN = orig
  })

  it('returns 200 with correctly shaped book objects', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    mockHardcover({
      data: {
        me: [{
          user_books: [{
            user_book_reads: [{ progress_pages: 150 }],
            book: {
              title: 'Test Book',
              pages: 400,
              image: null,
              contributions: [{ author: { name: 'Test Author' } }],
            },
          }],
        }],
      },
    })
    try {
      const res = await realFetch(`${baseUrl()}/api/books/currently-reading`)
      assert.equal(res.status, 200)
      const body = await res.json() as Record<string, unknown>[]
      assert.equal(body.length, 1)
      assert.equal(body[0].title, 'Test Book')
      assert.equal(body[0].author, 'Test Author')
      assert.equal(body[0].pages, 400)
      assert.equal(body[0].progress_pages, 150)
      assert.equal(body[0].cover_url, null)
      assert.equal(body[0].accent_rgb, null)
    } finally {
      process.env.HARDCOVER_API_TOKEN = orig
      globalThis.fetch = realFetch
    }
  })

  it('returns 200 with accent_rgb null when image is null', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    mockHardcover({
      data: {
        me: [{
          user_books: [{
            user_book_reads: [],
            book: { title: 'No Cover', pages: 200, image: null, contributions: [] },
          }],
        }],
      },
    })
    try {
      const res = await realFetch(`${baseUrl()}/api/books/currently-reading`)
      const body = await res.json() as Record<string, unknown>[]
      assert.equal(body[0].accent_rgb, null)
    } finally {
      process.env.HARDCOVER_API_TOKEN = orig
      globalThis.fetch = realFetch
    }
  })

  it('uses edition page count over book page count when edition is present', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    mockHardcover({
      data: {
        me: [{
          user_books: [{
            user_book_reads: [{ progress_pages: 75, edition: { pages: 512 } }],
            book: {
              title: 'Edition Book',
              pages: 480, // book default differs from edition
              image: null,
              contributions: [{ author: { name: 'Author' } }],
            },
          }],
        }],
      },
    })
    try {
      const res = await realFetch(`${baseUrl()}/api/books/currently-reading`)
      const body = await res.json() as Record<string, unknown>[]
      assert.equal(body[0].pages, 512, 'should use edition page count, not book page count')
    } finally {
      process.env.HARDCOVER_API_TOKEN = orig
      globalThis.fetch = realFetch
    }
  })

  it('falls back to book page count when edition has no pages', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    mockHardcover({
      data: {
        me: [{
          user_books: [{
            user_book_reads: [{ progress_pages: 50, edition: null }],
            book: {
              title: 'Fallback Book',
              pages: 300,
              image: null,
              contributions: [],
            },
          }],
        }],
      },
    })
    try {
      const res = await realFetch(`${baseUrl()}/api/books/currently-reading`)
      const body = await res.json() as Record<string, unknown>[]
      assert.equal(body[0].pages, 300, 'should fall back to book page count when edition is null')
    } finally {
      process.env.HARDCOVER_API_TOKEN = orig
      globalThis.fetch = realFetch
    }
  })

  it('uses the first (most recent) read for progress when multiple reads exist', async () => {
    // Hardcover returns reads ordered by started_at desc, so index 0 is the current read.
    // This test ensures we use reads[0] and not, e.g., reads[1] (an older re-read).
    const orig = process.env.HARDCOVER_API_TOKEN
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    mockHardcover({
      data: {
        me: [{
          user_books: [{
            user_book_reads: [
              { progress_pages: 200, edition: { pages: 400 } }, // current read (most recent)
              { progress_pages: 400, edition: { pages: 400 } }, // previous completed read
            ],
            book: {
              title: 'Re-read Book',
              pages: 400,
              image: null,
              contributions: [{ author: { name: 'Author' } }],
            },
          }],
        }],
      },
    })
    try {
      const res = await realFetch(`${baseUrl()}/api/books/currently-reading`)
      const body = await res.json() as Record<string, unknown>[]
      assert.equal(body[0].progress_pages, 200, 'should use the most recent read progress, not an older re-read')
    } finally {
      process.env.HARDCOVER_API_TOKEN = orig
      globalThis.fetch = realFetch
    }
  })

  it('returns empty array when no books are currently being read', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    mockHardcover({ data: { me: [{ user_books: [] }] } })
    try {
      const res = await realFetch(`${baseUrl()}/api/books/currently-reading`)
      assert.equal(res.status, 200)
      const body = await res.json()
      assert.deepEqual(body, [])
    } finally {
      process.env.HARDCOVER_API_TOKEN = orig
      globalThis.fetch = realFetch
    }
  })

  it('returns 502 when Hardcover API returns errors', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    mockHardcover({ errors: [{ message: 'Unauthorized' }] })
    try {
      const res = await realFetch(`${baseUrl()}/api/books/currently-reading`)
      assert.equal(res.status, 502)
    } finally {
      process.env.HARDCOVER_API_TOKEN = orig
      globalThis.fetch = realFetch
    }
  })
})

describe('GET /api/books/completed', () => {
  it('returns 503 when HARDCOVER_API_TOKEN is not set', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    delete process.env.HARDCOVER_API_TOKEN
    const res = await realFetch(`${baseUrl()}/api/books/completed`)
    assert.equal(res.status, 503)
    process.env.HARDCOVER_API_TOKEN = orig
  })

  it('returns 200 with correctly shaped completed book objects', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    mockHardcover({
      data: {
        me: [{
          user_books: [{
            user_book_reads: [{ started_at: '2024-01-05', finished_at: '2024-02-12' }],
            book: {
              title: 'Finished Book',
              image: null,
              contributions: [{ author: { name: 'Some Author' } }],
            },
          }],
        }],
      },
    })
    try {
      const res = await realFetch(`${baseUrl()}/api/books/completed`)
      assert.equal(res.status, 200)
      const body = await res.json() as Record<string, unknown>[]
      assert.equal(body.length, 1)
      assert.equal(body[0].title, 'Finished Book')
      assert.equal(body[0].author, 'Some Author')
      assert.equal(body[0].started_at, '2024-01-05')
      assert.equal(body[0].finished_at, '2024-02-12')
      assert.equal(body[0].cover_url, null)
      assert.equal(body[0].accent_rgb, null)
    } finally {
      process.env.HARDCOVER_API_TOKEN = orig
      globalThis.fetch = realFetch
    }
  })

  it('returns null dates when no reads recorded', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    mockHardcover({
      data: {
        me: [{
          user_books: [{
            user_book_reads: [],
            book: { title: 'No Dates Book', image: null, contributions: [] },
          }],
        }],
      },
    })
    try {
      const res = await realFetch(`${baseUrl()}/api/books/completed`)
      const body = await res.json() as Record<string, unknown>[]
      assert.equal(body[0].started_at, null)
      assert.equal(body[0].finished_at, null)
    } finally {
      process.env.HARDCOVER_API_TOKEN = orig
      globalThis.fetch = realFetch
    }
  })

  it('returns empty array when no completed books', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    mockHardcover({ data: { me: [{ user_books: [] }] } })
    try {
      const res = await realFetch(`${baseUrl()}/api/books/completed`)
      assert.equal(res.status, 200)
      const body = await res.json()
      assert.deepEqual(body, [])
    } finally {
      process.env.HARDCOVER_API_TOKEN = orig
      globalThis.fetch = realFetch
    }
  })

  it('returns 502 when Hardcover API returns errors', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    mockHardcover({ errors: [{ message: 'Unauthorized' }] })
    try {
      const res = await realFetch(`${baseUrl()}/api/books/completed`)
      assert.equal(res.status, 502)
    } finally {
      process.env.HARDCOVER_API_TOKEN = orig
      globalThis.fetch = realFetch
    }
  })
})

describe('GET /api/books/shelf', () => {
  it('returns 503 when HARDCOVER_API_TOKEN is not set', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    delete process.env.HARDCOVER_API_TOKEN
    const res = await realFetch(`${baseUrl()}/api/books/shelf`)
    assert.equal(res.status, 503)
    process.env.HARDCOVER_API_TOKEN = orig
  })

  it('returns 200 with correctly shaped shelf book objects', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    mockHardcover({
      data: {
        me: [{
          user_books: [{
            book: {
              title: 'Want To Read Book',
              image: null,
              contributions: [{ author: { name: 'Some Author' } }],
            },
          }],
        }],
      },
    })
    try {
      const res = await realFetch(`${baseUrl()}/api/books/shelf`)
      assert.equal(res.status, 200)
      const body = await res.json() as Record<string, unknown>[]
      assert.equal(body.length, 1)
      assert.equal(body[0].title, 'Want To Read Book')
      assert.equal(body[0].author, 'Some Author')
      assert.equal(body[0].cover_url, null)
      assert.equal(body[0].accent_rgb, null)
    } finally {
      process.env.HARDCOVER_API_TOKEN = orig
      globalThis.fetch = realFetch
    }
  })

  it('returns empty array when shelf is empty', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    mockHardcover({ data: { me: [{ user_books: [] }] } })
    try {
      const res = await realFetch(`${baseUrl()}/api/books/shelf`)
      assert.equal(res.status, 200)
      const body = await res.json()
      assert.deepEqual(body, [])
    } finally {
      process.env.HARDCOVER_API_TOKEN = orig
      globalThis.fetch = realFetch
    }
  })

  it('returns 502 when Hardcover API returns errors', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    mockHardcover({ errors: [{ message: 'Unauthorized' }] })
    try {
      const res = await realFetch(`${baseUrl()}/api/books/shelf`)
      assert.equal(res.status, 502)
    } finally {
      process.env.HARDCOVER_API_TOKEN = orig
      globalThis.fetch = realFetch
    }
  })
})

describe('GET /api/books/journal/:bookId', () => {
  it('returns 503 when HARDCOVER_API_TOKEN is not set', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    delete process.env.HARDCOVER_API_TOKEN
    const res = await realFetch(`${baseUrl()}/api/books/journal/266084`)
    assert.equal(res.status, 503)
    process.env.HARDCOVER_API_TOKEN = orig
  })

  it('returns 400 for a non-numeric book id', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    try {
      const res = await realFetch(`${baseUrl()}/api/books/journal/not-a-number`)
      assert.equal(res.status, 400)
    } finally {
      process.env.HARDCOVER_API_TOKEN = orig
    }
  })

  it('keeps writing + start/finish markers, drops progress/rated, and normalizes positions', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    // One combined payload: getMyUserId reads me[0].id; the journal query reads
    // me[0].user_books + reading_journals from the same mocked response.
    mockHardcover({
      data: {
        me: [{
          id: 85566,
          user_books: [{ rating: 4, review_raw: '  Loved it  ' }],
        }],
        reading_journals: [
          { event: 'user_book_read_started', entry: null, action_at: '2026-05-14T12:00:00+00:00', metadata: { started_at: '2026-05-14' } },
          { event: 'note', entry: 'a thought', action_at: '2026-05-14T13:00:00+00:00', metadata: { position: { type: 'pages', value: 40, percent: 29, possible: 134 } } },
          { event: 'quote', entry: 'a passage', action_at: '2026-05-14T14:00:00+00:00', metadata: { position: { type: 'pages', value: 19, percent: 14, possible: 134 } } },
          { event: 'progress_updated', entry: null, action_at: '2026-05-14T15:00:00+00:00', metadata: { progress: 30 } },
          { event: 'rated', entry: null, action_at: '2026-05-15T20:00:00+00:00', metadata: { rating: '4.0' } },
          { event: 'user_book_read_finished', entry: null, action_at: '2026-05-15T21:00:00+00:00', metadata: { started_at: '2026-05-14', finished_at: '2026-05-15' } },
        ],
      },
    })
    try {
      const res = await realFetch(`${baseUrl()}/api/books/journal/266084`)
      assert.equal(res.status, 200)
      const body = await res.json() as {
        rating: number | null
        review: string | null
        entries: { kind: string; text: string | null; percent: number | null }[]
      }
      assert.equal(body.rating, 4)
      assert.equal(body.review, 'Loved it', 'review_raw should be trimmed')
      assert.deepEqual(body.entries.map((e) => e.kind), ['started', 'note', 'quote', 'finished'], 'progress_updated and rated are dropped')
      const note = body.entries[1]
      assert.equal(note.text, 'a thought')
      assert.equal(note.percent, 29)
      assert.equal('page' in note, false, 'page is no longer included')
    } finally {
      process.env.HARDCOVER_API_TOKEN = orig
      globalThis.fetch = realFetch
    }
  })

  it('returns empty entries and null review/rating when the book has no journal', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    mockHardcover({
      data: {
        me: [{ id: 85566, user_books: [] }],
        reading_journals: [],
      },
    })
    try {
      const res = await realFetch(`${baseUrl()}/api/books/journal/999999`)
      assert.equal(res.status, 200)
      const body = await res.json() as { rating: number | null; review: string | null; entries: unknown[] }
      assert.equal(body.rating, null)
      assert.equal(body.review, null)
      assert.deepEqual(body.entries, [])
    } finally {
      process.env.HARDCOVER_API_TOKEN = orig
      globalThis.fetch = realFetch
    }
  })

  it('returns 502 when Hardcover API returns errors', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    mockHardcover({ errors: [{ message: 'Unauthorized' }] })
    try {
      const res = await realFetch(`${baseUrl()}/api/books/journal/266084`)
      assert.equal(res.status, 502)
    } finally {
      process.env.HARDCOVER_API_TOKEN = orig
      globalThis.fetch = realFetch
    }
  })
})
