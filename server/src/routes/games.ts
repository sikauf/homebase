import { Router, Request, Response } from 'express'
import fs from 'fs'

const router = Router()

const CHARACTER_NAMES: Record<string, string> = {
  'CHARACTER.IRONCLAD': 'Ironclad',
  'CHARACTER.SILENT': 'Silent',
  'CHARACTER.DEFECT': 'Defect',
  'CHARACTER.REGENT': 'Regent',
  'CHARACTER.NECROBINDER': 'Necrobinder',
}

router.get('/sts2/ascensions', (_req: Request, res: Response) => {
  const savePath = process.env.STS2_SAVE_PATH
  if (!savePath) {
    res.status(503).json({ error: 'STS2_SAVE_PATH not configured' })
    return
  }

  let raw: string
  try {
    raw = fs.readFileSync(savePath, 'utf-8')
  } catch {
    res.status(503).json({ error: 'Could not read STS2 save file' })
    return
  }

  let data: { character_stats?: { id: string; max_ascension: number; preferred_ascension: number; total_wins?: number; total_losses?: number }[] }
  try {
    data = JSON.parse(raw)
  } catch {
    res.status(500).json({ error: 'Failed to parse STS2 save file' })
    return
  }

  const characters = (data.character_stats ?? [])
    .filter((c) => c.id in CHARACTER_NAMES)
    .map((c) => ({
      id: c.id,
      name: CHARACTER_NAMES[c.id],
      max_ascension: c.max_ascension,
      preferred_ascension: c.preferred_ascension,
      total_wins: c.total_wins ?? 0,
      total_losses: c.total_losses ?? 0,
    }))

  res.json(characters)
})

export default router
