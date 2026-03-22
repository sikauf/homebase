import { useEffect, useState } from 'react'

interface Book {
  title: string
  author: string | null
  pages: number
  progress_pages: number | null
  cover_url: string | null
  accent_rgb: string | null
}

// Fallback palette if server couldn't extract a color
const FALLBACK_RGBS = ['251,191,36', '45,212,191', '167,139,250', '251,146,60']

function toHardcoverSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function fetchJSON<T>(url: string): Promise<T> {
  const r = await fetch(url)
  const text = await r.text()
  const json = JSON.parse(text)
  if (!r.ok) throw new Error(json.error ?? `Server error ${r.status}`)
  return json as T
}

function SkeletonCard() {
  return (
    <div
      className="rounded-xl overflow-hidden animate-pulse flex flex-col"
      style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div className="flex-1 bg-white/5" />
      <div className="h-28 bg-white/[0.03]" />
    </div>
  )
}

function BookCard({ book, index, hovered, onHover }: {
  book: Book
  index: number
  hovered: boolean
  onHover: (v: boolean) => void
}) {
  const rgb = book.accent_rgb ?? FALLBACK_RGBS[index % FALLBACK_RGBS.length]
  const slot = { rgb }
  const pct = book.progress_pages != null && book.pages > 0
    ? Math.min((book.progress_pages / book.pages) * 100, 100)
    : null

  const href = `https://hardcover.app/books/${toHardcoverSlug(book.title)}/journals/@sikauf`

  const STRINGS = [
    { h: 13, o: 0.55, x: 5  },
    { h: 18, o: 0.90, x: 9  },
    { h: 15, o: 0.75, x: 13 },
    { h: 11, o: 0.60, x: 17 },
    { h: 16, o: 0.80, x: 21 },
  ]

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="relative rounded-xl overflow-hidden flex flex-col cursor-pointer select-none"
      style={{
        background: '#1a1a1a',
        border: `1px solid ${hovered ? `rgba(${slot.rgb},0.45)` : 'rgba(255,255,255,0.04)'}`,
        boxShadow: hovered
          ? `0 12px 40px rgba(${slot.rgb},0.3), 0 0 0 1px rgba(${slot.rgb},0.1)`
          : '0 2px 16px rgba(0,0,0,0.6)',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
        textDecoration: 'none',
      }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {/* Bookmark ribbon — hangs freely from the top-right */}
      <div
        className="absolute top-0 bottom-0 pointer-events-none"
        style={{ right: '16px', width: '26px', zIndex: 10 }}
      >
        {/* Tassel strings — sit at top edge, read as threading in from above */}
        {pct != null && STRINGS.map(({ h, o, x }, i) => (
          <div
            key={i}
            className="absolute top-0"
            style={{
              left: `${x}px`,
              width: '1.5px',
              height: `${h}px`,
              background: `rgba(${slot.rgb},${o})`,
              borderRadius: '0 0 1px 1px',
              zIndex: 12,
            }}
          />
        ))}

        {/* Ribbon body */}
        <div
          className="absolute top-0 left-0 right-0"
          style={{
            height: pct != null ? `${pct}%` : '13%',
            minHeight: '28px',
            background: pct != null ? `rgba(${slot.rgb},0.93)` : 'rgba(255,255,255,0.07)',
            clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 16px), 50% 100%, 0 calc(100% - 16px))',
            boxShadow: pct != null
              ? `0 8px 24px rgba(${slot.rgb},0.5), inset -1px 0 0 rgba(255,255,255,0.15), inset 1px 0 0 rgba(255,255,255,0.08)`
              : 'none',
            transition: 'box-shadow 0.18s ease',
          }}
        />
        {/* Hole punch near top — classic bookmark detail */}
        {pct != null && (
          <div
            className="absolute"
            style={{
              top: '9px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.4)',
              zIndex: 13,
            }}
          />
        )}
      </div>

      {/* Cover art */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        {book.cover_url ? (
          <>
            {/* Blurred backdrop — no transition, static */}
            <img
              src={book.cover_url}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              style={{
                filter: 'blur(18px) brightness(0.28) saturate(0.7)',
                transform: 'scale(1.15)',
              }}
            />
            {/* Sharp full cover — bookmark overlays naturally via z-index */}
            <img
              src={book.cover_url}
              alt={book.title}
              className="absolute inset-0 w-full h-full object-contain"
              style={{
                filter: hovered ? 'brightness(1.05)' : 'brightness(0.92)',
                transition: 'filter 0.18s ease',
                padding: '12px 12px 0',
              }}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-6xl" style={{ background: '#111' }}>
            📖
          </div>
        )}

        {/* Colored bloom on hover */}
        <div
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 50% 100%, rgba(${slot.rgb},0.2), transparent 70%)`,
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.18s ease',
          }}
        />

        {/* Bottom fade into panel */}
        <div
          className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, #111)' }}
        />
      </div>

      {/* Info panel */}
      <div
        className="shrink-0 relative flex flex-col gap-2"
        style={{ background: '#111', padding: '14px 42px 16px 14px' }}
      >
        {/* Colored tint on hover */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `rgba(${slot.rgb},0.06)`,
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />

        {/* Title */}
        <p
          className="text-white leading-snug relative"
          style={{ fontFamily: "'Kreon', serif", fontWeight: 700, fontSize: '1.15rem' }}
        >
          {book.title}
        </p>

        {/* Author + page count */}
        <div className="relative flex flex-col gap-1">
          {book.author && (
            <p className="text-sm truncate" style={{ color: `rgba(${slot.rgb},0.8)` }}>
              {book.author}
            </p>
          )}
          <p
            className="tracking-widest uppercase"
            style={{
              fontSize: '9px',
              letterSpacing: '0.14em',
              fontFamily: "'Kreon', serif",
              color: pct != null ? `rgba(${slot.rgb},0.5)` : 'rgba(255,255,255,0.2)',
            }}
          >
            {book.progress_pages != null
              ? `p. ${book.progress_pages} · ${book.pages} pp`
              : `${book.pages} pp`}
          </p>
        </div>
      </div>
    </a>
  )
}

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  useEffect(() => {
    fetchJSON<Book[]>('/api/books/currently-reading')
      .then((data) => { setBooks(data); setError(null) })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const cols = loading ? 2 : Math.max(books.length, 1)

  return (
    <div className="flex-1 flex p-5" style={{ background: '#0c0c0c' }}>
      <div className="flex-1 rounded-2xl overflow-hidden flex flex-col" style={{ background: '#0c0c0c' }}>

        {/* Header — same ornament as STS2 */}
        <div className="px-7 pt-8 pb-7 shrink-0">
          <div className="flex items-center gap-5">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.12))' }} />
            <div className="text-center">
              <h2 className="text-2xl font-black tracking-[.35em] uppercase text-white">
                Currently Reading
              </h2>
              <div className="flex items-center justify-center gap-2 mt-2">
                <div className="h-px w-10" style={{ background: 'rgba(255,255,255,0.15)' }} />
                <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.35)' }} />
                <div className="h-px w-4" style={{ background: 'rgba(255,255,255,0.1)' }} />
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.5)' }} />
                <div className="h-px w-4" style={{ background: 'rgba(255,255,255,0.1)' }} />
                <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.35)' }} />
                <div className="h-px w-10" style={{ background: 'rgba(255,255,255,0.15)' }} />
              </div>
            </div>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, rgba(255,255,255,0.12))' }} />
          </div>
        </div>

        {/* Card grid */}
        <div
          className="flex-1 px-5 pb-5 grid gap-3 min-h-0"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {loading && [0, 1].map((i) => <SkeletonCard key={i} />)}

          {error && (
            <div className="col-span-full flex items-center justify-center">
              <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>
            </div>
          )}

          {!loading && !error && books.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center">
              <p className="text-4xl mb-3">📚</p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Nothing currently reading.</p>
            </div>
          )}

          {!loading && !error && books.map((book, i) => (
            <BookCard
              key={book.title}
              book={book}
              index={i}
              hovered={hoveredIndex === i}
              onHover={(v) => setHoveredIndex(v ? i : null)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
