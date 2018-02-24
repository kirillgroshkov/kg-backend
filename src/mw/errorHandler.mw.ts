import { Context, Middleware } from 'koa'

export function errorHandlerMiddleware (): Middleware {
  return async function errorHandler (ctx: Context, next: Function) {
    try {
      await next()
    } catch (err) {
      err.expose = true
      // console.log('errorHandler err: ', err)
      ctx.status = err.status || 500
      ctx.body = ['Server error', err.stack ? err.stack : err.message].join(
        '\n\n',
      )
      ctx.app.emit('error', err, ctx)
    }
  }
}
