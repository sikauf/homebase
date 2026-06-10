import { useCallback, useEffect, useMemo, useState } from 'react'
import { toHardcoverSlug, fetchJSON } from './shared'

export interface JournalBook {
  book_id: number
  title: string
  author: string | null
  cover_url: string | null
  accent_rgb: string | null
}

interface JournalEntry {
  kind: 'note' | 'quote' | 'started' | 'finished'
  text: string | null
  percent: number | null
  date: string
}

interface JournalData {
  rating: number | null
  review: string | null
  entries: JournalEntry[]
}

// Warm parchment palette — a deliberate, self-contained light surface (the open
// book) that sits over the dark grid. Ink is a warm near-black for readability.
const PAGE = 'radial-gradient(ellipse 120% 90% at 50% 0%, #f7f1e3 0%, #f1e9d6 60%, #ebe1cb 100%)'
const INK = '#3a322a'
const INK_MUTED = 'rgba(58,50,42,0.55)'
const INK_FAINT = 'rgba(58,50,42,0.34)'
const RULE = 'rgba(58,50,42,0.16)'
const SEPIA = 'rgba(120,92,54,0.32)'
const GOLD = '#c0892c'

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  })
}

function Stars({ rating }: { rating: number }) {
  const pct = Math.max(0, Math.min(rating / 5, 1)) * 100
  return (
    <span className="relative inline-block leading-none" style={{ fontSize: '1.05rem', letterSpacing: '2px' }}>
      <span style={{ color: 'rgba(58,50,42,0.18)' }}>★★★★★</span>
      <span
        className="absolute top-0 left-0 overflow-hidden whitespace-nowrap"
        style={{ width: `${pct}%`, color: GOLD }}
      >
        ★★★★★
      </span>
    </span>
  )
}

function Marker({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="h-px flex-1" style={{ background: RULE }} />
      <span
        className="uppercase shrink-0"
        style={{ fontFamily: "'Kreon', serif", fontSize: '0.7rem', letterSpacing: '0.14em', color: INK_MUTED }}
      >
        {label}
      </span>
      <div className="h-px flex-1" style={{ background: RULE }} />
    </div>
  )
}

function PositionMeta({ percent, date }: { percent: number | null; date: string }) {
  return (
    <div className="flex items-baseline justify-between mb-1.5">
      <span style={{ fontFamily: "'Kreon', serif", fontSize: '0.78rem', fontWeight: 600, color: INK_MUTED }}>
        {percent != null ? `${Math.round(percent)}%` : ''}
      </span>
      <span style={{ fontFamily: "'Kreon', serif", fontSize: '0.78rem', color: INK_MUTED }}>{fmtDate(date)}</span>
    </div>
  )
}

function Entry({ entry }: { entry: JournalEntry }) {
  if (entry.kind === 'started') return <Marker label={`Began reading · ${fmtDate(entry.date)}`} />
  if (entry.kind === 'finished') return <Marker label={`Finished · ${fmtDate(entry.date)}`} />

  if (entry.kind === 'quote') {
    return (
      <div className="relative pl-7 py-3" style={{ borderBottom: `1px solid ${RULE}` }}>
        <span
          className="absolute select-none"
          style={{ left: '-2px', top: '2px', fontFamily: 'Georgia, serif', fontSize: '2.4rem', lineHeight: 1, color: SEPIA }}
        >
          “
        </span>
        <PositionMeta percent={entry.percent} date={entry.date} />
        <p
          className="italic"
          style={{ fontFamily: "'Kreon', serif", fontSize: '1.02rem', lineHeight: 1.6, color: INK, whiteSpace: 'pre-wrap' }}
        >
          {entry.text}
        </p>
      </div>
    )
  }

  // note
  return (
    <div className="py-3" style={{ borderBottom: `1px solid ${RULE}` }}>
      <PositionMeta percent={entry.percent} date={entry.date} />
      <p
        style={{ fontFamily: "'Kreon', serif", fontSize: '1.02rem', lineHeight: 1.6, color: INK, whiteSpace: 'pre-wrap' }}
      >
        {entry.text}
      </p>
    </div>
  )
}

export default function JournalModal({ book, onClose }: { book: JournalBook; onClose: () => void }) {
  const [data, setData] = useState<JournalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [entered, setEntered] = useState(false)
  const [closing, setClosing] = useState(false)
  const [newestFirst, setNewestFirst] = useState(false)

  const close = useCallback(() => {
    setClosing(true)
    setTimeout(onClose, 220)
  }, [onClose])

  // Entrance: flip `open` on after mount so CSS transitions run, then mark the
  // animation done so we can drop the 3D layer (keeps scrolling smooth).
  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true))
    const t = setTimeout(() => setEntered(true), 650)
    return () => { cancelAnimationFrame(id); clearTimeout(t) }
  }, [])

  // Esc to close + lock background scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [close])

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null); setData(null)
    fetchJSON<JournalData>(`/api/books/journal/${book.book_id}`)
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e: Error) => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [book.book_id])

  const entries = useMemo(() => {
    const list = data?.entries ?? []
    return newestFirst ? [...list].reverse() : list
  }, [data, newestFirst])

  const isEmpty = !loading && !error && (data?.entries?.length ?? 0) === 0 && !data?.review
  const visible = open && !closing
  const hardcoverUrl = `https://hardcover.app/books/${toHardcoverSlug(book.title)}/journals/@sikauf`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      onClick={close}
      style={{ perspective: '2200px' }}
    >
      {/* Backdrop — a fixed gradient we fade via opacity only (cheap to composite,
          unlike backdrop-filter blur, which would re-rasterize the whole grid each frame). */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(40,32,20,0.62), rgba(0,0,0,0.84))',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s ease',
          willChange: 'opacity',
        }}
      />

      {/* Close affordance */}
      <button
        onClick={close}
        aria-label="Close"
        className="absolute top-5 right-6 z-10 flex items-center justify-center rounded-full"
        style={{
          width: 36, height: 36, color: 'rgba(255,255,255,0.6)',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
          fontSize: '1.1rem', opacity: visible ? 1 : 0, transition: 'opacity 0.3s ease',
        }}
      >
        ✕
      </button>

      {/* The book */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full overflow-hidden rounded-r-lg rounded-l-md"
        style={{
          maxWidth: 940,
          height: 'min(86vh, 660px)',
          background: PAGE,
          boxShadow: '0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.3)',
          transformOrigin: 'center center',
          transform: visible ? 'scale(1)' : 'scale(0.94)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.4s cubic-bezier(0.2,0.8,0.2,1), opacity 0.35s ease',
          willChange: entered ? 'auto' : 'transform, opacity',
        }}
      >
        {/* Paper grain */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: [
              'repeating-linear-gradient(96deg, transparent 0 3px, rgba(120,90,50,0.018) 3px 4px)',
              'repeating-linear-gradient(2deg, transparent 0 7px, rgba(120,90,50,0.012) 7px 8px)',
            ].join(', '),
          }}
        />

        {/* ---- Left page: frontispiece ---- */}
        <div
          className="relative shrink-0 flex flex-col items-center text-center px-6 py-8"
          style={{ width: '37%', minWidth: 240 }}
        >
          {/* gutter shadow on the inner (right) edge */}
          <div
            className="absolute top-0 bottom-0 right-0 pointer-events-none"
            style={{ width: 48, background: 'linear-gradient(to right, transparent, rgba(60,40,20,0.16))' }}
          />

          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt={book.title}
              className="object-contain"
              style={{ maxHeight: 230, width: 'auto', maxWidth: '78%', boxShadow: '0 14px 34px rgba(60,40,20,0.4)', borderRadius: 3 }}
            />
          ) : (
            <div className="flex items-center justify-center text-6xl" style={{ height: 230 }}>📖</div>
          )}

          <h2 className="mt-6" style={{ fontFamily: "'Kreon', serif", fontWeight: 700, fontSize: '1.4rem', lineHeight: 1.2, color: INK }}>
            {book.title}
          </h2>
          {book.author && (
            <p className="mt-1 italic" style={{ fontFamily: "'Kreon', serif", fontSize: '0.95rem', color: INK_MUTED }}>
              {book.author}
            </p>
          )}

          {data?.rating != null && (
            <div className="mt-3"><Stars rating={data.rating} /></div>
          )}

          <div className="flex-1" />

          <a
            href={hardcoverUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 transition-transform hover:-translate-y-0.5 hover:brightness-110"
            style={{
              fontFamily: "'Kreon', serif", fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.02em',
              color: '#f5efe1', background: INK, boxShadow: '0 6px 18px rgba(40,30,15,0.35)',
            }}
          >
            Open in Hardcover <span aria-hidden style={{ fontSize: '1.05em' }}>↗</span>
          </a>
        </div>

        {/* spine */}
        <div className="shrink-0" style={{ width: 2, background: 'linear-gradient(to bottom, rgba(60,40,20,0.05), rgba(60,40,20,0.28), rgba(60,40,20,0.05))' }} />

        {/* ---- Right page: the journal ---- */}
        <div
          className="relative flex-1 flex flex-col min-w-0"
          style={{
            transformOrigin: 'left center',
            // Once the open animation is done, drop the rotateY entirely so the
            // scroll container isn't stuck in an expensive 3D rendering layer.
            transform: entered ? 'none' : visible ? 'rotateY(0deg)' : 'rotateY(-32deg)',
            opacity: visible ? 1 : 0,
            transition: 'transform 0.55s cubic-bezier(0.2,0.75,0.25,1) 0.05s, opacity 0.4s ease 0.05s',
            willChange: entered ? 'auto' : 'transform, opacity',
          }}
        >
          {/* gutter shadow on the inner (left) edge */}
          <div
            className="absolute top-0 bottom-0 left-0 pointer-events-none z-10"
            style={{ width: 56, background: 'linear-gradient(to left, transparent, rgba(60,40,20,0.18))' }}
          />

          {/* header */}
          <div className="flex items-center justify-between px-8 pt-8 pb-3 shrink-0">
            <span className="uppercase" style={{ fontFamily: "'Kreon', serif", fontSize: '0.72rem', letterSpacing: '0.32em', color: INK_MUTED }}>
              Journal
            </span>
            {(data?.entries?.length ?? 0) > 0 && (
              <button
                onClick={() => setNewestFirst((v) => !v)}
                className="uppercase transition-opacity hover:opacity-100"
                style={{ fontFamily: "'Kreon', serif", fontSize: '0.64rem', letterSpacing: '0.12em', color: INK_FAINT, opacity: 0.8 }}
              >
                {newestFirst ? 'Newest first' : 'Oldest first'} ⇅
              </button>
            )}
          </div>
          <div className="mx-8 h-px shrink-0" style={{ background: RULE }} />

          {/* body */}
          <div className="flex-1 overflow-y-auto px-8 py-4 min-h-0">
            {loading && (
              <div className="space-y-4 pt-2 animate-pulse">
                {[0, 1, 2].map((i) => (
                  <div key={i}>
                    <div className="h-2 rounded" style={{ width: '30%', background: 'rgba(58,50,42,0.12)' }} />
                    <div className="h-2 mt-2 rounded" style={{ width: '92%', background: 'rgba(58,50,42,0.10)' }} />
                    <div className="h-2 mt-2 rounded" style={{ width: '70%', background: 'rgba(58,50,42,0.10)' }} />
                  </div>
                ))}
              </div>
            )}

            {error && (
              <p className="pt-6 text-center" style={{ fontFamily: "'Kreon', serif", color: '#9c4a3c' }}>{error}</p>
            )}

            {isEmpty && (
              <div className="flex flex-col items-center justify-center h-full text-center" style={{ color: INK_FAINT }}>
                <p className="text-4xl mb-3" style={{ opacity: 0.5 }}>✒️</p>
                <p style={{ fontFamily: "'Kreon', serif", fontSize: '0.95rem' }}>No journal entries yet.</p>
              </div>
            )}

            {!loading && !error && entries.map((entry, i) => <Entry key={i} entry={entry} />)}

            {data?.review && (
              <div className="mt-6 mb-2 rounded-md p-4" style={{ background: 'rgba(120,92,54,0.07)', border: `1px solid ${RULE}` }}>
                <p className="uppercase mb-2" style={{ fontFamily: "'Kreon', serif", fontSize: '0.64rem', letterSpacing: '0.18em', color: INK_FAINT }}>
                  Review
                </p>
                <p style={{ fontFamily: "'Kreon', serif", fontSize: '1.02rem', lineHeight: 1.6, color: INK, whiteSpace: 'pre-wrap' }}>
                  {data.review}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
