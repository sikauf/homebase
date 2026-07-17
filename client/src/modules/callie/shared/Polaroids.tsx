import { useEffect, useRef, useState } from 'react'
import { fetchPhotos, uploadPhoto, CalliePhoto } from './api'
import { callieTheme } from './theme'
import { preparePhotoUpload } from './upload'

// A little cluster of polaroids of the two of them, drawn fresh from the
// collection on every page load, plus a dashed tile for adding new ones.

const TILTS = ['-4deg', '2.5deg', '-2deg', '3.5deg']
const PHOTO_SIZE = {
  width: 'clamp(64px, 9vw, 104px)',
  height: 'clamp(72px, 10vw, 116px)',
} as const

function pickRandom<T>(items: T[], count: number): T[] {
  const pool = [...items]
  const picked: T[] = []
  while (pool.length > 0 && picked.length < count) {
    picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
  }
  return picked
}

function PolaroidFrame({ tilt, tapeAngle, children }: { tilt: string; tapeAngle: string; children: React.ReactNode }) {
  return (
    <div
      className="relative shrink-0"
      style={{
        transform: `rotate(${tilt})`,
        background: '#fffdfa',
        padding: '6px 6px 18px',
        borderRadius: '3px',
        boxShadow: '0 4px 12px rgba(190,24,93,0.22)',
        border: '1px solid #fbcfe3',
      }}
    >
      <span
        className="absolute -top-2 left-1/2 block"
        style={{
          width: '38px',
          height: '12px',
          background: 'linear-gradient(rgba(178,242,187,0.9), rgba(178,242,187,0.75))',
          transform: `translateX(-50%) rotate(${tapeAngle})`,
          borderRadius: '1px',
        }}
      />
      {children}
    </div>
  )
}

export default function Polaroids({ count = 3 }: { count?: number }) {
  const [photos, setPhotos] = useState<CalliePhoto[]>([])
  const [uploading, setUploading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [addedCount, setAddedCount] = useState(0)
  const confirmTimer = useRef<ReturnType<typeof setTimeout>>()
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => () => clearTimeout(confirmTimer.current), [])

  useEffect(() => {
    let cancelled = false
    fetchPhotos()
      .then((all) => { if (!cancelled) setPhotos(pickRandom(all, count)) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [count])

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0 || uploading) return
    setUploading(true)
    setFailed(false)
    setAddedCount(0)
    clearTimeout(confirmTimer.current)
    try {
      const added: CalliePhoto[] = []
      for (const file of Array.from(files)) {
        const { mime, data } = await preparePhotoUpload(file)
        added.push(await uploadPhoto(mime, data))
      }
      // Newest additions jump straight into the cluster.
      setPhotos((prev) => [...added, ...prev].slice(0, Math.max(count, added.length)))
      setAddedCount(added.length)
      confirmTimer.current = setTimeout(() => setAddedCount(0), 5000)
    } catch {
      setFailed(true)
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-start -space-x-3 sm:-space-x-2 pr-2">
        {photos.map((photo, i) => (
          <div key={photo.name} style={{ zIndex: i }} aria-hidden>
            <PolaroidFrame tilt={TILTS[i % TILTS.length]} tapeAngle={i % 2 === 0 ? '-2deg' : '3deg'}>
              <img src={photo.url} alt="" className="block object-cover" style={PHOTO_SIZE} loading="lazy" />
            </PolaroidFrame>
          </div>
        ))}
        <div style={{ zIndex: photos.length }}>
          <PolaroidFrame tilt={TILTS[photos.length % TILTS.length]} tapeAngle="2deg">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              aria-label="Add photos"
              title={failed ? 'Upload failed — try again?' : 'Add photos of us'}
              className="flex flex-col items-center justify-center gap-0.5"
              style={{
                ...PHOTO_SIZE,
                border: `2px dashed ${failed ? '#f08080' : callieTheme.pinkSoft}`,
                borderRadius: '2px',
                background: '#fdf2f8',
                color: callieTheme.pinkText,
              }}
            >
              <span className="text-xl leading-none">{uploading ? '⏳' : '+'}</span>
              <span className="text-[9px] font-medium">{uploading ? 'saving…' : failed ? 'try again' : 'add pics'}</span>
            </button>
          </PolaroidFrame>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onPick(e.target.files)}
        />
      </div>
      {addedCount > 0 && (
        <span
          className="text-[11px] rounded-full px-2.5 py-1 font-medium"
          style={callieTheme.greenChip}
        >
          ✓ {addedCount} photo{addedCount === 1 ? '' : 's'} added to the collection
        </span>
      )}
    </div>
  )
}
