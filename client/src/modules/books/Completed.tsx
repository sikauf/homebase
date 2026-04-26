import { useEffect, useState } from 'react'
import { FALLBACK_RGBS, toHardcoverSlug, fetchJSON } from './shared'

interface CompletedBook {
  title: string
  author: string | null
  cover_url: string | null
  accent_rgb: string | null
  started_at: string | null
  finished_at: string | null
}

function formatDateRange(started_at: string | null, finished_at: string | null): string | null {
  if (!finished_at) return null
  const fmt = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  if (started_at) {
    const s = new Date(started_at)
    const f = new Date(finished_at)
    if (s.getFullYear() === f.getFullYear()) {
      const startStr = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return `${startStr} – ${fmt(finished_at)}`
    }
    return `${fmt(started_at)} – ${fmt(finished_at)}`
  }
  return fmt(finished_at)
}

function SkeletonCard() {
  return (
    <div
      className="rounded-xl overflow-hidden animate-pulse"
      style={{
        background: '#1a1a1a',
        border: '1px solid rgba(255,255,255,0.04)',
        aspectRatio: '2/3',
      }}
    />
  )
}

function CompletedBookCard({ book, index, hovered, onHover }: {
  book: CompletedBook
  index: number
  hovered: boolean
  onHover: (v: boolean) => void
}) {
  const rgb = book.accent_rgb ?? FALLBACK_RGBS[index % FALLBACK_RGBS.length]
  const dateRange = formatDateRange(book.started_at, book.finished_at)
  const href = `https://hardcover.app/books/${toHardcoverSlug(book.title)}/journals/@sikauf`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="relative rounded-xl overflow-hidden flex flex-col cursor-pointer select-none"
      style={{
        aspectRatio: '2/3',
        background: '#0e0e0f',
        border: `1px solid ${hovered ? `rgba(160,165,185,0.35)` : 'rgba(255,255,255,0.05)'}`,
        boxShadow: hovered
          ? `0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(160,165,185,0.12), 0 4px 20px rgba(${rgb},0.2)`
          : '0 4px 20px rgba(0,0,0,0.7)',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
        textDecoration: 'none',
      }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {/* Cover — fills the whole card */}
      <div className="absolute inset-0">
        <div className="absolute inset-0" style={{ background: '#0e0e0f' }} />

        {/* Cool overhead bloom — diffuse silver-white instead of amber */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 110% 65% at 50% -8%, rgba(200,210,230,0.07) 0%, rgba(150,160,180,0.03) 45%, transparent 72%)',
          }}
        />

        {/* Wood grain */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: [
              'repeating-linear-gradient(104deg, transparent 0px, transparent 5px, rgba(255,255,255,0.012) 5px, rgba(255,255,255,0.012) 6px)',
              'repeating-linear-gradient(104deg, transparent 0px, transparent 11px, rgba(0,0,0,0.06) 11px, rgba(0,0,0,0.06) 12px)',
            ].join(', '),
          }}
        />

        {/* Cover-color side-light */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 18% 70%, rgba(${rgb},0.13) 0%, transparent 55%)`,
          }}
        />

        {/* Vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 85% 85% at 50% 35%, transparent 40%, rgba(0,0,0,0.65) 100%)',
          }}
        />

        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="absolute inset-0 w-full h-full object-contain"
            style={{
              filter: hovered
                ? 'brightness(1.08) drop-shadow(0 8px 20px rgba(0,0,0,0.7))'
                : 'brightness(0.95) drop-shadow(0 6px 16px rgba(0,0,0,0.8))',
              transition: 'filter 0.2s ease',
              padding: '14px 14px 80px',
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-6xl pb-20">
            📖
          </div>
        )}

        {/* Cool hover flare */}
        <div
          className="absolute top-0 left-0 right-0 h-28 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(180,190,210,0.05), transparent 70%)',
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        />

        {/* Bottom fade into info panel */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: '90px',
            background: 'linear-gradient(to bottom, transparent, #0c0c0e 70%)',
          }}
        />
      </div>

      {/* Info panel — sits at the bottom over the cover */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-1" style={{ padding: '0 14px 14px' }}>
        <p
          className="text-white leading-snug"
          style={{ fontFamily: "'Kreon', serif", fontWeight: 700, fontSize: '0.95rem' }}
        >
          {book.title}
        </p>

        {book.author && (
          <p className="text-xs truncate" style={{ color: `rgba(${rgb},0.8)` }}>
            {book.author}
          </p>
        )}

        {dateRange && (
          <p
            className="text-xs mt-0.5"
            style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Kreon', serif" }}
          >
            {dateRange}
          </p>
        )}
      </div>
    </a>
  )
}

export default function Completed() {
  const [books, setBooks] = useState<CompletedBook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  useEffect(() => {
    fetchJSON<CompletedBook[]>('/api/books/completed')
      .then((data) => { setBooks(data); setError(null) })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex-1 flex p-5 min-h-0 overflow-y-auto" style={{ background: '#0c0c0c' }}>
      <div className="flex-1 flex flex-col" style={{ background: '#0c0c0c' }}>

        {/* Header */}
        <div className="px-7 pt-8 pb-7 shrink-0">
          <div className="flex items-center gap-5">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.12))' }} />
            <div className="text-center">
              <h2 className="text-2xl font-black tracking-[.35em] uppercase text-white">
                Archive
              </h2>
              {books.length > 0 && (
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Kreon', serif", letterSpacing: '0.1em' }}>
                  {books.length} {books.length === 1 ? 'book' : 'books'}
                </p>
              )}
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

        {/* Loading skeletons */}
        {loading && (
          <div className="px-5 pb-5 grid gap-4" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
            {Array.from({ length: 8 }, (_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>
          </div>
        )}

        {!loading && !error && books.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-4xl mb-3">📚</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>The archive is empty.</p>
          </div>
        )}

        {/* Year sections */}
        {!loading && !error && (() => {
          const byYear = new Map<string, { book: CompletedBook; globalIndex: number }[]>()
          books.forEach((book, i) => {
            const year = book.finished_at ? new Date(book.finished_at).getFullYear().toString() : 'Unknown'
            if (!byYear.has(year)) byYear.set(year, [])
            byYear.get(year)!.push({ book, globalIndex: i })
          })
          return Array.from(byYear.entries()).map(([year, entries]) => (
            <div key={year} className="px-5 pb-8">
              <p
                className="mb-4 text-sm font-semibold tracking-widest uppercase"
                style={{ color: 'rgba(210,180,140,0.5)' }}
              >
                {year}
              </p>
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                {entries.map(({ book, globalIndex }) => (
                  <CompletedBookCard
                    key={book.title}
                    book={book}
                    index={globalIndex}
                    hovered={hoveredIndex === globalIndex}
                    onHover={(v) => setHoveredIndex(v ? globalIndex : null)}
                  />
                ))}
              </div>
            </div>
          ))
        })()}
      </div>
    </div>
  )
}
