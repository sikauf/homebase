import { NavLink, Link } from 'react-router-dom'

interface NavItem {
  label: string
  to?: string
  icon: string
  disabled?: boolean
}

const navItems: NavItem[] = [
  { label: 'Home', to: '/', icon: '🏠' },
  { label: 'Golf', to: '/golf', icon: '⛳' },
  { label: 'Games', to: '/games', icon: '🎮' },
  { label: 'Books', to: '/books', icon: '📚' },
  { label: 'Fitness', icon: '💪', disabled: true },
]

export default function Sidebar() {
  return (
    <aside className="w-56 min-h-screen bg-gray-900 flex flex-col">
      <div className="px-6 py-5 border-b border-gray-800">
        <Link to="/" className="text-white font-bold text-lg tracking-tight hover:text-gray-300 transition-colors">
          Home Base
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) =>
          item.disabled || !item.to ? (
            <div
              key={item.label}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 cursor-not-allowed select-none text-sm"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
              <span className="ml-auto text-xs bg-gray-800 text-gray-600 px-1.5 py-0.5 rounded">
                soon
              </span>
            </div>
          ) : (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-gray-700 text-white font-medium'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          )
        )}
      </nav>
      <div className="px-6 py-4 border-t border-gray-800">
        <p className="text-gray-600 text-xs">v0.1.0</p>
      </div>
    </aside>
  )
}
