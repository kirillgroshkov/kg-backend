console.log('startServer...')
const bootstrapStarted = Date.now()

import { api } from './api'
import { env } from './environment/environment'
import { loadSecretsFromEnv } from './environment/secret'
import { sentryService } from './srv/sentry.service'

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
  // firestoreService.init()
  // securityService.cleanupEnv()
}
