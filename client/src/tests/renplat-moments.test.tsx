import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Moments from '../modules/games/renplat/Moments'
import type { Fight, Moment, TeamMember } from '../modules/games/renplat/api'

const FIGHTS = [
  {
    id: 4,
    key: 'maylene',
    name: 'Maylene',
    location: 'Veilstone Gym',
    badge_index: 3,
    sort_order: 420,
    badge_award: 4,
    danger: null,
    threat_note: null,
    kills: 0,
    cleared: false,
    clearedByBadge: false,
  } satisfies Fight,
]

const PARTY: TeamMember[] = [
  { species: 391, nickname: 'Monferno', level: 26 },
  { species: 395, nickname: 'Empoleon', level: 30 },
]

const moment = (over: Partial<Moment> = {}): Moment => ({
  id: 1,
  run_id: 7,
  fight_id: 4,
  note: 'Won on 3 HP',
  team: null,
  created_at: '2026-09-22 08:00:00',
  ...over,
})

function setup(moments: Moment[] = []) {
  const handlers = { onAdd: vi.fn().mockResolvedValue(undefined), onUpdate: vi.fn().mockResolvedValue(undefined), onDelete: vi.fn().mockResolvedValue(undefined) }
  render(<Moments moments={moments} fights={FIGHTS} party={PARTY} {...handlers} />)
  return handlers
}

describe('renplat moments', () => {
  it('writes a moment against a fight, with the team attached by default', async () => {
    const { onAdd } = setup()
    fireEvent.focus(screen.getByLabelText('What killed it?'))
    fireEvent.mouseDown(screen.getByText('Maylene — Veilstone Gym'))
    fireEvent.change(screen.getByPlaceholderText(/What happened/), {
      target: { value: 'Won on 3 HP' },
    })
    expect(screen.getByLabelText(/Attach my team/)).toBeTruthy()

    fireEvent.click(screen.getByText('Remember it'))
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith(4, 'Won on 3 HP', true))
  })

  it('will not save an empty moment', () => {
    setup()
    expect((screen.getByText('Remember it') as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows the captured team and leaves it alone when only the note is edited', async () => {
    const { onUpdate } = setup([moment({ team: PARTY })])
    // Twice over: the card's captured team, and the new-moment form's preview.
    expect(screen.getAllByTitle('Monferno · Lv 26')).toHaveLength(2)

    fireEvent.click(screen.getByText('Edit'))
    // Two note boxes on screen now: the new-moment form, then the card's editor.
    const [, editor] = screen.getAllByPlaceholderText(/What happened/)
    fireEvent.change(editor, { target: { value: 'Barely won' } })
    fireEvent.click(screen.getByText('Save'))
    // include_team undefined — the snapshot stays as it was captured.
    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith(1, { fight_id: 4, note: 'Barely won', include_team: undefined }),
    )
  })

  it('drops the team snapshot when the box is unticked', async () => {
    const { onUpdate } = setup([moment({ team: PARTY })])
    fireEvent.click(screen.getByText('Edit'))
    fireEvent.click(screen.getByLabelText(/Keep the team snapshot/))
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith(1, { fight_id: 4, note: 'Won on 3 HP', include_team: false }),
    )
  })

  it('says when a run has nothing written down', () => {
    setup()
    expect(screen.getByText(/Nothing written down yet/)).toBeTruthy()
  })
})
