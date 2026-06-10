import { CSSProperties } from 'react'

// ——— Type ———
export const TITLE = "'Cinzel', 'Trajan Pro', Georgia, serif"
export const DISPLAY = "'Cinzel Decorative', 'Cinzel', serif"
export const BODY = "'EB Garamond', Georgia, serif"

// ——— Ink + metal palette ———
export const INK = '#3a2c18'
export const INK_SOFT = '#5e4a2e'
export const INK_FAINT = 'rgba(58,44,24,0.45)'
export const GOLD = '#b8964e'
export const GOLD_LIGHT = '#f0d68a'
export const WAX = '#8e241d'

// Subtle paper grain — a desaturated fractal-noise tile, laid over parchment at
// low opacity with multiply so it reads as fibre rather than static.
export const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

// Aged parchment fill. `lit` brightens it (used on hover / open).
export function parchment(lit = false): CSSProperties {
  return {
    background: `
      radial-gradient(60% 55% at 82% 92%, rgba(120,84,38,0.20), transparent 62%),
      radial-gradient(45% 42% at 12% 84%, rgba(120,84,38,0.14), transparent 60%),
      radial-gradient(135% 125% at 24% 14%, ${lit ? '#f6ecd2' : '#f0e4c7'} 0%, #e6d4ab 42%, #d8c193 74%, #cdb182 100%)
    `,
  }
}

// Dark, candlelit war-room backdrop for the whole tab.
export const WARROOM: CSSProperties = {
  background: `
    radial-gradient(120% 90% at 50% -8%, #221913 0%, #120e0b 52%, #0a0807 100%)
  `,
}

// Roman numerals — campaigns are short, so a compact table is plenty.
export function toRoman(n: number): string {
  if (n <= 0) return '—'
  const map: [number, string][] = [
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let out = ''
  for (const [v, s] of map) while (n >= v) { out += s; n -= v }
  return out
}

// ——— Heraldic heater shield ———
export function Shield({
  size = 16,
  fill = 'transparent',
  stroke,
  glow,
}: {
  size?: number
  fill?: string
  stroke?: string
  glow?: string
}) {
  return (
    <svg width={size} height={size * 1.16} viewBox="0 0 24 28" style={{ filter: glow ? `drop-shadow(0 0 4px ${glow})` : undefined, display: 'block' }}>
      <path
        d="M12 1 L23 4.5 L23 14 C23 21.2 18 26 12 27.2 C6 26 1 21.2 1 14 L1 4.5 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={stroke ? 1.4 : 0}
      />
    </svg>
  )
}

// ——— Wax seal stamp (completed campaigns) ———
export function WaxSeal({ size = 52, glyph = '✓', label }: { size?: number; glyph?: string; label?: string }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, transform: 'rotate(-9deg)' }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '49% 51% 52% 48% / 50% 49% 51% 50%',
          background: 'radial-gradient(circle at 36% 30%, #c0392b 0%, #951f19 58%, #6c1612 100%)',
          boxShadow: 'inset 0 2px 3px rgba(255,180,160,0.45), inset 0 -4px 8px rgba(0,0,0,0.5), 0 4px 10px rgba(0,0,0,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(60,10,8,0.5)',
        }}
      >
        <span
          style={{
            fontFamily: TITLE,
            fontWeight: 800,
            fontSize: size * 0.5,
            color: '#f3c9bd',
            textShadow: '0 1px 1px rgba(74,12,10,0.9), 0 -1px 1px rgba(0,0,0,0.35)',
            lineHeight: 1,
          }}
        >
          {glyph}
        </span>
      </div>
      {label && (
        <span
          style={{
            position: 'absolute',
            bottom: -7,
            left: '50%',
            transform: 'translateX(-50%) rotate(9deg)',
            fontFamily: TITLE,
            fontSize: 7,
            letterSpacing: '0.18em',
            color: WAX,
            whiteSpace: 'nowrap',
            fontWeight: 700,
          }}
        >
          {label}
        </span>
      )}
    </div>
  )
}

// ——— Compass rose (map decoration) ———
export function Compass({ size = 64, color = 'rgba(58,44,24,0.3)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block' }}>
      <g fill="none" stroke={color} strokeWidth="1.2">
        <circle cx="50" cy="50" r="34" />
        <circle cx="50" cy="50" r="26" strokeDasharray="2 3" />
      </g>
      <g fill={color}>
        <polygon points="50,8 56,50 50,46 44,50" />
        <polygon points="50,92 44,50 50,54 56,50" opacity="0.55" />
        <polygon points="8,50 50,44 46,50 50,56" opacity="0.7" />
        <polygon points="92,50 50,56 54,50 50,44" opacity="0.7" />
      </g>
      <text x="50" y="6" textAnchor="middle" fontSize="9" fill={color} fontFamily={TITLE} fontWeight={700}>N</text>
    </svg>
  )
}
