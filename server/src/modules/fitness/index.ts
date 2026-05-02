import type { ServerModule } from '../types'
import router from './route'

const fitness: ServerModule = { name: 'fitness', path: '/api/fitness', router }
export default fitness
