import { Router } from 'express'

export interface ServerModule {
  name: string
  path: string
  router: Router
}
