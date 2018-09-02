import { cacheDir } from '@src/cnst/paths.cnst'
import { CacheDBAdapter } from '@src/srv/cachedb/cachedb'
import { FileCacheDBAdapter } from '@src/srv/cachedb/file.cachedb.adapter'
import { FirestoreCacheDBAdapter } from '@src/srv/cachedb/firestore.cachedb.adapter'
import { MapCacheDBAdapter } from '@src/srv/cachedb/map.cachedb.adapter'
import { EnvironmentProd } from './environment.prod'

export class EnvironmentDev extends EnvironmentProd {
  name = 'dev'
  prod = false
  dev = true

  sentryDsn = undefined

  authEnabled = false

  cacheDBAdapters: CacheDBAdapter[] = [
    new MapCacheDBAdapter(),
    new FileCacheDBAdapter(cacheDir),
    new FirestoreCacheDBAdapter(),
  ]

  cacheDBDefaultTtl: number | undefined = 3600 // 1 hour
}

export const _envDev = new EnvironmentDev()
