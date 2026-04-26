import { Routes, Route, Navigate } from 'react-router-dom'
import TabBar from '../../components/TabBar'
import CurrentlyReading from './CurrentlyReading'
import Completed from './Completed'
import Shelf from './Shelf'

const TABS = [
  { label: 'On the Nightstand', to: '/books/currently-reading' },
  { label: 'Archive', to: '/books/completed' },
  { label: 'Shelf', to: '/books/shelf' },
]

export default function BooksPage() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TabBar tabs={TABS} />

      <Routes>
        <Route index element={<Navigate to="currently-reading" replace />} />
        <Route path="currently-reading" element={<CurrentlyReading />} />
        <Route path="shelf" element={<Shelf />} />
        <Route path="completed" element={<Completed />} />
      </Routes>
    </div>
  )
}
