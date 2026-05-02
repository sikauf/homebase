import TabbedSection from '../../components/TabbedSection'
import { manifest } from './manifest'

export default function GolfPage() {
  return <TabbedSection basePath={manifest.path} tabs={manifest.tabs!} routesClassName={manifest.routesClassName} />
}
