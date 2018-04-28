console.log('startServer...')
const bootstrapStarted = Date.now()

/* tslint:disable:ordered-imports */
import 'reflect-metadata'
import '@src/polyfills'
import { api } from '@src/api'
import { env } from '@src/environment/environment'
import { secretInit } from '@src/environment/secret'
import { releasesService } from '@src/releases/releases.service'
import { cacheService } from '@src/srv/cache/cache.service'
import { dontsleepService } from '@src/srv/dontsleep.service'
import { sentryService } from '@src/srv/sentry.service'
import * as nodeSchedule from 'node-schedule'

Promise.resolve()
  .then(() => setup())
  .then(() => api.listen(env().port))
  .then(() => {
    api.serverStartedMillis = api.serverStarted - bootstrapStarted
    console.log(`server started in ${api.serverStartedMillis} ms on port ${env().port}`)
  })
  .catch(err => {
    console.error('Error in startServer', err)
  })

////

async function setup (): Promise<void> {
  if (!env().dev) {
    console.log(env())
  }

  secretInit()
  sentryService.init()
  cacheService.adapters = env().cacheAdapters

  if (env().prod) {
    // Don't sleep :)
    nodeSchedule.scheduleJob('* * * * *', () => dontsleepService.run())

    // Update github releases
    nodeSchedule.scheduleJob('*/10 * * * *', () => releasesService.cronUpdate())
  }
}
