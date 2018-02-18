import * as fs from 'fs-extra'
import * as KoaRouter from 'koa-router'
import { DateTime } from 'luxon'
import { api } from './api'
import { staticDir } from './cnst/paths.cnst'
import { env } from './environment/environment'
import { adminMiddleware } from './mw/admin.mw'
import { adminService } from './srv/admin.service'
import { processUtil } from './util/process.util'
import { FORMAT_DATETIME_PRETTY, timeUtil } from './util/time.util'

const router = new KoaRouter({
  prefix: '',
}) // .use(adminMiddleware())
export const rootResource = router.routes()

router.get('/', async ctx => {
  ctx.body = {
    started: `${timeUtil.timeBetween(Date.now(), api.serverStarted)} ago`,
    startedAtUTC: DateTime.fromMillis(api.serverStarted).toFormat(
      FORMAT_DATETIME_PRETTY,
    ),
    mem: processUtil.memoryUsage(),
    cpuAvg: processUtil.cpuAvg(),
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
