import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import GamesPage from '../modules/games/GamesPage'

// Stub out the API-backed pages so tests don't need a running server
vi.mock('../modules/games/sts2/Page', () => ({
  default: () => <div data-testid="sts2-panel" />,
}))
vi.mock('../modules/games/shovelknight/Page', () => ({
  default: () => <div data-testid="shovelknight-panel" />,
}))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/games/*" element={<GamesPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Games tab navigation', () => {
  it('renders a Slay the Spire 2 tab', () => {
    renderAt('/games/sts2')
    expect(screen.getByRole('link', { name: 'Slay the Spire 2' })).toBeInTheDocument()
  })

  it('Slay the Spire 2 tab links to /games/sts2', () => {
    renderAt('/games/sts2')
    expect(screen.getByRole('link', { name: 'Slay the Spire 2' })).toHaveAttribute('href', '/games/sts2')
  })

  it('renders the STS2 panel at /games/sts2', () => {
    renderAt('/games/sts2')
    expect(screen.getByTestId('sts2-panel')).toBeInTheDocument()
  })

  it('redirects /games to the first tab (Shovel Knight) and renders its panel', () => {
    renderAt('/games')
    expect(screen.getByTestId('shovelknight-panel')).toBeInTheDocument()
  })

  it('orders the tabs Shovel Knight first, Slay the Spire 2 second', () => {
    renderAt('/games/sts2')
    const links = screen.getAllByRole('link')
    expect(links[0]).toHaveTextContent('Shovel Knight')
    expect(links[1]).toHaveTextContent('Slay the Spire 2')
  })
})
