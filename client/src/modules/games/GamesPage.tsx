import { Routes, Route, Navigate } from 'react-router-dom'
import TabBar from '../../components/TabBar'
import SlayTheSpire2 from './sts2/Page'
import HadesII from './hades2/Page'
import Mewgenics from './mewgenics/Page'
import MinishootAdventures from './minishoot/Page'

const TABS = [
  { label: 'Slay the Spire 2', to: '/games/sts2' },
  { label: 'Hades II', to: '/games/hades2' },
  { label: 'Mewgenics', to: '/games/mewgenics' },
  { label: 'Minishoot Adventures', to: '/games/minishoot' },
]

export default function GamesPage() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TabBar tabs={TABS} persistKey="games" />

      <div className="flex-1 flex p-5 bg-black min-h-0">
        <Routes>
          <Route index element={<Navigate to="sts2" replace />} />
          <Route path="sts2" element={<SlayTheSpire2 />} />
          <Route path="hades2" element={<HadesII />} />
          <Route path="mewgenics" element={<Mewgenics />} />
          <Route path="minishoot" element={<MinishootAdventures />} />
        </Routes>
      </div>
    </div>
  )
}
