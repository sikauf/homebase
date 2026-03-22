import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import SlayTheSpire2 from './SlayTheSpire2'

const TABS = [
  { label: 'Slay the Spire 2', to: '/games/sts2' },
]

export default function GamesPage() {
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
      <div className="flex-1 flex p-5 bg-black min-h-0">
        <Routes>
          <Route index element={<Navigate to="sts2" replace />} />
          <Route path="sts2" element={<SlayTheSpire2 />} />
        </Routes>
      </div>
    </div>
  )
}
