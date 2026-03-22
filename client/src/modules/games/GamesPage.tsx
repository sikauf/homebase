import { Routes, Route, NavLink } from 'react-router-dom'
import PageWrapper from '../../components/layout/PageWrapper'
import SlayTheSpire2 from './SlayTheSpire2'

const GAMES = [
  { id: 'sts2', label: 'Slay the Spire 2', icon: '🗡️' },
]

export default function GamesPage() {
  return (
    <PageWrapper title="Games" subtitle="Track your progress across games">
      <div className="flex gap-6">
        {/* Game tabs */}
        <nav className="flex flex-col gap-1 w-44 shrink-0">
          {GAMES.map((g) => (
            <NavLink
              key={g.id}
              to={`/games/${g.id}`}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white font-medium'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`
              }
            >
              <span>{g.icon}</span>
              <span>{g.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Game content */}
        <div className="flex-1 min-w-0">
          <Routes>
            <Route path="sts2" element={<SlayTheSpire2 />} />
            <Route
              path="*"
              element={
                <div className="text-center py-20 text-gray-400 text-sm">
                  Select a game on the left.
                </div>
              }
            />
          </Routes>
        </div>
      </div>
    </PageWrapper>
  )
}
