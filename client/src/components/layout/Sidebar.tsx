import { NavLink, Link } from 'react-router-dom'
import { useCleanVisible } from '../../hooks/useCleanVisible'

interface NavItem {
  label: string
  to: string
  icon: string
}

const navItems: NavItem[] = [
  { label: 'Home', to: '/', icon: '🏠' },
  { label: 'Golf', to: '/golf', icon: '⛳' },
  { label: 'Games', to: '/games', icon: '🎮' },
  { label: 'Books', to: '/books', icon: '📚' },
  { label: 'Clean', to: '/clean', icon: '🌿' },
  { label: 'Fitness', to: '/fitness', icon: '💪' },
]

export default function Sidebar() {
  const [cleanVisible, setCleanVisible] = useCleanVisible()

  const visibleItems = navItems.filter((item) => item.label !== 'Clean' || cleanVisible)

  return (
    <aside className="w-56 min-h-screen bg-gray-900 flex flex-col">
      <div className="px-6 py-5 border-b border-gray-800">
        <Link to="/" className="text-white font-bold text-lg tracking-tight hover:text-gray-300 transition-colors">
          Home Base
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map((item) => (
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
        ))}
      </nav>
      <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
        <p className="text-gray-600 text-xs">v0.1.0</p>
        <button
          type="button"
          role="switch"
          aria-checked={cleanVisible}
          aria-label="Toggle"
          onClick={() => setCleanVisible(!cleanVisible)}
          className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
            cleanVisible ? 'bg-gray-600' : 'bg-gray-800'
          }`}
        >
          <span
            className={`inline-block h-3 w-3 transform rounded-full bg-gray-400 transition-transform ${
              cleanVisible ? 'translate-x-3.5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
    </aside>
  )
}
