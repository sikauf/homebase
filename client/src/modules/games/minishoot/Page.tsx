import { useEffect, useState } from 'react'
import GamePageShell from '../_shared/GamePageShell'

const STORAGE_KEY = 'minishoot:filled'
const SLOTS = 4

function loadFilled(): boolean[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return Array(SLOTS).fill(false)
    const parsed = JSON.parse(raw) as boolean[]
    return Array.from({ length: SLOTS }, (_, i) => !!parsed[i])
  } catch {
    return Array(SLOTS).fill(false)
  }
}

export default function MinishootAdventures() {
  const [filled, setFilled] = useState<boolean[]>(loadFilled)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(filled)) } catch {}
  }, [filled])

  function toggle(i: number) {
    setFilled((prev) => prev.map((v, idx) => (idx === i ? !v : v)))
  }

  return (
    <GamePageShell title="Progress">
      <div className="flex-1 flex items-center justify-center min-h-0 p-6">
        <div className="grid grid-cols-4 gap-8 w-full max-w-5xl">
          {Array.from({ length: SLOTS }).map((_, i) => (
            <SkullSlot key={i} filled={filled[i]} onClick={() => toggle(i)} />
          ))}
        </div>
      </div>
    </GamePageShell>
  )
}

function SkullSlot({ filled, onClick }: { filled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative aspect-square rounded-2xl flex items-center justify-center cursor-pointer transition-all"
      style={{
        background: '#1a1a1a',
        border: `1px solid ${filled ? 'rgba(220,90,90,0.4)' : 'rgba(255,255,255,0.06)'}`,
        boxShadow: filled
          ? '0 0 30px rgba(220,90,90,0.25), 0 4px 16px rgba(0,0,0,0.6)'
          : '0 4px 16px rgba(0,0,0,0.5)',
      }}
    >
      {filled ? (
        <img
          src="/games/minishoot/skull.png"
          alt="skull"
          draggable={false}
          className="w-3/4 h-3/4 object-contain select-none"
          style={{
            filter: 'drop-shadow(0 6px 16px rgba(220,90,90,0.4)) brightness(1.05)',
          }}
        />
      ) : (
        <SkullOutline />
      )}
    </button>
  )
}

function SkullOutline() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="w-3/4 h-3/4"
      fill="none"
      stroke="rgba(255,255,255,0.18)"
      strokeWidth="2.5"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {/* Cranium */}
      <path d="M50 12 C28 12, 14 28, 14 50 C14 62, 19 70, 24 76 L24 84 C24 87, 26 89, 29 89 L36 89 L36 82 L42 82 L42 89 L58 89 L58 82 L64 82 L64 89 L71 89 C74 89, 76 87, 76 84 L76 76 C81 70, 86 62, 86 50 C86 28, 72 12, 50 12 Z" />
      {/* Eye sockets — diamond shapes echoing the gem look */}
      <path d="M32 40 L40 32 L48 40 L40 56 Z" />
      <path d="M52 40 L60 32 L68 40 L60 56 Z" />
      {/* Nose */}
      <path d="M48 62 L50 70 L52 62 Z" />
    </svg>
  )
}
