import type { ServerModule } from '../types'
import router from './route'

const clean: ServerModule = { name: 'clean', path: '/api/clean', router }
export default clean
