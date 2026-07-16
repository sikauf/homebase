import TabbedSection from '../../components/TabbedSection'
import { manifest } from './manifest'

export default function GamesPage() {
  return (
    <TabbedSection
      basePath={manifest.path}
      tabs={manifest.tabs!}
      reorderable={manifest.reorderable !== false}
      routesClassName={manifest.routesClassName}
    />
  )
}
