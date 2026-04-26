import { Routes, Route, Navigate } from 'react-router-dom'
import TabBar from '../../components/TabBar'
import Rounds from './Rounds'
import RangePage from './RangePage'

const TABS = [
  { label: 'Rounds', to: '/golf/rounds' },
  { label: 'Range', to: '/golf/range' },
]

export default function GolfPage() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TabBar tabs={TABS} />

      <Routes>
        <Route index element={<Navigate to="rounds" replace />} />
        <Route path="rounds" element={<Rounds />} />
        <Route path="range" element={<RangePage />} />
      </Routes>
    </div>
  )
}
