import { useEffect, useMemo, useRef, useState } from 'react'
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force'
import { FALLBACK_RGBS } from '../shared'
import type { ParallelBook, ParallelEdge } from './api'

const W = 920
const H = 620
const NODE_R = 26
const PAD = 14
const LABEL_H = 20

interface SimNode extends SimulationNodeDatum {
  id: number
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  key: string
  count: number
}

interface Point { x: number; y: number }

/** Hub books read slightly bigger: +3px per extra connection, capped. */
function nodeRadius(degree: number): number {
  return NODE_R + 3 * Math.min(Math.max(degree - 1, 0), 4)
}

function truncate(s: string, max = 18): string {
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s
}

export default function ParallelsGraph({ books, edges, selectedNodes, selectedPair, onNodeClick, onEdgeClick, onBackgroundClick }: {
  books: ParallelBook[]
  edges: ParallelEdge[]
  selectedNodes: number[]
  selectedPair: string | null
  onNodeClick: (book: ParallelBook) => void
  onEdgeClick: (key: string) => void
  onBackgroundClick: () => void
}) {
  const [positions, setPositions] = useState<Map<number, Point>>(new Map())
  const [hoveredNode, setHoveredNode] = useState<number | null>(null)
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null)
  // Survives simulation rebuilds so existing nodes keep their spot after a
  // create/delete refetch instead of the whole web jumping.
  const posRef = useRef(new Map<number, Point>())

  const degrees = useMemo(() => {
    const d = new Map<number, number>()
    for (const e of edges) {
      d.set(e.a.book_id, (d.get(e.a.book_id) ?? 0) + 1)
      d.set(e.b.book_id, (d.get(e.b.book_id) ?? 0) + 1)
    }
    return d
  }, [edges])

  const accents = useMemo(() => {
    const m = new Map<number, string>()
    books.forEach((b, i) => m.set(b.book_id, b.accent_rgb ?? FALLBACK_RGBS[i % FALLBACK_RGBS.length]))
    return m
  }, [books])

  // Rebuild the simulation only when the graph's structure changes — not on
  // hover/selection re-renders.
  const signature = useMemo(
    () =>
      books.map((b) => b.book_id).sort((a, b) => a - b).join(',') +
      '|' +
      edges.map((e) => `${e.key}x${e.count}`).sort().join(','),
    [books, edges],
  )

  useEffect(() => {
    const degreeOf = new Map<number, number>()
    for (const e of edges) {
      degreeOf.set(e.a.book_id, (degreeOf.get(e.a.book_id) ?? 0) + 1)
      degreeOf.set(e.b.book_id, (degreeOf.get(e.b.book_id) ?? 0) + 1)
    }
    const nodes: SimNode[] = books.map((b) => {
      const seed = posRef.current.get(b.book_id)
      return {
        id: b.book_id,
        x: seed?.x ?? W / 2 + (Math.random() - 0.5) * 120,
        y: seed?.y ?? H / 2 + (Math.random() - 0.5) * 120,
      }
    })
    const links: SimLink[] = edges.map((e) => ({
      source: e.a.book_id,
      target: e.b.book_id,
      key: e.key,
      count: e.count,
    }))

    const sim = forceSimulation(nodes)
      // More parallels between a pair = a shorter, stronger pull.
      .force('link', forceLink<SimNode, SimLink>(links)
        .id((d) => d.id)
        .distance((l) => Math.max(70, 170 - 28 * (l.count - 1)))
        .strength((l) => Math.min(1, 0.3 + 0.2 * l.count)))
      .force('charge', forceManyBody().strength(-380))
      .force('center', forceCenter(W / 2, H / 2))
      .force('collide', forceCollide<SimNode>().radius((d) => nodeRadius(degreeOf.get(d.id) ?? 0) + 16))
      // Gentle pull toward center keeps disconnected clusters on-canvas.
      .force('x', forceX(W / 2).strength(0.05))
      .force('y', forceY(H / 2).strength(0.07))
      .on('tick', () => {
        const next = new Map<number, Point>()
        for (const n of nodes) {
          const r = nodeRadius(degreeOf.get(n.id) ?? 0)
          const x = Math.max(r + PAD, Math.min(W - r - PAD, n.x ?? W / 2))
          const y = Math.max(r + PAD, Math.min(H - r - PAD - LABEL_H, n.y ?? H / 2))
          n.x = x
          n.y = y
          next.set(n.id, { x, y })
        }
        posRef.current = next
        setPositions(next)
      })

    return () => { sim.stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  const at = (id: number): Point => positions.get(id) ?? { x: W / 2, y: H / 2 }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <rect x={0} y={0} width={W} height={H} fill="transparent" onClick={onBackgroundClick} />

      <defs>
        {books.map((b) => (
          <clipPath key={b.book_id} id={`parallel-clip-${b.book_id}`}>
            <circle r={nodeRadius(degrees.get(b.book_id) ?? 0)} />
          </clipPath>
        ))}
      </defs>

      {/* Edges (under the nodes) */}
      {edges.map((e) => {
        const p1 = at(e.a.book_id)
        const p2 = at(e.b.book_id)
        const active = hoveredEdge === e.key || selectedPair === e.key
        const rgb = accents.get(e.a.book_id) ?? FALLBACK_RGBS[0]
        return (
          <g key={e.key}>
            <line
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke={active ? `rgba(${rgb},0.55)` : 'rgba(255,255,255,0.16)'}
              strokeWidth={Math.min(1.25 + 1.75 * (e.count - 1), 8)}
              strokeLinecap="round"
              style={{ transition: 'stroke 0.15s ease' }}
            />
            <line
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke="transparent"
              strokeWidth={16}
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onClick={(ev) => { ev.stopPropagation(); onEdgeClick(e.key) }}
              onMouseEnter={() => setHoveredEdge(e.key)}
              onMouseLeave={() => setHoveredEdge(null)}
            />
            {e.count > 1 && (
              <text
                x={(p1.x + p2.x) / 2}
                y={(p1.y + p2.y) / 2 - 5}
                textAnchor="middle"
                style={{ fontFamily: "'Kreon', serif", fontSize: '0.62rem', fill: 'rgba(255,255,255,0.45)', pointerEvents: 'none' }}
              >
                {e.count}
              </text>
            )}
          </g>
        )
      })}

      {/* Nodes */}
      {books.map((b) => {
        const p = at(b.book_id)
        const r = nodeRadius(degrees.get(b.book_id) ?? 0)
        const rgb = accents.get(b.book_id) ?? FALLBACK_RGBS[0]
        const hovered = hoveredNode === b.book_id
        const selected = selectedNodes.includes(b.book_id)
        return (
          <g
            key={b.book_id}
            transform={`translate(${p.x},${p.y})`}
            style={{ cursor: 'pointer' }}
            onClick={(ev) => { ev.stopPropagation(); onNodeClick(b) }}
            onMouseEnter={() => setHoveredNode(b.book_id)}
            onMouseLeave={() => setHoveredNode(null)}
          >
            {selected && <circle r={r + 5} fill="none" stroke={`rgba(${rgb},0.35)`} strokeWidth={1.5} />}
            <circle r={r + 2} fill="#0e0e0f" />
            {b.cover_url ? (
              <image
                href={b.cover_url}
                x={-r} y={-r} width={r * 2} height={r * 2}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#parallel-clip-${b.book_id})`}
              />
            ) : (
              <>
                <circle r={r} fill="#1a1a1a" />
                <text textAnchor="middle" dominantBaseline="central" style={{ fontSize: `${r * 0.8}px`, pointerEvents: 'none' }}>
                  📖
                </text>
              </>
            )}
            <circle
              r={r + 1}
              fill="none"
              stroke={selected ? `rgba(${rgb},0.95)` : hovered ? `rgba(${rgb},0.6)` : 'rgba(255,255,255,0.15)'}
              strokeWidth={selected ? 2.5 : hovered ? 1.5 : 1}
              style={{ transition: 'stroke 0.15s ease' }}
            />
            <text
              y={r + 16}
              textAnchor="middle"
              style={{
                fontFamily: "'Kreon', serif",
                fontSize: '0.66rem',
                fill: hovered || selected ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.55)',
                pointerEvents: 'none',
                transition: 'fill 0.15s ease',
              }}
            >
              {truncate(b.title)}
            </text>
          </g>
        )
      })}

      {selectedNodes.length === 1 && (
        <text
          x={W / 2}
          y={26}
          textAnchor="middle"
          style={{ fontFamily: "'Kreon', serif", fontSize: '0.8rem', fill: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }}
        >
          now pick a second book to draw the parallel…
        </text>
      )}
    </svg>
  )
}
