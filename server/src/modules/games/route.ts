import { Router } from 'express'
import hades2Router from './hades2/route'
import sts2Router from './sts2/route'
import shovelknightRouter from './shovelknight/route'
import renplatRouter from './renplat/route'
const router = Router()

router.use('/hades2', hades2Router)
router.use('/sts2', sts2Router)
router.use('/shovelknight', shovelknightRouter)
router.use('/renplat', renplatRouter)

export default router
