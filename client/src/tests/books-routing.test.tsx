import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import BooksPage from '../modules/books/BooksPage'

vi.mock('../modules/books/CurrentlyReading', () => ({
  default: () => <div data-testid="currently-reading-panel" />,
}))
vi.mock('../modules/books/Shelf', () => ({
  default: () => <div data-testid="shelf-panel" />,
}))
vi.mock('../modules/books/Completed', () => ({
  default: () => <div data-testid="completed-panel" />,
}))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/books/*" element={<BooksPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Books tab navigation', () => {
  it('renders an On the Nightstand tab', () => {
    renderAt('/books/currently-reading')
    expect(screen.getByRole('link', { name: 'On the Nightstand' })).toBeInTheDocument()
  })

  it('renders a Shelf tab', () => {
    renderAt('/books/currently-reading')
    expect(screen.getByRole('link', { name: 'Shelf' })).toBeInTheDocument()
  })

  it('Shelf tab links to /books/shelf', () => {
    renderAt('/books/currently-reading')
    expect(screen.getByRole('link', { name: 'Shelf' })).toHaveAttribute('href', '/books/shelf')
  })

  it('renders the shelf panel at /books/shelf', () => {
    renderAt('/books/shelf')
    expect(screen.getByTestId('shelf-panel')).toBeInTheDocument()
  })

  it('renders an Archive tab', () => {
    renderAt('/books/currently-reading')
    expect(screen.getByRole('link', { name: 'Archive' })).toBeInTheDocument()
  })

  it('On the Nightstand tab links to /books/currently-reading', () => {
    renderAt('/books/currently-reading')
    expect(screen.getByRole('link', { name: 'On the Nightstand' })).toHaveAttribute('href', '/books/currently-reading')
  })

  it('Archive tab links to /books/completed', () => {
    renderAt('/books/currently-reading')
    expect(screen.getByRole('link', { name: 'Archive' })).toHaveAttribute('href', '/books/completed')
  })

  it('renders the currently reading panel at /books/currently-reading', () => {
    renderAt('/books/currently-reading')
    expect(screen.getByTestId('currently-reading-panel')).toBeInTheDocument()
  })

  it('renders the completed panel at /books/completed', () => {
    renderAt('/books/completed')
    expect(screen.getByTestId('completed-panel')).toBeInTheDocument()
  })

  it('redirects /books to /books/currently-reading', () => {
    renderAt('/books')
    expect(screen.getByTestId('currently-reading-panel')).toBeInTheDocument()
  })
})
