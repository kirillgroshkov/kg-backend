import { FirebaseStorageCacheDBAdapter } from '@src/srv/cachedb/firebase.storage.cachedb.adapter'

test('test1', async () => {
  const a = new FirebaseStorageCacheDBAdapter()
  const etagMap = { a: 'bbb' }
  await a.set('test123', etagMap)
})
