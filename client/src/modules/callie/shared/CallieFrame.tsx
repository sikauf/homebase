import Polaroids from './Polaroids'
import { callieTheme } from './theme'

interface CallieFrameProps {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}

// The Callie section's answer to PageWrapper: pink polka dots, polaroids of
// the two of them in the header, green as the supporting accent.
export default function CallieFrame({ title, action, children }: CallieFrameProps) {
  return (
    <div className="flex-1 min-h-screen" style={callieTheme.pageBackground}>
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-8 sm:py-8">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6 sm:mb-8">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold" style={{ color: callieTheme.pink }}>
              {title}
            </h1>
            {action && <div className="mt-3">{action}</div>}
          </div>
          <Polaroids />
        </div>
        {children}
      </div>
    </div>
  )
}
