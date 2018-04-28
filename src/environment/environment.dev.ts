import { cacheDir } from '@src/cnst/paths.cnst'
import { CacheAdapter } from '@src/srv/cache/cache.service'
import { FileCacheAdapter } from '@src/srv/cache/file.cache.adapter'
import { FirestoreCacheAdapter } from '@src/srv/cache/firestore.cache.adapter'
import { MapCacheAdapter } from '@src/srv/cache/map.cache.adapter'
import { EnvironmentProd } from './environment.prod'

export class EnvironmentDev extends EnvironmentProd {
  name = 'dev'
  prod = false
  dev = true

  sentryDsn = undefined

  authEnabled = false

  cacheAdapters: CacheAdapter[] = [
    new MapCacheAdapter(),
    new FileCacheAdapter(cacheDir),
    new FirestoreCacheAdapter('cache'),
  ]
}

export default new EnvironmentDev()
