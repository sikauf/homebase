import { useEffect, useState } from 'react'

interface CharacterAscension {
  id: string
  name: string
  max_ascension: number
  preferred_ascension: number
}

const CHARACTER_COLORS: Record<string, { bg: string; border: string; badge: string }> = {
  'CHARACTER.IRONCLAD':   { bg: 'bg-red-50',    border: 'border-red-200',   badge: 'bg-red-100 text-red-700' },
  'CHARACTER.SILENT':     { bg: 'bg-green-50',  border: 'border-green-200', badge: 'bg-green-100 text-green-700' },
  'CHARACTER.DEFECT':     { bg: 'bg-blue-50',   border: 'border-blue-200',  badge: 'bg-blue-100 text-blue-700' },
  'CHARACTER.REGENT':     { bg: 'bg-yellow-50', border: 'border-yellow-200',badge: 'bg-yellow-100 text-yellow-700' },
  'CHARACTER.NECROBINDER':{ bg: 'bg-gray-50',   border: 'border-gray-200',  badge: 'bg-gray-100 text-gray-700' },
}

const MAX_ASCENSION = 10

function AscensionBar({ value }: { value: number }) {
  const pct = Math.min((value / MAX_ASCENSION) * 100, 100)
  return (
    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
      <div
        className="bg-gray-700 h-1.5 rounded-full transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export default function SlayTheSpire2() {
  const [characters, setCharacters] = useState<CharacterAscension[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch('/api/games/sts2/ascensions')
      .then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e.error))
        return r.json()
      })
      .then((data) => { setCharacters(data); setError(null) })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-gray-400 text-sm py-8 text-center">Loading…</div>
  if (error) return (
    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
  )

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 mb-4">Ascension Levels</h2>
      <div className="grid grid-cols-2 gap-3">
        {characters.map((c) => {
          const colors = CHARACTER_COLORS[c.id] ?? {
            bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-700',
          }
          return (
            <div
              key={c.id}
              className={`rounded-xl border p-4 ${colors.bg} ${colors.border}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-gray-800">{c.name}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>
                  A{c.max_ascension}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Playing on A{c.preferred_ascension}
              </p>
              <AscensionBar value={c.max_ascension} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
