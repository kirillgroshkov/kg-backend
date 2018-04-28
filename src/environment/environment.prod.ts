import { CacheAdapter } from '@src/srv/cache/cache.service'
import { FirestoreCacheAdapter } from '@src/srv/cache/firestore.cache.adapter'
import { MapCacheAdapter } from '@src/srv/cache/map.cache.adapter'

export class EnvironmentProd {
  name = 'prod'
  prod = true
  dev = false

  port = 8000

  sentryDsn:
    | string
    | undefined = 'https://4434a43b3ce348fa90230c94f63bf0d5:e816e3e4964e4822a602d95c32599929@sentry.io/286298'

  authEnabled = true

  slackWebhookUrl: string | undefined = 'https://hooks.slack.com/services/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'

  cacheAdapters: CacheAdapter[] = [new MapCacheAdapter(), new FirestoreCacheAdapter('cache')]
}

export type Environment = EnvironmentProd

export default new EnvironmentProd()
