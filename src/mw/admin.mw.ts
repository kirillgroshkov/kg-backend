import * as fs from 'fs-extra'
import { Context, Middleware } from 'koa'
import { staticDir } from '../cnst/paths.cnst'
import { env } from '../environment/environment'
import { adminService } from '../srv/admin.service'

export const adminMiddleware = (): Middleware => async (ctx: Context, next: Function) => {
  if (env().authEnabled) {
    const auth = await adminService.isAuthenticated(ctx)
    if (!auth) {
      ctx.body = await fs.readFile(staticDir + '/needsLogin.html', 'utf-8')
      ctx.response.status = 401
      return
    }

    if (!await adminService.isAdmin(ctx)) {
      return ctx.throw(403)
    }
  }

  await next()
}
