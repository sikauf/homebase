import type { ServerModule } from '../types'
import router from './route'

const callie: ServerModule = { name: 'callie', path: '/api/callie', router }
export default callie
