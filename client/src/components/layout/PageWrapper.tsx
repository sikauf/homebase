interface PageWrapperProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  dark?: boolean
}

export default function PageWrapper({ title, subtitle, action, children, dark }: PageWrapperProps) {
  return (
    <div
      className={`flex-1 min-h-screen ${dark ? '' : 'bg-gray-50'}`}
      style={dark ? { background: '#0c0c0c' } : undefined}
    >
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1
              className={`text-2xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                className={`mt-1 text-sm ${dark ? '' : 'text-gray-500'}`}
                style={dark ? { color: 'rgba(255,255,255,0.35)' } : undefined}
              >
                {subtitle}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
        {children}
      </div>
    </div>
  )
}
