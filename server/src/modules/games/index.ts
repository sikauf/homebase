import type { ServerModule } from '../types'
import router from './route'

const games: ServerModule = { name: 'games', path: '/api/games', router }
export default games
