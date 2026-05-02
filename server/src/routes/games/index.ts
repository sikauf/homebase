import { Router } from 'express'
import hades2Router from './hades2'
import sts2Router from './sts2'

const router = Router()

router.use('/hades2', hades2Router)
router.use('/sts2', sts2Router)

export default router
