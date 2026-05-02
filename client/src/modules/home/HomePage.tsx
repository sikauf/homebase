import { Link } from 'react-router-dom'
import { sections } from '../registry'
import type { SectionManifest } from '../manifest'
import ExportCard from './ExportCard'

function HomeCard({ section }: { section: SectionManifest }) {
  const visible = section.useVisible ? section.useVisible() : true
  if (!visible) return null
  if (section.path === '/' || !section.description) return null
  return (
    <Link
      to={section.path}
      className="group rounded-2xl p-6 flex flex-col gap-3 transition-all"
      style={{
        background: '#1a1a1a',
        border: '1px solid rgba(255,255,255,0.06)',
        textDecoration: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'
        e.currentTarget.style.background = '#202020'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
        e.currentTarget.style.background = '#1a1a1a'
      }}
    >
      <span className="text-2xl">{section.icon}</span>
      <div>
        <p className="text-white font-semibold" style={{ fontFamily: "'Kreon', serif", fontSize: '1.05rem' }}>{section.label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{section.description}</p>
      </div>
    </Link>
  )
}

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen" style={{ background: '#0c0c0c' }}>
      <div className="w-full max-w-xl px-8">
        <div className="text-center mb-12">
          <h1
            className="text-4xl font-black tracking-[.2em] uppercase text-white"
            style={{ fontFamily: "'Kreon', serif" }}
          >
            Home Base
          </h1>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="h-px w-12" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }} />
            <div className="h-px w-12" style={{ background: 'rgba(255,255,255,0.1)' }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {sections.map((s) => <HomeCard key={s.path} section={s} />)}
        </div>

        <ExportCard />
      </div>
    </div>
  )
}
