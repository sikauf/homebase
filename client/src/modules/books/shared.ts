export const FALLBACK_RGBS = ['251,191,36', '45,212,191', '167,139,250', '251,146,60']

export function toHardcoverSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function fetchJSON<T>(url: string): Promise<T> {
  const r = await fetch(url)
  const text = await r.text()
  const json = JSON.parse(text)
  if (!r.ok) throw new Error(json.error ?? `Server error ${r.status}`)
  return json as T
}
