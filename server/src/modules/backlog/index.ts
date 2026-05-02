import type { ServerModule } from '../types'
import router from './route'

const backlog: ServerModule = { name: 'backlog', path: '/api/backlog', router }
export default backlog
