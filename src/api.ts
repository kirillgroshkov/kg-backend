import { staticDir } from '@src/cnst/paths.cnst'
import { memo } from '@src/decorators/memo.decorator'
import { editorResource } from '@src/editor/editor.resource'
import { errorHandlerMiddleware } from '@src/mw/errorHandler.mw'
import { rootResource } from '@src/root.resource'
import { slResource } from '@src/sl/sl.resource'
import { sentryService } from '@src/srv/sentry.service'
import { Middleware } from 'koa'
import * as Koa from 'koa'
import * as koaBody from 'koa-body'
import * as koaJson from 'koa-json'
import * as koaLogger from 'koa-logger'
const koaCors = require('@koa/cors')
const koaStatic = require('koa-static')

const MIDDLEWARES: Middleware[] = [
  // Middlewares
  errorHandlerMiddleware(),
  koaLogger(),
  koaBody(),
  koaJson(),
  koaCors({
    credentials: true,
  }),
  // serveFile('/login', staticDir + '/login.html'),
  koaStatic(staticDir),
  // Resources
  rootResource,
  editorResource,
  slResource,
]

class Api {
  serverStarted: number = undefined as any
  serverStartedMillis: number = undefined as any

  @memo()
  app (): Koa {
    console.log('Api init...')
    const app = new Koa()

    MIDDLEWARES.forEach(r => app.use(r))

    app.on('error', err => {
      console.log(err)
      sentryService.captureException(err)
    })

    return app
  }

  @memo()
  async listen (port: number): Promise<void> {
    await new Promise(resolve => {
      this.app().listen(port, () => {
        this.serverStarted = Date.now()
        resolve()
      })
    })
  }
}

export const api = new Api()
