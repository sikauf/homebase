import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BooksPage from '../modules/books/BooksPage'

const MOCK_BOOKS = [
  {
    title: 'Iron Gold',
    author: 'Pierce Brown',
    pages: 624,
    progress_pages: 220,
    cover_url: 'https://example.com/iron-gold.jpg',
    accent_rgb: '233,124,22',
  },
  {
    title: 'Demon Copperhead',
    author: 'Barbara Kingsolver',
    pages: 560,
    progress_pages: null,
    cover_url: 'https://example.com/demon-copperhead.jpg',
    accent_rgb: '72,130,180',
  },
]

function mockFetch(data: unknown, ok = true) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 503,
    text: () => Promise.resolve(JSON.stringify(data)),
  }))
}

beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
afterEach(() => vi.unstubAllGlobals())

describe('BooksPage', () => {
  it('renders the Currently Reading header', async () => {
    mockFetch(MOCK_BOOKS)
    render(<BooksPage />)
    expect(screen.getByText('Currently Reading')).toBeInTheDocument()
  })

  it('shows skeleton cards while loading', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {}))) // never resolves
    render(<BooksPage />)
    // Two skeleton cards should be present (animated pulse divs)
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders a card for each book', async () => {
    mockFetch(MOCK_BOOKS)
    render(<BooksPage />)
    await waitFor(() => expect(screen.getByText('Iron Gold')).toBeInTheDocument())
    expect(screen.getByText('Demon Copperhead')).toBeInTheDocument()
  })

  it('renders author names', async () => {
    mockFetch(MOCK_BOOKS)
    render(<BooksPage />)
    await waitFor(() => expect(screen.getByText('Pierce Brown')).toBeInTheDocument())
    expect(screen.getByText('Barbara Kingsolver')).toBeInTheDocument()
  })

  it('shows progress text for books with progress', async () => {
    mockFetch(MOCK_BOOKS)
    render(<BooksPage />)
    await waitFor(() => expect(screen.getByText('p. 220 · 624 pp')).toBeInTheDocument())
  })

  it('shows total pages for books with no progress', async () => {
    mockFetch(MOCK_BOOKS)
    render(<BooksPage />)
    await waitFor(() => expect(screen.getByText('560 pp')).toBeInTheDocument())
  })

  it('shows empty state when no books are returned', async () => {
    mockFetch([])
    render(<BooksPage />)
    await waitFor(() => expect(screen.getByText('Nothing currently reading.')).toBeInTheDocument())
  })

  it('shows error message on failed fetch', async () => {
    mockFetch({ error: 'HARDCOVER_API_TOKEN not configured' }, false)
    render(<BooksPage />)
    await waitFor(() => expect(screen.getByText('HARDCOVER_API_TOKEN not configured')).toBeInTheDocument())
  })
})

describe('BookCard hover behaviour', () => {
  it('card wrapper does not use transition: all', async () => {
    mockFetch(MOCK_BOOKS)
    render(<BooksPage />)
    await waitFor(() => screen.getByText('Iron Gold'))

    const card = screen.getByText('Iron Gold').closest('[style*="transition"]') as HTMLElement
    expect(card?.style.transition).not.toContain('all')
    expect(card?.style.transition).toContain('transform')
  })

  it('backdrop image has no transition style', async () => {
    mockFetch(MOCK_BOOKS)
    render(<BooksPage />)
    await waitFor(() => screen.getByText('Iron Gold'))

    // The backdrop img is aria-hidden; the sharp cover img has alt text
    const backdropImgs = document.querySelectorAll('img[aria-hidden="true"]')
    backdropImgs.forEach((img) => {
      expect((img as HTMLElement).style.transition ?? '').toBe('')
    })
  })

  it('sharp cover img transitions only filter', async () => {
    mockFetch(MOCK_BOOKS)
    render(<BooksPage />)
    await waitFor(() => screen.getByText('Iron Gold'))

    const coverImgs = document.querySelectorAll('img[alt="Iron Gold"], img[alt="Demon Copperhead"]')
    coverImgs.forEach((img) => {
      const t = (img as HTMLElement).style.transition
      expect(t).toContain('filter')
      expect(t).not.toContain('all')
    })
  })

  it('lifts card on hover', async () => {
    mockFetch(MOCK_BOOKS)
    render(<BooksPage />)
    await waitFor(() => screen.getByText('Iron Gold'))

    const card = screen.getByText('Iron Gold').closest('.rounded-xl') as HTMLElement
    expect(card.style.transform).toBe('translateY(0)')
    fireEvent.mouseEnter(card)
    expect(card.style.transform).toBe('translateY(-6px)')
    fireEvent.mouseLeave(card)
    expect(card.style.transform).toBe('translateY(0)')
  })
})

describe('BookCard bookmark', () => {
  it('renders a bookmark ribbon for books with progress', async () => {
    mockFetch(MOCK_BOOKS)
    render(<BooksPage />)
    await waitFor(() => screen.getByText('Iron Gold'))

    // Iron Gold has progress — ribbon should have a non-trivial height %
    const ironGoldCard = screen.getByText('Iron Gold').closest('a') as HTMLElement
    const ribbons = ironGoldCard.querySelectorAll('[style*="polygon"]')
    expect(ribbons.length).toBeGreaterThan(0)
  })

  it('renders tassel strings for books with progress', async () => {
    mockFetch(MOCK_BOOKS)
    render(<BooksPage />)
    await waitFor(() => screen.getByText('Iron Gold'))

    const ironGoldCard = screen.getByText('Iron Gold').closest('a') as HTMLElement
    // Strings are 1.5px wide divs inside the bookmark container — there are 5
    const strings = Array.from(ironGoldCard.querySelectorAll('div')).filter(
      (el) => el.style.width === '1.5px'
    )
    expect(strings.length).toBe(5)
  })

  it('does not render tassel strings for books without progress', async () => {
    mockFetch(MOCK_BOOKS)
    render(<BooksPage />)
    await waitFor(() => screen.getByText('Demon Copperhead'))

    const demonCard = screen.getByText('Demon Copperhead').closest('a') as HTMLElement
    const strings = Array.from(demonCard.querySelectorAll('div')).filter(
      (el) => el.style.width === '1.5px'
    )
    expect(strings.length).toBe(0)
  })

  it('bookmark hole punch is only shown for books with progress', async () => {
    mockFetch(MOCK_BOOKS)
    render(<BooksPage />)
    await waitFor(() => screen.getByText('Iron Gold'))

    const ironGoldCard = screen.getByText('Iron Gold').closest('a') as HTMLElement
    const holes = Array.from(ironGoldCard.querySelectorAll('div')).filter(
      (el) => el.style.borderRadius === '50%'
    )
    expect(holes.length).toBeGreaterThan(0)

    const demonCard = screen.getByText('Demon Copperhead').closest('a') as HTMLElement
    const demonHoles = Array.from(demonCard.querySelectorAll('div')).filter(
      (el) => el.style.borderRadius === '50%'
    )
    expect(demonHoles.length).toBe(0)
  })
})

describe('BookCard links', () => {
  it('each card links to the Hardcover journal URL in a new tab', async () => {
    mockFetch(MOCK_BOOKS)
    render(<BooksPage />)
    await waitFor(() => screen.getByText('Iron Gold'))

    const ironGoldLink = screen.getByText('Iron Gold').closest('a') as HTMLAnchorElement
    expect(ironGoldLink.href).toBe('https://hardcover.app/books/iron-gold/journals/@sikauf')
    expect(ironGoldLink.target).toBe('_blank')
    expect(ironGoldLink.rel).toContain('noopener')
  })

  it('slugifies titles with apostrophes correctly', async () => {
    mockFetch([{
      title: "Carl's Doomsday Scenario",
      author: 'Matt Dinniman',
      pages: 385,
      progress_pages: null,
      cover_url: null,
      accent_rgb: null,
    }])
    render(<BooksPage />)
    await waitFor(() => screen.getByText("Carl's Doomsday Scenario"))

    const link = screen.getByText("Carl's Doomsday Scenario").closest('a') as HTMLAnchorElement
    expect(link.href).toBe('https://hardcover.app/books/carls-doomsday-scenario/journals/@sikauf')
  })
})
