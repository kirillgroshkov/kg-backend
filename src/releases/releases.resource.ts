import { githubService } from '@src/releases/github.service'
import { releasesDao } from '@src/releases/releases.dao'
import { releasesService } from '@src/releases/releases.service'
import * as KoaRouter from 'koa-router'

const router = new KoaRouter({
  prefix: '/releases',
})
export const releasesResource = router.routes()

router.get('/cronUpdate', async ctx => {
  ctx.body = await releasesService.cronUpdate()
})

router.get('/test', async ctx => {
  ctx.body = await releasesService.test(ctx)
})

router.get('/', async ctx => {
  // const uid = releasesDao.requireUid(ctx)
  const u = await releasesDao.getUserFromContext(ctx)
  ctx.body = await releasesService.getFeed(u, ctx.query.minIncl, ctx.query.maxExcl)
})

router.get('/repos', async ctx => {
  const u = await releasesDao.getUserFromContext(ctx)
  ctx.body = await releasesService.getRepos(u)
})

router.get('/repos/:owner/:name/releases', async ctx => {
  ctx.body = await releasesService.getReleasesByRepo(ctx.params.owner, ctx.params.name, ctx.query.limit)
})

router.get('/repos/:owner/:name/releases/fetch', async ctx => {
  const u = await releasesDao.getUserFromContext(ctx)
  ctx.body = await releasesService.fetchReleasesByRepo(u, ctx.params.owner, ctx.params.name, ctx.query.since)
})

router.get('/releases/:id', async ctx => {
  ctx.body = await releasesService.getReleaseById(ctx.params.id)
})

router.get('/info', async ctx => {
  ctx.body = await releasesService.info()
})

router.post('/auth', async ctx => {
  ctx.body = await releasesService.auth(ctx.request.body)
})

router.put('/userSettings', async ctx => {
  const u = await releasesDao.getUserFromContext(ctx)
  ctx.body = await releasesService.saveUserSettings(u, ctx.request.body)
})
