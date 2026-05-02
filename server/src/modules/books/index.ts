import type { ServerModule } from '../types'
import router from './route'

const books: ServerModule = { name: 'books', path: '/api/books', router }
export default books
