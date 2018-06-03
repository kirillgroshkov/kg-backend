console.log('startServer...')
const bootstrapStarted = Date.now()

/* tslint:disable:ordered-imports */
import 'reflect-metadata'
import '@src/polyfills'
import { api } from '@src/api'
import { env } from '@src/environment/environment'
import { secretInit } from '@src/environment/secret'
import { releasesService } from '@src/releases/releases.service'
import { cacheDB } from '@src/srv/cachedb/cachedb'
import { dontsleepService } from '@src/srv/dontsleep.service'
import { sentryService } from '@src/srv/sentry.service'
import { SLACK_CHANNEL, slackService } from '@src/srv/slack.service'
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

  cacheDB.adapters = env().cacheDBAdapters
  cacheDB.defaultTtl = env().cacheDBDefaultTtl

  if (env().prod) {
    // Don't sleep :)
    nodeSchedule.scheduleJob('* * * * *', () => dontsleepService.run())

    // Update github releases
    nodeSchedule.scheduleJob('*/20 * * * *', () => releasesService.cronUpdate())
    // nodeSchedule.scheduleJob('0 * * * *', () => releasesService.cronUpdate())

    // Email of new releases daily
    nodeSchedule.scheduleJob('0 0 * * *', () => releasesService.emailNotifyNewReleasesDaily())

    slackService.send('server started', SLACK_CHANNEL.info) // async
  }
}
