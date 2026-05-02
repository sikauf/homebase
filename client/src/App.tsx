import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import TabbedSection from './components/TabbedSection'
import { sections } from './modules/registry'
import { QuickAddProvider, useQuickAdd } from './modules/backlog/QuickAddContext'
import QuickAddModal from './modules/backlog/QuickAddModal'

function GlobalShortcuts() {
  const { open, isOpen } = useQuickAdd()
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'n' || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
      const t = e.target as HTMLElement | null
      if (!t) return
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t.isContentEditable) return
      if (isOpen) return
      e.preventDefault()
      open()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, isOpen])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <QuickAddProvider>
        <GlobalShortcuts />
        <QuickAddModal />
        <div className="flex min-h-screen">
          <Sidebar />
          <Routes>
            {sections.map((s) => {
              const path = s.path === '/' ? '/' : s.tabs ? `${s.path}/*` : s.path
              if (s.tabs) {
                return (
                  <Route
                    key={s.path}
                    path={path}
                    element={
                      <TabbedSection
                        basePath={s.path}
                        tabs={s.tabs}
                        routesClassName={s.routesClassName}
                      />
                    }
                  />
                )
              }
              if (s.Section) {
                const Section = s.Section
                return <Route key={s.path} path={path} element={<Section />} />
              }
              return null
            })}
          </Routes>
        </div>
      </QuickAddProvider>
    </BrowserRouter>
  )
}
