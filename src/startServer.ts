console.log('startServer...')
const bootstrapStarted = Date.now()

import { api } from '@src/api'
import { env } from '@src/environment/environment'
import { loadSecretsFromEnv } from '@src/environment/secret'
import { dontsleepService } from '@src/srv/dontsleep.service'
import { sentryService } from '@src/srv/sentry.service'

if (!env().dev) {
  console.log(env())
}

Promise.resolve()
  .then(() => setup())
  .then(() => api.listen(env().port))
  .then(() => {
    api.serverStartedMillis = api.serverStarted - bootstrapStarted
    console.log(
      `server started in ${api.serverStartedMillis} ms on port ${env().port}`,
    )
  })
  .catch(err => {
    console.error('Error in startServer', err)
  })

////

async function setup (): Promise<void> {
  require('dotenv').config()
  loadSecretsFromEnv()
  sentryService.init()
  if (env().prod) dontsleepService.start()
  // firestoreService.init()
  // securityService.cleanupEnv()
}
