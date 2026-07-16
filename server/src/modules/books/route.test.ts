import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { setupTestServer } from '../../shared/test-helpers'
import { clearBooksCache } from './route'

const baseUrl = setupTestServer()
const realFetch = globalThis.fetch

function mockHardcover(payload: unknown) {
  clearBooksCache()
  globalThis.fetch = async (url: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    if (url.toString().includes('hardcover.app')) {
      return { json: async () => payload } as Response
    }
    return realFetch(url, init)
  }
}

function mockApis(hardcoverPayload: unknown, youtubePayload: unknown) {
  clearBooksCache()
  globalThis.fetch = async (url: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const urlStr = url.toString()
    if (urlStr.includes('hardcover.app')) return { json: async () => hardcoverPayload } as Response
    if (urlStr.includes('googleapis.com/youtube')) return { json: async () => youtubePayload } as Response
    return realFetch(url, init)
  }
}

const COMPLETED_BOOK_MOCK = {
  data: {
    me: [{
      user_books: [{
        id: 999,
        user_book_reads: [{ started_at: '2024-01-05', finished_at: '2024-02-12' }],
        book: { id: 42, title: 'Test Book', image: null, contributions: [{ author: { name: 'Test Author' } }] },
      }],
    }],
  },
}

const YOUTUBE_RESULTS_MOCK = {
  items: [{
    id: { videoId: 'abc123' },
    snippet: {
      title: 'Test Book - Full Analysis',
      channelTitle: 'BookTube',
      thumbnails: { medium: { url: 'https://img.youtube.com/vi/abc123/mqdefault.jpg' } },
    },
  }],
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
            user_book_reads: [{ progress_pages: 150, started_at: '2026-07-01' }],
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
      assert.equal(body[0].started_at, '2026-07-01')
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

describe('GET /api/books/screening', () => {
  it('returns 503 when HARDCOVER_API_TOKEN is not set', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    delete process.env.HARDCOVER_API_TOKEN
    const res = await realFetch(`${baseUrl()}/api/books/screening`)
    assert.equal(res.status, 503)
    process.env.HARDCOVER_API_TOKEN = orig
  })

  it('returns 503 when YOUTUBE_API_KEY is not set', async () => {
    const origHc = process.env.HARDCOVER_API_TOKEN
    const origYt = process.env.YOUTUBE_API_KEY
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    delete process.env.YOUTUBE_API_KEY
    try {
      const res = await realFetch(`${baseUrl()}/api/books/screening`)
      assert.equal(res.status, 503)
    } finally {
      process.env.HARDCOVER_API_TOKEN = origHc
      process.env.YOUTUBE_API_KEY = origYt
    }
  })

  it('returns book and videos when both keys are set', async () => {
    const origHc = process.env.HARDCOVER_API_TOKEN
    const origYt = process.env.YOUTUBE_API_KEY
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    process.env.YOUTUBE_API_KEY = 'yt-key'
    mockApis(COMPLETED_BOOK_MOCK, YOUTUBE_RESULTS_MOCK)
    try {
      const res = await realFetch(`${baseUrl()}/api/books/screening`)
      assert.equal(res.status, 200)
      const body = await res.json() as { book: Record<string, unknown>; videos: Record<string, unknown>[] }
      assert.equal(body.book.title, 'Test Book')
      assert.equal(body.book.author, 'Test Author')
      assert.equal(body.videos.length, 1)
      assert.equal(body.videos[0].video_id, 'abc123')
      assert.equal(body.videos[0].channel, 'BookTube')
    } finally {
      process.env.HARDCOVER_API_TOKEN = origHc
      process.env.YOUTUBE_API_KEY = origYt
      globalThis.fetch = realFetch
    }
  })

  it('uses SQLite cache and skips YouTube on second call for same book', async () => {
    const origHc = process.env.HARDCOVER_API_TOKEN
    const origYt = process.env.YOUTUBE_API_KEY
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    process.env.YOUTUBE_API_KEY = 'yt-key'
    mockApis(COMPLETED_BOOK_MOCK, YOUTUBE_RESULTS_MOCK)
    try {
      await realFetch(`${baseUrl()}/api/books/screening`)
      // Now replace YouTube mock with one that would fail if called
      let youtubeCalled = false
      globalThis.fetch = async (url) => {
        if (url.toString().includes('googleapis.com/youtube')) { youtubeCalled = true }
        if (url.toString().includes('hardcover.app')) return { json: async () => COMPLETED_BOOK_MOCK } as Response
        return realFetch(url)
      }
      const res = await realFetch(`${baseUrl()}/api/books/screening`)
      assert.equal(res.status, 200)
      assert.equal(youtubeCalled, false, 'YouTube API should not be called when videos are cached')
    } finally {
      process.env.HARDCOVER_API_TOKEN = origHc
      process.env.YOUTUBE_API_KEY = origYt
      globalThis.fetch = realFetch
    }
  })

  it('returns 404 when all books are excluded', async () => {
    const origHc = process.env.HARDCOVER_API_TOKEN
    const origYt = process.env.YOUTUBE_API_KEY
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    process.env.YOUTUBE_API_KEY = 'yt-key'
    mockApis(COMPLETED_BOOK_MOCK, YOUTUBE_RESULTS_MOCK)
    try {
      const res = await realFetch(`${baseUrl()}/api/books/screening?exclude_book_ids=42`)
      assert.equal(res.status, 404)
    } finally {
      process.env.HARDCOVER_API_TOKEN = origHc
      process.env.YOUTUBE_API_KEY = origYt
      globalThis.fetch = realFetch
    }
  })

  it('filters out dismissed videos from cached results', async () => {
    const origHc = process.env.HARDCOVER_API_TOKEN
    const origYt = process.env.YOUTUBE_API_KEY
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    process.env.YOUTUBE_API_KEY = 'yt-key'
    mockApis(COMPLETED_BOOK_MOCK, YOUTUBE_RESULTS_MOCK)
    try {
      // First call populates cache with abc123
      await realFetch(`${baseUrl()}/api/books/screening`)
      // Dismiss the only video
      await realFetch(`${baseUrl()}/api/books/videos/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: 'abc123' }),
      })
      // Now screening should find no undismissed videos
      const res = await realFetch(`${baseUrl()}/api/books/screening`)
      assert.equal(res.status, 404)
    } finally {
      process.env.HARDCOVER_API_TOKEN = origHc
      process.env.YOUTUBE_API_KEY = origYt
      globalThis.fetch = realFetch
    }
  })

  it('trims reading dates from the book payload', async () => {
    const origHc = process.env.HARDCOVER_API_TOKEN
    const origYt = process.env.YOUTUBE_API_KEY
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    process.env.YOUTUBE_API_KEY = 'yt-key'
    // Fresh book id (77) and video id so prior tests' dismissals don't interfere.
    const freshBook = {
      data: {
        me: [{
          user_books: [{
            user_book_reads: [{ started_at: '2024-03-01', finished_at: '2024-03-20' }],
            book: { id: 77, title: 'Trim Book', image: null, contributions: [{ author: { name: 'Author' } }] },
          }],
        }],
      },
    }
    const freshVideo = { items: [{ id: { videoId: 'trim-vid' }, snippet: { title: 'T', channelTitle: 'C', thumbnails: {} } }] }
    mockApis(freshBook, freshVideo)
    try {
      const res = await realFetch(`${baseUrl()}/api/books/screening`)
      assert.equal(res.status, 200)
      const body = await res.json() as { book: Record<string, unknown> }
      assert.deepEqual(
        Object.keys(body.book).sort(),
        ['accent_rgb', 'author', 'book_id', 'cover_url', 'title'],
        'screening book payload should not leak started_at/finished_at',
      )
    } finally {
      process.env.HARDCOVER_API_TOKEN = origHc
      process.env.YOUTUBE_API_KEY = origYt
      globalThis.fetch = realFetch
    }
  })

  it('skips books with no videos and returns one that has them', async () => {
    const origHc = process.env.HARDCOVER_API_TOKEN
    const origYt = process.env.YOUTUBE_API_KEY
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    process.env.YOUTUBE_API_KEY = 'yt-key'

    const twoBooks = {
      data: {
        me: [{
          user_books: [
            { user_book_reads: [{ started_at: '2024-01-01', finished_at: '2024-01-10' }], book: { id: 101, title: 'Empty Book', image: null, contributions: [] } },
            { user_book_reads: [{ started_at: '2024-02-01', finished_at: '2024-02-10' }], book: { id: 102, title: 'Good Book', image: null, contributions: [{ author: { name: 'Author' } }] } },
          ],
        }],
      },
    }
    // Fresh, undismissed video id for the book that does have results.
    const goodVideo = { items: [{ id: { videoId: 'good-vid' }, snippet: { title: 'Deep dive', channelTitle: 'BookTube', thumbnails: {} } }] }
    // YouTube returns results only for the "Good Book" query; "Empty Book" gets nothing.
    clearBooksCache()
    globalThis.fetch = async (url: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      const urlStr = url.toString()
      if (urlStr.includes('hardcover.app')) return { json: async () => twoBooks } as Response
      if (urlStr.includes('googleapis.com/youtube')) {
        const hasGood = urlStr.includes(encodeURIComponent('"Good Book"'))
        return { json: async () => (hasGood ? goodVideo : { items: [] }) } as Response
      }
      return realFetch(url, init)
    }
    try {
      const res = await realFetch(`${baseUrl()}/api/books/screening`)
      assert.equal(res.status, 200)
      const body = await res.json() as { book: { title: string } }
      assert.equal(body.book.title, 'Good Book', 'should skip the videoless book and return the one with videos')
    } finally {
      process.env.HARDCOVER_API_TOKEN = origHc
      process.env.YOUTUBE_API_KEY = origYt
      globalThis.fetch = realFetch
    }
  })
})

describe('POST /api/books/videos/dismiss', () => {
  it('returns 400 when video_id is missing', async () => {
    const res = await realFetch(`${baseUrl()}/api/books/videos/dismiss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    assert.equal(res.status, 400)
  })

  it('returns 204 and persists the dismissal', async () => {
    const res = await realFetch(`${baseUrl()}/api/books/videos/dismiss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_id: 'test-video-id' }),
    })
    assert.equal(res.status, 204)
  })

  it('is idempotent — dismissing the same video twice does not error', async () => {
    const body = JSON.stringify({ video_id: 'dupe-video' })
    const opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
    await realFetch(`${baseUrl()}/api/books/videos/dismiss`, opts)
    const res = await realFetch(`${baseUrl()}/api/books/videos/dismiss`, opts)
    assert.equal(res.status, 204)
  })
})

// ---- Recommendations ------------------------------------------------------

// Resolve mock maps a title -> a stable, collision-free Hardcover id so tests
// can predict which book a pick resolves to (and thus drive exclusion).
const _idRegistry = new Map<string, number>()
let _nextId = 5000
const idFor = (t: string) => {
  if (!_idRegistry.has(t)) _idRegistry.set(t, _nextId++)
  return _idRegistry.get(t)!
}

// No author, so the resolve query stays title-only and the mock can map a
// title straight back to its deterministic id.
function makePicks(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    title: `Pick ${i + 1}`,
    blurb: `You'd like Pick ${i + 1} because reasons.`,
  }))
}

// `read` and `extra` are [title, id?] tuples. read books are status_id 3
// (the rating signal); extra are want-to-read (status_id 1) for exclusion.
function makeLibrary(read: [string, number?][], extra: [string, number?][] = []) {
  const toUb = (status: number) => ([title, id]: [string, number?]) => ({
    status_id: status,
    rating: status === 3 ? 4 : null,
    review_raw: null,
    book: { id: id ?? idFor(title), title, contributions: [{ author: { name: 'A' } }] },
  })
  return { data: { me: [{ user_books: [...read.map(toUb(3)), ...extra.map(toUb(1))] }] } }
}

const FIVE_READ: [string, number?][] = [['Read A'], ['Read B'], ['Read C'], ['Read D'], ['Read E']]

// Only Hardcover is mocked now — generation happens in a chat session, so the
// picks arrive via the POST /pool body rather than from an API.
function mockRecs(library: unknown) {
  clearBooksCache()
  globalThis.fetch = async (url: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const urlStr = url.toString()
    if (urlStr.includes('hardcover.app')) {
      const query = typeof init?.body === 'string' ? (JSON.parse(init.body) as { query?: string }).query ?? '' : ''
      if (query.includes('search(')) {
        const m = query.match(/query:\s*("(?:[^"\\]|\\.)*")/)
        const title = m ? JSON.parse(m[1]) as string : 'Unknown'
        return { json: async () => ({
          data: { search: { results: { hits: [
            { document: { id: idFor(title), slug: 'a-slug', title, image: null, author_names: ['A'] } },
          ] } } },
        }) } as Response
      }
      return { json: async () => library } as Response
    }
    return realFetch(url, init)
  }
}

function seedPool(n: number, library: unknown) {
  mockRecs(library)
  return realFetch(`${baseUrl()}/api/books/recommendations/pool`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ picks: makePicks(n) }),
  })
}

describe('POST /api/books/recommendations/pool', () => {
  it('returns 503 when HARDCOVER_API_TOKEN is not set', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    delete process.env.HARDCOVER_API_TOKEN
    const res = await realFetch(`${baseUrl()}/api/books/recommendations/pool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ picks: makePicks(3) }),
    })
    assert.equal(res.status, 503)
    process.env.HARDCOVER_API_TOKEN = orig
  })

  it('returns 400 when no valid picks are supplied', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    try {
      const res = await realFetch(`${baseUrl()}/api/books/recommendations/pool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ picks: [{ nope: true }] }),
      })
      assert.equal(res.status, 400)
    } finally {
      process.env.HARDCOVER_API_TOKEN = orig
    }
  })

  it('seeds the pool and opens the first window of 12', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    try {
      const res = await seedPool(30, makeLibrary(FIVE_READ))
      assert.equal(res.status, 200)
      const body = await res.json() as { recommendations: { title: string; hardcover_id: number }[]; pool_remaining: number }
      assert.equal(body.recommendations.length, 12)
      assert.equal(body.recommendations[0].title, 'Pick 1')
      assert.equal(body.pool_remaining, 18)
      assert.ok(body.recommendations.every((r) => r.hardcover_id))
    } finally {
      process.env.HARDCOVER_API_TOKEN = orig
      globalThis.fetch = realFetch
    }
  })

  it('skips a pick already in the library when opening the window', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    try {
      // "Pick 1" is already on the want-to-read shelf (same resolved id).
      const res = await seedPool(30, makeLibrary(FIVE_READ, [['Pick 1', idFor('Pick 1')]]))
      const body = await res.json() as { recommendations: { title: string }[]; pool_remaining: number }
      // The window stays full — the skipped pick is backfilled from the pool.
      assert.equal(body.recommendations.length, 12)
      assert.ok(!body.recommendations.some((r) => r.title === 'Pick 1'))
      // 13 candidates consumed (Pick 1 skipped, Pick 2..13 shown).
      assert.equal(body.pool_remaining, 17)
    } finally {
      process.env.HARDCOVER_API_TOKEN = orig
      globalThis.fetch = realFetch
    }
  })
})

describe('POST /api/books/recommendations/more', () => {
  it('advances to the next window of picks', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    try {
      await seedPool(30, makeLibrary(FIVE_READ))
      const res = await realFetch(`${baseUrl()}/api/books/recommendations/more`, { method: 'POST' })
      const body = await res.json() as { recommendations: { title: string }[]; pool_remaining: number; exhausted: boolean }
      assert.equal(body.recommendations.length, 12)
      assert.equal(body.recommendations[0].title, 'Pick 13')
      assert.equal(body.pool_remaining, 6)
      assert.equal(body.exhausted, false)
    } finally {
      process.env.HARDCOVER_API_TOKEN = orig
      globalThis.fetch = realFetch
    }
  })

  it('reports exhausted and keeps the current window once the pool is spent', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    try {
      await seedPool(12, makeLibrary(FIVE_READ)) // exactly one window
      const res = await realFetch(`${baseUrl()}/api/books/recommendations/more`, { method: 'POST' })
      const body = await res.json() as { recommendations: unknown[]; pool_remaining: number; exhausted: boolean }
      assert.equal(body.exhausted, true)
      assert.equal(body.pool_remaining, 0)
      assert.equal(body.recommendations.length, 12)
    } finally {
      process.env.HARDCOVER_API_TOKEN = orig
      globalThis.fetch = realFetch
    }
  })
})

describe('GET /api/books/recommendations', () => {
  it('filters out picks that have since landed in the library', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    try {
      await seedPool(30, makeLibrary(FIVE_READ)) // window = Pick 1..12

      // Now "Pick 3" is on the shelf — GET should hide it.
      mockRecs(makeLibrary(FIVE_READ, [['Pick 3', idFor('Pick 3')]]))
      const res = await realFetch(`${baseUrl()}/api/books/recommendations`)
      assert.equal(res.status, 200)
      const body = await res.json() as { recommendations: { title: string }[]; pool_remaining: number }
      assert.equal(body.recommendations.length, 11)
      assert.ok(!body.recommendations.some((r) => r.title === 'Pick 3'))
      assert.equal(body.pool_remaining, 18)
    } finally {
      process.env.HARDCOVER_API_TOKEN = orig
      globalThis.fetch = realFetch
    }
  })
})

describe('GET /api/books/recommendations/profile', () => {
  it('returns the read books with ratings', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    mockRecs(makeLibrary(FIVE_READ))
    try {
      const res = await realFetch(`${baseUrl()}/api/books/recommendations/profile`)
      assert.equal(res.status, 200)
      const body = await res.json() as { read: { title: string; rating: number | null }[]; total_read: number }
      assert.equal(body.total_read, 5)
      assert.ok(body.read.every((b) => b.rating === 4))
    } finally {
      process.env.HARDCOVER_API_TOKEN = orig
      globalThis.fetch = realFetch
    }
  })
})

describe('DELETE /api/books/recommendations/:id', () => {
  it('returns 400 for a non-numeric id', async () => {
    const res = await realFetch(`${baseUrl()}/api/books/recommendations/abc`, { method: 'DELETE' })
    assert.equal(res.status, 400)
  })

  it('removes a recommendation from the active window', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    try {
      const seeded = await seedPool(30, makeLibrary(FIVE_READ))
      const { recommendations } = await seeded.json() as { recommendations: { id: number }[] }
      const target = recommendations[0].id

      const del = await realFetch(`${baseUrl()}/api/books/recommendations/${target}`, { method: 'DELETE' })
      assert.equal(del.status, 204)

      mockRecs(makeLibrary(FIVE_READ))
      const after = await realFetch(`${baseUrl()}/api/books/recommendations`)
      const body = await after.json() as { recommendations: { id: number }[] }
      assert.equal(body.recommendations.length, 11)
      assert.ok(!body.recommendations.some((r) => r.id === target))
    } finally {
      process.env.HARDCOVER_API_TOKEN = orig
      globalThis.fetch = realFetch
    }
  })
})

describe('GET /api/books/reading-progress', () => {
  it('returns 503 when HARDCOVER_API_TOKEN is not set', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    delete process.env.HARDCOVER_API_TOKEN
    const res = await realFetch(`${baseUrl()}/api/books/reading-progress`)
    assert.equal(res.status, 503)
    process.env.HARDCOVER_API_TOKEN = orig
  })

  it('returns per-update page deltas and skips pageless or zero-delta events', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    mockHardcover({
      data: {
        me: [{ id: 42 }],
        reading_journals: [
          {
            book_id: 1,
            action_at: '2026-07-15T16:30:00+00:00',
            metadata: { progress_pages: 109, progress_pages_was: 99 },
            book: { title: 'East of Eden' },
          },
          {
            book_id: 1,
            action_at: '2026-07-16T18:17:00+00:00',
            metadata: { progress_pages: 131, progress_pages_was: 109 },
            book: { title: 'East of Eden' },
          },
          // percent-only update (audiobook / no pages) → skipped
          {
            book_id: 2,
            action_at: '2026-07-16T19:00:00+00:00',
            metadata: { progress_pages: null, progress_pages_was: null },
            book: { title: 'Some Audiobook' },
          },
          // no movement → skipped
          {
            book_id: 1,
            action_at: '2026-07-16T20:00:00+00:00',
            metadata: { progress_pages: 131, progress_pages_was: 131 },
            book: { title: 'East of Eden' },
          },
        ],
      },
    })
    try {
      const res = await realFetch(`${baseUrl()}/api/books/reading-progress`)
      assert.equal(res.status, 200)
      const body = await res.json() as Record<string, unknown>[]
      assert.equal(body.length, 2)
      assert.deepEqual(body[0], {
        book_id: 1, title: 'East of Eden', at: '2026-07-15T16:30:00+00:00', pages_read: 10, progress_pages: 109,
      })
      assert.equal(body[1].pages_read, 22)
    } finally {
      process.env.HARDCOVER_API_TOKEN = orig
      globalThis.fetch = realFetch
    }
  })

  it('treats a missing progress_pages_was as starting from zero', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    process.env.HARDCOVER_API_TOKEN = 'test-token'
    mockHardcover({
      data: {
        me: [{ id: 42 }],
        reading_journals: [{
          book_id: 3,
          action_at: '2026-07-10T12:00:00+00:00',
          metadata: { progress_pages: 40 },
          book: { title: 'Fresh Start' },
        }],
      },
    })
    try {
      const res = await realFetch(`${baseUrl()}/api/books/reading-progress`)
      const body = await res.json() as Record<string, unknown>[]
      assert.equal(body[0].pages_read, 40)
    } finally {
      process.env.HARDCOVER_API_TOKEN = orig
      globalThis.fetch = realFetch
    }
  })
})
