import { releasesService } from '@src/releases/releases.service'
import * as KoaRouter from 'koa-router'

const router = new KoaRouter({
  prefix: '/releases',
})
export const releasesResource = router.routes()

router.get('/cronUpdate', async ctx => {
  // ctx.body = await githubService.test()
  ctx.body = await releasesService.cronUpdate()
})

router.get('/', async ctx => {
  ctx.body = await releasesService.getFeed()
})
