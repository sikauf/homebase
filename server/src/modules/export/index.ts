import type { ServerModule } from '../types'
import router from './route'

const exportModule: ServerModule = { name: 'export', path: '/api/export', router }
export default exportModule
