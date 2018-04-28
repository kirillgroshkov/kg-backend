import { api } from '@src/api'
import { staticDir } from '@src/cnst/paths.cnst'
import { env } from '@src/environment/environment'
import { adminMiddleware } from '@src/mw/admin.mw'
import { releasesService } from '@src/releases/releases.service'
import { adminService } from '@src/srv/admin.service'
import { processUtil } from '@src/util/process.util'
import { timeUtil } from '@src/util/time.util'
import * as fs from 'fs-extra'
import * as KoaRouter from 'koa-router'

const router = new KoaRouter({
  prefix: '',
}) // .use(adminMiddleware())
export const rootResource = router.routes()

router.get('/', async ctx => {
  ctx.body = {
    started: `${timeUtil.timeBetween(Date.now(), api.serverStarted)} ago`,
    startedAtUTC: timeUtil.unixtimePretty(api.serverStarted / 1000),
    region: process.env.NOW_REGION,
    mem: processUtil.memoryUsage(),
    cpuAvg: processUtil.cpuAvg(),
    data: {
      lastCheckedReleases: timeUtil.unixtimePretty(await releasesService.getLastCheckedReleases()),
    },
  }
})

router.get('/cpu', async ctx => {
  ctx.body = {
    cpuPercent: await processUtil.cpuPercent(100),
  }
})

router.get('/debug', adminMiddleware(), async ctx => {
  ctx.body = {
    environment: env(),
    admin: await adminService.isAdmin(ctx),
    env: process.env,
    // secret,
  }
})

router.get('/loginInfo', async ctx => {
  ctx.body = {
    login: await adminService.getAdminInfo(ctx),
  }
})

router.get('/login', async ctx => {
  ctx.body = await fs.readFile(staticDir + '/login.html', 'utf-8')
})
