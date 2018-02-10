import * as KoaRouter from 'koa-router'
import { slApiService } from './slApi.service'

const router = new KoaRouter({
  prefix: '/sl',
})
export const slResource = router.routes()

router.get('/departures', async ctx => {
  ctx.body = await slApiService.getDepartures('9309')
})
