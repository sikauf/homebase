import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { SidebarContent } from './Sidebar'

// Sticky top bar + slide-out drawer, shown below the md breakpoint where the
// desktop sidebar is hidden.
export default function MobileHeader() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => { setOpen(false) }, [location])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  return (
    <>
      <header className="md:hidden sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="p-1 -ml-1 text-gray-300 hover:text-white"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <Link to="/" className="text-white font-bold tracking-tight">
          Home Base
        </Link>
      </header>

      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 max-w-[80vw] bg-gray-900 flex flex-col overflow-y-auto shadow-2xl">
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  )
}
