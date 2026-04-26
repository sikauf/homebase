import { NavLink } from 'react-router-dom'

interface Tab {
  label: string
  to: string
}

export default function TabBar({ tabs }: { tabs: Tab[] }) {
  return (
    <div className="bg-gray-900 border-b border-gray-800 px-4 flex gap-1 shrink-0">
      {tabs.map((tab) => (
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
  )
}
