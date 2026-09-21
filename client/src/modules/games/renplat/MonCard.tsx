import type { Mon } from './api'
import { spriteUrl, typeColor } from './data'

export function TypeChip({ type, small }: { type: string; small?: boolean }) {
  return (
    <span
      className={`rounded uppercase font-bold tracking-wider ${small ? 'text-[8px] px-1 py-px' : 'text-[9px] px-1.5 py-0.5'}`}
      style={{ background: typeColor(type), color: 'rgba(255,255,255,0.95)' }}
    >
      {type}
    </span>
  )
}

export function Sprite({ species, size, dead }: { species: number; size: number; dead?: boolean }) {
  return (
    <img
      src={spriteUrl(species)}
      alt=""
      draggable={false}
      width={size}
      height={size}
      className="select-none shrink-0"
      style={{
        imageRendering: 'pixelated',
        filter: dead ? 'grayscale(1) brightness(0.65)' : 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))',
      }}
    />
  )
}

interface Props {
  mon: Mon
  levelCap: number
}

export default function MonCard({ mon, levelCap }: Props) {
  const overCap = mon.level > levelCap

  return (
    <div
      className="rounded-xl p-2.5 flex gap-2.5"
      style={{
        background: '#1a1a1a',
        border: `1px solid ${overCap ? 'rgba(220,90,90,0.45)' : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      {/* Sprite column: big art, with the details alongside rather than beneath
          it — the old stacked layout left the card mostly empty. */}
      <div className="flex flex-col items-center shrink-0 w-[92px] gap-1">
        <Sprite species={mon.species} size={88} />
        <div className="flex gap-1 flex-wrap justify-center">
          {mon.types.map((t) => (
            <TypeChip key={t} type={t} small />
          ))}
        </div>
      </div>

      <div className="min-w-0 flex-1 flex flex-col gap-1.5">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-semibold truncate text-white text-sm">{mon.nickname}</span>
            {mon.shiny && <span className="text-[10px]" style={{ color: '#d4af37' }}>★</span>}
            <span
              className="text-xs font-bold tabular-nums ml-auto shrink-0"
              style={{ color: overCap ? '#e06060' : 'rgba(255,255,255,0.92)' }}
              title={overCap ? `Over the level ${levelCap} cap` : undefined}
            >
              Lv {mon.level}
              {overCap && <span className="ml-1 text-[9px] uppercase">over</span>}
            </span>
          </div>
          <div className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {mon.nickname !== mon.name && `${mon.name} · `}
            {mon.nature} · {mon.ability}
          </div>
          <div className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.28)' }}>
            {mon.heldItem ?? 'No item'} · {mon.metLocation}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 mt-auto">
          {mon.moves.map((move, i) => (
            <div
              key={i}
              className="rounded px-1.5 py-1 text-[10px] truncate"
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderLeft: `2px solid ${typeColor(move.type)}`,
                color: 'rgba(255,255,255,0.7)',
              }}
              title={`${move.name} — ${move.type}${move.power ? `, ${move.power} BP` : ''}, ${move.pp} PP`}
            >
              {move.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
