import type { ServerModule } from '../types'
import router from './route'

const golf: ServerModule = { name: 'golf', path: '/api/golf', router }
export default golf
