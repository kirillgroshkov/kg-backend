import { staticDir } from '@src/cnst/paths.cnst'
import { memo } from '@src/decorators/memo.decorator'
import { editorResource } from '@src/editor/editor.resource'
import { errorHandlerMiddleware } from '@src/mw/errorHandler.mw'
import { releasesResource } from '@src/releases/releases.resource'
import { rootResource } from '@src/root.resource'
import { slResource } from '@src/sl/sl.resource'
import { sentryService } from '@src/srv/sentry.service'
import { Server } from 'http'
import * as http from 'http'
import * as Koa from 'koa'
import { Middleware } from 'koa'
import * as koaBody from 'koa-body'
import * as koaJson from 'koa-json'
import * as koaLogger from 'koa-logger'
import * as socketIo from 'socket.io'
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
  releasesResource,
]

class Api {
  serverStarted: number = undefined as any
  serverStartedMillis: number = undefined as any
  io: SocketIO.Server = undefined as any

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

  private setupSocketIo (server: Server): void {
    this.io = socketIo(server)
    this.io.on('connection', socket => {
      console.log('io connection: ' + socket.id)

      /*const i = setInterval(() => {
        console.log('sending yohoho')
        socket.emit('yohoho', { a: 'b' })
      }, 1000)*/

      socket.on('disconnect', () => {
        console.log('io disconnected: ' + socket.id)
        // clearTimeout(i)
      })

      socket.on('hejj', () => {
        console.log('hejj!')
      })
    })
  }

  @memo()
  async listen (port: number): Promise<void> {
    await new Promise(resolve => {
      const server = http.createServer(this.app().callback())

      this.setupSocketIo(server)

      server.listen(port, () => {
        this.serverStarted = Date.now()
        resolve()
      })
    })
  }
}

export const api = new Api()
