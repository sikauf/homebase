import { ReactNode } from 'react'

interface Props {
  title: string
  children: ReactNode
}

export default function GamePageShell({ title, children }: Props) {
  return (
    <div className="flex-1 flex flex-col rounded-2xl overflow-hidden" style={{ background: '#0c0c0c' }}>
      <div className="px-4 pt-6 pb-5 sm:px-7 sm:pt-8 sm:pb-7 shrink-0">
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.12))' }}/>
          <div className="text-center">
            <h2
              className="text-lg sm:text-2xl font-black tracking-[.2em] sm:tracking-[.35em] uppercase"
              style={{ color: 'rgba(255,255,255,0.92)' }}
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
