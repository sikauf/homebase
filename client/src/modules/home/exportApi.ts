const BASE = '/api/export'

export async function fetchLastExportedAt(): Promise<string | null> {
  const res = await fetch(`${BASE}/last`)
  if (!res.ok) throw new Error('Failed to fetch last export time')
  const body = (await res.json()) as { lastExportedAt: string | null }
  return body.lastExportedAt
}

export async function downloadExport(): Promise<string> {
  const res = await fetch(BASE)
  if (!res.ok) throw new Error('Failed to export data')

  const disposition = res.headers.get('content-disposition') ?? ''
  const match = disposition.match(/filename="([^"]+)"/)
  const filename = match?.[1] ?? `homebase-export-${new Date().toISOString()}.json`

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)

  return filename
}
