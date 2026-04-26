import { Routes, Route, Navigate } from 'react-router-dom'
import TabBar from '../../components/TabBar'
import SlayTheSpire2 from './SlayTheSpire2'
import HadesII from './HadesII'
import Mewgenics from './Mewgenics'

const TABS = [
  { label: 'Slay the Spire 2', to: '/games/sts2' },
  { label: 'Hades II', to: '/games/hades2' },
  { label: 'Mewgenics', to: '/games/mewgenics' },
]

export default function GamesPage() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TabBar tabs={TABS} />

      <div className="flex-1 flex p-5 bg-black min-h-0">
        <Routes>
          <Route index element={<Navigate to="sts2" replace />} />
          <Route path="sts2" element={<SlayTheSpire2 />} />
          <Route path="hades2" element={<HadesII />} />
          <Route path="mewgenics" element={<Mewgenics />} />
        </Routes>
      </div>
    </div>
  )
}
