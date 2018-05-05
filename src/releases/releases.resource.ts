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
  ctx.body = await releasesService.getFeed(ctx, ctx.query.limit)
})

router.get('/repos', async ctx => {
  ctx.body = await releasesService.getRepos()
})

router.get('/repos/:owner/:name/releases', async ctx => {
  ctx.body = await releasesService.getReleasesByRepo(ctx.params.owner, ctx.params.name, ctx.query.limit)
})

router.get('/repos/:owner/:name/releases/fetch', async ctx => {
  ctx.body = await releasesService.fetchReleasesByRepo(ctx.params.owner, ctx.params.name, ctx.query.since)
})

router.get('/releases/:id', async ctx => {
  ctx.body = await releasesService.getReleaseById(ctx.params.id)
})

router.get('/info', async ctx => {
  ctx.body = await githubService.getRateLimit()
})

router.post('/auth', async ctx => {
  ctx.body = await releasesService.auth(ctx.request.body)
})
