import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  buildEdges,
  createParallel,
  deleteParallel,
  loadLibrary,
  loadParallels,
  pairKey,
  type ParallelBook,
  type ParallelsData,
} from './api'
import ParallelsGraph from './ParallelsGraph'
import AddParallelModal from './AddParallelModal'
import PairPanel from './PairPanel'

interface ModalPrefill {
  a?: ParallelBook
  b?: ParallelBook
}

export default function ParallelsPage() {
  const [data, setData] = useState<ParallelsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetched lazily the first time the modal opens — the graph itself never
  // needs Hardcover.
  const [library, setLibrary] = useState<ParallelBook[] | null>(null)
  const [libraryError, setLibraryError] = useState<string | null>(null)

  const [selectedNodes, setSelectedNodes] = useState<number[]>([])
  const [selectedPair, setSelectedPair] = useState<string | null>(null)
  const [modalPrefill, setModalPrefill] = useState<ModalPrefill | null>(null)

  const reload = useCallback(() => {
    return loadParallels()
      .then((d) => { setData(d); setError(null) })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { reload() }, [reload])

  const edges = useMemo(() => (data ? buildEdges(data) : []), [data])
  const selectedEdge = useMemo(
    () => (selectedPair ? edges.find((e) => e.key === selectedPair) ?? null : null),
    [edges, selectedPair],
  )

  function openModal(prefill: ModalPrefill) {
    setModalPrefill(prefill)
    if (library == null) {
      loadLibrary()
        .then((books) => { setLibrary(books); setLibraryError(null) })
        .catch((e: Error) => setLibraryError(e.message))
    }
  }

  function closeModal() {
    setModalPrefill(null)
    setSelectedNodes([])
  }

  function handleNodeClick(book: ParallelBook) {
    if (selectedNodes.includes(book.book_id)) {
      setSelectedNodes([])
      return
    }
    if (selectedNodes.length === 0) {
      setSelectedNodes([book.book_id])
      return
    }
    const first = data?.books.find((b) => b.book_id === selectedNodes[0])
    if (first) openModal({ a: first, b: book })
  }

  async function handleCreate(a: ParallelBook, b: ParallelBook, note: string) {
    await createParallel(a, b, note)
    await reload()
    setSelectedPair(pairKey(a.book_id, b.book_id))
  }

  async function handleDelete(id: number) {
    try {
      await deleteParallel(id)
    } catch {
      return
    }
    await reload()
  }

  const count = data?.parallels.length ?? 0

  return (
    <div className="flex-1 flex p-5 min-h-0 overflow-y-auto" style={{ background: '#0c0c0c' }}>
      <div className="flex-1 flex flex-col" style={{ background: '#0c0c0c' }}>

        {/* Header */}
        <div className="px-4 pt-6 pb-5 sm:px-7 sm:pt-8 sm:pb-7 shrink-0">
          <div className="flex items-center gap-5">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.12))' }} />
            <div className="text-center">
              <h2 className="text-lg sm:text-2xl font-black tracking-[.2em] sm:tracking-[.35em] uppercase text-white">
                Parallels
              </h2>
              {count > 0 && (
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Kreon', serif", letterSpacing: '0.1em' }}>
                  {count} {count === 1 ? 'thread' : 'threads'} between books
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

        {loading && (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Spinning the web…</p>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>
          </div>
        )}

        {!loading && !error && data && (
          <div className="px-4 sm:px-7 pb-6 flex flex-col gap-4 w-full" style={{ maxWidth: '1060px', margin: '0 auto' }}>

            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)', fontFamily: "'Kreon', serif", letterSpacing: '0.08em' }}>
                {data.books.length > 0 ? 'click two books to link them · click a thread to read it' : ''}
              </p>
              <button
                onClick={() => openModal({})}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              >
                ＋ Add parallel
              </button>
            </div>

            {data.books.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <p className="text-4xl mb-3">🕸️</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  No parallels yet. Add one to start the web.
                </p>
              </div>
            ) : (
              <div
                className="rounded-xl overflow-hidden"
                style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <ParallelsGraph
                  books={data.books}
                  edges={edges}
                  selectedNodes={selectedNodes}
                  selectedPair={selectedPair}
                  onNodeClick={handleNodeClick}
                  onEdgeClick={(key) => setSelectedPair(key)}
                  onBackgroundClick={() => { setSelectedNodes([]); setSelectedPair(null) }}
                />
              </div>
            )}

            {selectedEdge && (
              <PairPanel
                edge={selectedEdge}
                onDelete={handleDelete}
                onAddAnother={() => openModal({ a: selectedEdge.a, b: selectedEdge.b })}
                onClose={() => setSelectedPair(null)}
              />
            )}
          </div>
        )}
      </div>

      {modalPrefill && (
        <AddParallelModal
          library={library}
          libraryError={libraryError}
          initialA={modalPrefill.a}
          initialB={modalPrefill.b}
          onClose={closeModal}
          onSubmit={handleCreate}
        />
      )}
    </div>
  )
}
