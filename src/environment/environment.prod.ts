import { CacheDBAdapter } from '@src/srv/cachedb/cachedb'
import { FirestoreCacheDBAdapter } from '@src/srv/cachedb/firestore.cachedb.adapter'
import { MapCacheDBAdapter } from '@src/srv/cachedb/map.cachedb.adapter'

export class EnvironmentProd {
  name = 'prod'
  prod = true
  dev = false

  port = 8000

  sentryDsn: string | undefined =
    'https://4434a43b3ce348fa90230c94f63bf0d5:e816e3e4964e4822a602d95c32599929@sentry.io/286298'

  authEnabled = true

  slackWebhookUrl: string | undefined = 'https://hooks.slack.com/services/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'

  cacheDBAdapters: CacheDBAdapter[] = [new MapCacheDBAdapter(), new FirestoreCacheDBAdapter()]
  cacheDBDefaultTtl: number | undefined = undefined

  firebaseStorageBucketName = 'test124-1621f.appspot.com'
}

export type Environment = EnvironmentProd

export default new EnvironmentProd()
