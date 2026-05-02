import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import TabbedSection from './components/TabbedSection'
import { sections } from './modules/registry'

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  )
}
