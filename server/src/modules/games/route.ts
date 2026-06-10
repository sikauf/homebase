import { Router } from 'express'
import hades2Router from './hades2/route'
import sts2Router from './sts2/route'
import shovelknightRouter from './shovelknight/route'
import aoe2Router from './aoe2/route'

const router = Router()

router.use('/hades2', hades2Router)
router.use('/sts2', sts2Router)
router.use('/shovelknight', shovelknightRouter)
router.use('/aoe2', aoe2Router)

export default router
