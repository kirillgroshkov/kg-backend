import { env } from '@src/environment/environment'
import { releasesDao } from '@src/releases/releases.dao'
import { firebaseStorageCacheDB } from '@src/srv/cachedb/cachedb'

test('test1', async () => {
  // firebaseStorageCacheDB.adapters = env().firebaseStorageCacheDBAdapters
  const etagMap = { a: 'bbb' }
  await releasesDao.saveEtagMap(etagMap)
})
