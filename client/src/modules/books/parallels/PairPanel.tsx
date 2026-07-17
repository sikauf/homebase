import { useState } from 'react'
import type { ParallelBook, ParallelEdge } from './api'

function Cover({ book }: { book: ParallelBook }) {
  if (!book.cover_url) {
    return (
      <div
        className="rounded flex items-center justify-center text-xl"
        style={{ width: '44px', height: '66px', background: '#242424', flexShrink: 0 }}
      >
        📖
      </div>
    )
  }
  return (
    <img
      src={book.cover_url}
      alt={book.title}
      className="rounded"
      style={{ width: '44px', height: '66px', objectFit: 'cover', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
    />
  )
}

function NoteRow({ note, date, onDelete }: { note: string; date: string; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className="flex items-start gap-3 rounded-lg"
      style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>{note}</p>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {new Date(date.replace(' ', 'T') + 'Z').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
        </p>
      </div>
      <button
        onClick={onDelete}
        aria-label="Delete parallel"
        className="text-sm transition-colors"
        style={{
          color: hovered ? 'rgba(255,255,255,0.3)' : 'transparent',
          flexShrink: 0,
          lineHeight: 1,
          padding: '2px',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
        onMouseLeave={(e) => (e.currentTarget.style.color = hovered ? 'rgba(255,255,255,0.3)' : 'transparent')}
      >
        ✕
      </button>
    </div>
  )
}

export default function PairPanel({ edge, onDelete, onAddAnother, onClose }: {
  edge: ParallelEdge
  onDelete: (id: number) => void
  onAddAnother: () => void
  onClose: () => void
}) {
  return (
    <div
      className="rounded-xl w-full"
      style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', padding: '18px 20px' }}
    >
      <div className="flex items-center gap-4">
        <Cover book={edge.a} />
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '1.1rem' }}>×</span>
        <Cover book={edge.b} />
        <div className="flex-1 min-w-0">
          <p className="text-white truncate" style={{ fontFamily: "'Kreon', serif", fontWeight: 700, fontSize: '0.95rem' }}>
            {edge.a.title}
          </p>
          <p className="truncate" style={{ fontFamily: "'Kreon', serif", fontWeight: 700, fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)' }}>
            {edge.b.title}
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {edge.count} {edge.count === 1 ? 'parallel' : 'parallels'}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="self-start p-1 transition-colors"
          style={{ color: 'rgba(255,255,255,0.3)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-2 mt-4">
        {edge.parallels.map((p) => (
          <NoteRow key={p.id} note={p.note} date={p.created_at} onDelete={() => onDelete(p.id)} />
        ))}
      </div>

      <button
        onClick={onAddAnother}
        className="mt-4 text-sm rounded-lg transition-colors w-full"
        style={{
          padding: '8px 0',
          background: 'transparent',
          border: '1px dashed rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.4)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
      >
        ＋ Add another parallel
      </button>
    </div>
  )
}
