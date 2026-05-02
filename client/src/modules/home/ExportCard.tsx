import { useEffect, useState } from 'react'
import { downloadExport, fetchLastExportedAt } from './exportApi'

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffMs = Date.now() - then
  const sec = Math.round(diffMs / 1000)
  if (sec < 60) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} hr ago`
  const day = Math.round(hr / 24)
  if (day < 30) return `${day} day${day === 1 ? '' : 's'} ago`
  const mon = Math.round(day / 30)
  if (mon < 12) return `${mon} mo ago`
  const yr = Math.round(mon / 12)
  return `${yr} yr ago`
}

export default function ExportCard() {
  const [lastExportedAt, setLastExportedAt] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLastExportedAt().then(setLastExportedAt).catch(() => {})
  }, [])

  const handleClick = async () => {
    setBusy(true)
    setError(null)
    try {
      await downloadExport()
      const next = await fetchLastExportedAt()
      setLastExportedAt(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setBusy(false)
    }
  }

  const lastLabel = lastExportedAt
    ? `Last exported ${formatRelative(lastExportedAt)}`
    : 'Never exported'

  return (
    <div className="mt-8 flex flex-col items-center gap-2">
      <button
        onClick={handleClick}
        disabled={busy}
        className="px-4 py-2 rounded-lg text-sm transition-colors"
        style={{
          background: '#1a1a1a',
          border: '1px solid rgba(255,255,255,0.06)',
          color: 'rgba(255,255,255,0.92)',
          cursor: busy ? 'wait' : 'pointer',
          opacity: busy ? 0.6 : 1,
        }}
        onMouseEnter={(e) => {
          if (!busy) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
        }}
      >
        {busy ? 'Exporting…' : 'Export data'}
      </button>
      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
        {error ?? lastLabel}
      </p>
    </div>
  )
}
