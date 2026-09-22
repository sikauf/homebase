import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { DeathFields } from '../modules/games/renplat/DeathModal'
import type { Fight } from '../modules/games/renplat/api'

const fight = (id: number, name: string, location: string): Fight => ({
  id,
  key: `f${id}`,
  name,
  location,
  badge_index: 3,
  sort_order: id * 10,
  badge_award: null,
  danger: null,
  threat_note: null,
  kills: 0,
  cleared: false,
  clearedByBadge: false,
})

const FIGHTS = [
  fight(1, 'Ace Trainer', 'Route 215'),
  fight(2, 'Maylene', 'Veilstone Gym'),
  fight(3, 'Crasher Wake', 'Pastoria Gym'),
]

/** Mirrors how DeathModal/GraveModal hold the selection. */
function Harness({ onFightId }: { onFightId: (value: string) => void }) {
  const [fightId, setFightId] = useState('')
  return (
    <DeathFields
      fights={FIGHTS}
      fightId={fightId}
      note=""
      onFightId={(v) => {
        setFightId(v)
        onFightId(v)
      }}
      onNote={() => {}}
    />
  )
}

describe('renplat "What killed it?" picker', () => {
  it('filters the fight list as you type and picks the match', () => {
    const onFightId = vi.fn()
    render(<Harness onFightId={onFightId} />)
    const input = screen.getByLabelText('What killed it?')

    fireEvent.focus(input)
    // Unfiltered, the whole list is there plus the wild-death escape hatch.
    expect(screen.getByText('Not a boss fight')).toBeTruthy()
    expect(screen.getByText('Maylene — Veilstone Gym')).toBeTruthy()

    // Location text is searchable, not just the trainer's name.
    fireEvent.change(input, { target: { value: '215' } })
    expect(screen.getByText('Ace Trainer — Route 215')).toBeTruthy()
    expect(screen.queryByText('Maylene — Veilstone Gym')).toBeNull()
    expect(screen.queryByText('Not a boss fight')).toBeNull()

    fireEvent.mouseDown(screen.getByText('Ace Trainer — Route 215'))
    expect(onFightId).toHaveBeenCalledWith('1')
    // Closed, showing the choice.
    expect((input as HTMLInputElement).value).toBe('Ace Trainer — Route 215')
  })

  it('selects with the keyboard and clears back to a wild death', () => {
    const onFightId = vi.fn()
    render(<Harness onFightId={onFightId} />)
    const input = screen.getByLabelText('What killed it?')

    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'wake' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onFightId).toHaveBeenCalledWith('3')

    fireEvent.click(screen.getByLabelText('Clear fight'))
    expect(onFightId).toHaveBeenLastCalledWith('')
    expect((input as HTMLInputElement).value).toBe('')
  })

  it('says so when nothing matches', () => {
    render(<Harness onFightId={vi.fn()} />)
    const input = screen.getByLabelText('What killed it?')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'cynthia' } })
    expect(screen.getByText(/No fight matches/)).toBeTruthy()
  })
})
