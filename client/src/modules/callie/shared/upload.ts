// Downscale a picked photo in the browser before upload: phone photos are
// 2–5MB, but the polaroids only ever render small, and the server caps
// uploads at 1.5MB. createImageBitmap applies EXIF orientation for us.

const MAX_DIMENSION = 1400
const JPEG_QUALITY = 0.82

export async function preparePhotoUpload(file: File): Promise<{ mime: string; data: string }> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
  )
  if (!blob) throw new Error('Could not encode photo')

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
  return { mime: 'image/jpeg', data: dataUrl.slice(dataUrl.indexOf(',') + 1) }
}
