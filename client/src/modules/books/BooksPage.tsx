import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import CurrentlyReading from './CurrentlyReading'
import Completed from './Completed'
import Shelf from './Shelf'

const TABS = [
  { label: 'On the Nightstand', to: '/books/currently-reading' },
  { label: 'Archive', to: '/books/completed' },
  { label: 'Shelf', to: '/books/shelf' },
]

export default function BooksPage() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Tab bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 flex gap-1 shrink-0">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-white text-white'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      {/* Content */}
      <Routes>
        <Route index element={<Navigate to="currently-reading" replace />} />
        <Route path="currently-reading" element={<CurrentlyReading />} />
        <Route path="shelf" element={<Shelf />} />
        <Route path="completed" element={<Completed />} />
      </Routes>
    </div>
  )
}
