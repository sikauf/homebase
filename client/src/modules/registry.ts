import type { SectionManifest } from './manifest'

const modules = import.meta.glob<{ manifest: SectionManifest }>('./*/manifest.ts', { eager: true })

export const sections: SectionManifest[] = Object.values(modules)
  .map((m) => m.manifest)
  .sort((a, b) => a.order - b.order)
