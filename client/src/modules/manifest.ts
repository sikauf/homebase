import { ComponentType } from 'react'

export interface TabManifest {
  label: string
  path: string
  Page: ComponentType
}

export interface SectionManifest {
  path: string
  label: string
  icon: string
  order: number
  description?: string
  useVisible?: () => boolean
  tabs?: TabManifest[]
  /** Set false to pin tabs to manifest order (no drag-reorder, ignores any saved order). */
  reorderable?: boolean
  Section?: ComponentType
  routesClassName?: string
}
