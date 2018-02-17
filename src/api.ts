import { Middleware } from 'koa'
import * as Koa from 'koa'
import * as koaBody from 'koa-body'
import * as koaJson from 'koa-json'
import * as koaLogger from 'koa-logger'
import { staticDir } from './cnst/paths.cnst'
import { memo } from './decorators/memo.decorator'
import { editorResource } from './editor/editor.resource'
import { rootResource } from './root.resource'
import { slResource } from './sl/sl.resource'
import { sentryService } from './srv/sentry.service'
const koaCors = require('@koa/cors')
const koaStatic = require('koa-static')

const MIDDLEWARES: Middleware[] = [
  // Middlewares
  koaLogger(),
  koaBody(),
  koaJson(),
  koaCors(),
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
      console.log('Koa app on-error: ', err)
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
