import * as fs from 'fs-extra'
import { Context, Middleware } from 'koa'

export const serveFile = (url: string, path: string): Middleware => async (ctx: Context, next: Function) => {
  console.log(ctx)
  console.log(ctx.request)
  if (ctx.request.url === url) {
    ctx.body = await fs.readFile(path, 'utf-8')
  } else {
    await next()
  }
}
