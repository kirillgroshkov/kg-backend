import * as KoaRouter from 'koa-router'
import { DateTime } from 'luxon'
import { api } from './api'
import { env } from './environment/environment'
import { processUtil } from './util/process.util'
import { FORMAT_DATETIME_PRETTY, timeUtil } from './util/time.util'

const router = new KoaRouter({
  prefix: '',
})
export const rootResource = router.routes()

router.get('/', async ctx => {
  ctx.body = {
    started: `${timeUtil.timeBetween(Date.now(), api.serverStarted)} ago`,
    startedAtUTC: DateTime.fromMillis(api.serverStarted).toFormat(
      FORMAT_DATETIME_PRETTY,
    ),
    mem: processUtil.memoryUsage(),
  }
})

router.get('/debug', ctx => {
  ctx.body = {
    environment: env(),
    env: process.env,
    // secret,
  }
})
