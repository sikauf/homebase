import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import HomePage from './modules/home/HomePage'
import GolfPage from './modules/golf/GolfPage'
import GamesPage from './modules/games/GamesPage'
import BooksPage from './modules/books/BooksPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen">
        <Sidebar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/golf" element={<GolfPage />} />
          <Route path="/games/*" element={<GamesPage />} />
          <Route path="/books/*" element={<BooksPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
