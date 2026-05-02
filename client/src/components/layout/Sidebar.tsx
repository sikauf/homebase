import { NavLink, Link } from 'react-router-dom'
import { useCleanVisible } from '../../hooks/useCleanVisible'
import { sections } from '../../modules/registry'
import type { SectionManifest } from '../../modules/manifest'

function NavEntry({ section }: { section: SectionManifest }) {
  const visible = section.useVisible ? section.useVisible() : true
  if (!visible) return null
  return (
    <NavLink
      to={section.path}
      end={section.path === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? 'bg-gray-700 text-white font-medium'
            : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }`
      }
    >
      <span>{section.icon}</span>
      <span>{section.label}</span>
    </NavLink>
  )
}

export default function Sidebar() {
  const [cleanVisible, setCleanVisible] = useCleanVisible()

  return (
    <aside className="w-56 min-h-screen bg-gray-900 flex flex-col">
      <div className="px-6 py-5 border-b border-gray-800">
        <Link to="/" className="text-white font-bold text-lg tracking-tight hover:text-gray-300 transition-colors">
          Home Base
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {sections.map((s) => <NavEntry key={s.path} section={s} />)}
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
