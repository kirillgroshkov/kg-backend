console.log('startServer...')
const bootstrapStarted = Date.now()

/* tslint:disable:ordered-imports */
import 'reflect-metadata'
import '@src/polyfills'
import { api } from '@src/api'
import { cacheDir } from '@src/cnst/paths.cnst'
import { env } from '@src/environment/environment'
import { secretInit } from '@src/environment/secret'
import { releasesService } from '@src/releases/releases.service'
import { fireStorageCacheDB, firestoreCacheDB } from '@src/srv/cachedb2/cachedb2'
import { FileCacheDB2Adapter } from '@src/srv/cachedb2/file.cachedb2.adapter'
import { FireStorageCachedb2Adapter } from '@src/srv/cachedb2/fireStorage.cachedb2.adapter'
import { FirestoreCacheDB2Adapter } from '@src/srv/cachedb2/firestore.cachedb2.adapter'
import { MapCacheDB2Adapter } from '@src/srv/cachedb2/map.cachedb2.adapter'
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
    process.exit(-1)
  })

////

async function setup (): Promise<void> {
  if (!env().dev) {
    console.log(env())
  }

  secretInit()
  sentryService.init()

  if (env().prod) {
    firestoreCacheDB.adapters = [new MapCacheDB2Adapter(), new FirestoreCacheDB2Adapter()]
    fireStorageCacheDB.adapters = [new MapCacheDB2Adapter(), new FireStorageCachedb2Adapter(true)]
  } else {
    // dev
    firestoreCacheDB.adapters = [
      new MapCacheDB2Adapter(),
      // new FileCacheDB2Adapter({cacheDirPath: cacheDir}),
      new FirestoreCacheDB2Adapter(),
    ]
    fireStorageCacheDB.adapters = [
      new MapCacheDB2Adapter(),
      // new FileCacheDB2Adapter({cacheDirPath: cacheDir}),
      new FireStorageCachedb2Adapter(true),
    ]
  }

  if (env().prod) {
    // Don't sleep :)
    nodeSchedule.scheduleJob('* * * * *', () => dontsleepService.run())

    // Update github releases
    nodeSchedule.scheduleJob('0 */2 * * *', () => releasesService.cronUpdate())
    // nodeSchedule.scheduleJob('0 * * * *', () => releasesService.cronUpdate())

    // Email of new releases daily
    nodeSchedule.scheduleJob('0 0 * * *', () => releasesService.emailNotifyNewReleasesDaily())

    slackService.send('server started', SLACK_CHANNEL.info) // async
  }
}
