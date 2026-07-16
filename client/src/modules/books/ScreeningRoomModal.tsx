import { useEffect, useState } from 'react'

export interface VideoResult {
  video_id: string
  title: string
  channel: string
  thumbnail_url: string
}

export interface ScreeningBook {
  book_id: number
  title: string
  author: string | null
  cover_url: string | null
  accent_rgb: string | null
}

interface Props {
  book: ScreeningBook
  videos: VideoResult[]
  loading: boolean
  onAnotherBook: () => void
  onDismissVideo: (videoId: string) => void
  onClose: () => void
}

const FALLBACK_RGB = '120,130,150'

// Self-contained buttons — the repo's documented `.btn`/`.btn-ghost` primitives
// don't actually exist in CSS, so everything here is inline like JournalModal.
function Button({
  variant, onClick, disabled, title, children, flex,
}: {
  variant: 'primary' | 'ghost'
  onClick: () => void
  disabled?: boolean
  title?: string
  children: React.ReactNode
  flex?: boolean
}) {
  const [hover, setHover] = useState(false)
  const primary = variant === 'primary'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: flex ? 1 : undefined,
        width: flex ? undefined : '100%',
        borderRadius: 10,
        padding: '10px 14px',
        fontSize: '0.82rem',
        fontWeight: primary ? 600 : 500,
        letterSpacing: '0.01em',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'background 0.15s ease, color 0.15s ease, opacity 0.15s ease',
        opacity: disabled ? 0.4 : 1,
        ...(primary
          ? { background: hover && !disabled ? '#e9e9ec' : '#fff', color: '#000', border: '1px solid transparent' }
          : {
              background: hover && !disabled ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
              color: hover && !disabled ? '#fff' : 'rgba(255,255,255,0.65)',
              border: '1px solid rgba(255,255,255,0.1)',
            }),
      }}
    >
      {children}
    </button>
  )
}

export default function ScreeningRoomModal({
  book, videos, loading, onAnotherBook, onDismissVideo, onClose,
}: Props) {
  const [videoIdx, setVideoIdx] = useState(0)
  const [visible, setVisible] = useState(false)
  const rgb = book.accent_rgb ?? FALLBACK_RGB

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // videos can shrink as clips are dismissed; modulo keeps the index in range.
  const safeIdx = videos.length ? videoIdx % videos.length : 0
  const video = videos[safeIdx]
  const watch = () => video && window.open(`https://www.youtube.com/watch?v=${video.video_id}`, '_blank')

  const eyebrow: React.CSSProperties = {
    fontSize: '0.66rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.24em',
    color: 'rgba(255,255,255,0.5)',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(20,22,28,0.7), rgba(0,0,0,0.86))',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative overflow-hidden rounded-2xl"
        style={{
          width: 540,
          maxWidth: 'calc(100vw - 32px)',
          background: '#101013',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.98)',
          transition: 'opacity 0.28s ease, transform 0.28s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Blurred cover backdrop — atmosphere only, heavily scrimmed to stay neutral */}
        {book.cover_url && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url(${book.cover_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(44px) saturate(0.5) brightness(0.5)',
              transform: 'scale(1.3)',
              opacity: 0.4,
            }}
          />
        )}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, rgba(16,16,19,0.55) 0%, rgba(16,16,19,0.8) 45%, #101013 100%)' }}
        />

        {/* Content */}
        <div className="relative" style={{ padding: '20px 22px 22px' }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '0.85rem', opacity: 0.85 }}>🎬</span>
              <p style={eyebrow}>Now Showing</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex items-center justify-center rounded-full"
              style={{
                width: 30, height: 30, color: 'rgba(255,255,255,0.6)',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                fontSize: '0.85rem', cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>

          {/* Video hero */}
          {video && (
            <>
              <button
                onClick={watch}
                className="group relative block w-full overflow-hidden rounded-xl"
                style={{
                  aspectRatio: '16 / 9',
                  background: '#000',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: `0 18px 50px rgba(0,0,0,0.6), 0 0 36px rgba(${rgb},0.18)`,
                  opacity: loading ? 0.5 : 1,
                  transition: 'opacity 0.2s ease',
                  cursor: 'pointer',
                }}
              >
                {video.thumbnail_url && (
                  <img src={video.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                )}
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.15), rgba(0,0,0,0.45))' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="flex items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110"
                    style={{
                      width: 56, height: 56,
                      background: 'rgba(10,10,12,0.7)',
                      border: '1.5px solid rgba(255,255,255,0.85)',
                    }}
                  >
                    <span style={{ fontSize: '1.1rem', color: '#fff', marginLeft: 3 }}>▶</span>
                  </div>
                </div>
                {videos.length > 1 && (
                  <div
                    className="absolute"
                    style={{
                      bottom: 8, right: 8,
                      background: 'rgba(0,0,0,0.7)', borderRadius: 6,
                      padding: '2px 7px', fontSize: '0.66rem', color: 'rgba(255,255,255,0.8)',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {safeIdx + 1} / {videos.length}
                  </div>
                )}
              </button>

              <div className="mt-3">
                <p
                  className="text-white font-medium leading-snug"
                  style={{ fontSize: '0.92rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                >
                  {video.title}
                </p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{video.channel}</p>
              </div>
            </>
          )}

          {/* Book context band */}
          <div className="flex items-center gap-3 my-4">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.12))' }} />
            <p className="text-center shrink-0" style={{ fontFamily: "'Kreon', serif", fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em' }}>
              {book.title}{book.author && <span style={{ color: 'rgba(255,255,255,0.3)' }}> · {book.author}</span>}
            </p>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, rgba(255,255,255,0.12))' }} />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button variant="primary" onClick={watch} disabled={!video}>
              ▶ Watch on YouTube
            </Button>
            <div className="flex gap-2">
              {videos.length > 1 && (
                <Button variant="ghost" flex onClick={() => setVideoIdx((i) => (i + 1) % videos.length)}>
                  ⤳ Next clip
                </Button>
              )}
              <Button variant="ghost" flex onClick={onAnotherBook} disabled={loading}>
                {loading ? '…' : '🎞 Another book'}
              </Button>
              {video && (
                <Button variant="ghost" flex onClick={() => onDismissVideo(video.video_id)} title="Don't show this clip again">
                  Not interested
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
