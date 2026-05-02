import { ReactNode } from 'react'

interface Props {
  title: string
  children: ReactNode
}

export default function GamePageShell({ title, children }: Props) {
  return (
    <div className="flex-1 flex flex-col rounded-2xl overflow-hidden" style={{ background: '#0c0c0c' }}>
      <div className="px-7 pt-8 pb-7 shrink-0">
        <div className="flex items-center gap-5">
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.12))' }}/>
          <div className="text-center">
            <h2
              className="text-2xl font-black tracking-[.35em] uppercase"
              style={{ color: 'rgba(255,255,255,0.92)', letterSpacing: '0.35em' }}
            >
              {title}
            </h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="h-px w-10" style={{ background: 'rgba(255,255,255,0.15)' }}/>
              <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.35)' }}/>
              <div className="h-px w-4" style={{ background: 'rgba(255,255,255,0.1)' }}/>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.5)' }}/>
              <div className="h-px w-4" style={{ background: 'rgba(255,255,255,0.1)' }}/>
              <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.35)' }}/>
              <div className="h-px w-10" style={{ background: 'rgba(255,255,255,0.15)' }}/>
            </div>
          </div>
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, rgba(255,255,255,0.12))' }}/>
        </div>
      </div>
      {children}
    </div>
  )
}
