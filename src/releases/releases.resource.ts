import { releasesService } from '@src/releases/releases.service'
import { githubService } from '@src/srv/github.service'
import * as KoaRouter from 'koa-router'

const router = new KoaRouter({
  prefix: '/releases',
})
export const releasesResource = router.routes()

router.get('/cronUpdate', async ctx => {
  ctx.body = await releasesService.cronUpdate()
})

router.get('/test', async ctx => {
  ctx.body = await releasesService.test()
})

router.get('/', async ctx => {
  ctx.body = await releasesService.getFeed()
})

router.get('/info', async ctx => {
  ctx.body = await githubService.getRateLimit()
})
