import { cacheDir } from '@src/cnst/paths.cnst'
import { CacheDB2 } from '@src/srv/cachedb2/cachedb2'
import { FileCacheDB2Adapter } from '@src/srv/cachedb2/file.cachedb2.adapter'
import { FirebaseStorageCacheDB2Adapter } from '@src/srv/cachedb2/firebase.storage.cachedb2.adapter'
import { FirestoreCacheDB2Adapter } from '@src/srv/cachedb2/firestore.cachedb2.adapter'
import { MapCacheDB2Adapter } from '@src/srv/cachedb2/map.cachedb2.adapter'

test('map', async () => {
  const c = new CacheDB2([new MapCacheDB2Adapter()])
  await runTests(c, 'tbl1')
})

test('file', async () => {
  let c = new CacheDB2([
    new FileCacheDB2Adapter({
      cacheDirPath: cacheDir,
    }),
  ])
  await runTests(c, 'tbl1')

  // Together with map adapter
  c = new CacheDB2([
    new MapCacheDB2Adapter(),
    new FileCacheDB2Adapter({
      cacheDirPath: cacheDir,
    }),
  ])
  await runTests(c, 'tbl1')
})

test(
  'firebaseStorage',
  async () => {
    let c = new CacheDB2([new FirebaseStorageCacheDB2Adapter()])
    await runTests(c, 'tbl1')

    // Together with map adapter
    c = new CacheDB2([new MapCacheDB2Adapter(), new FirebaseStorageCacheDB2Adapter()])
    await runTests(c, 'tbl1')
  },
  120000,
)

test(
  'firestore',
  async () => {
    let c = new CacheDB2([new FirestoreCacheDB2Adapter()])
    await runTests(c, 'tbl1')

    // Together with map adapter
    c = new CacheDB2([new MapCacheDB2Adapter(), new FirestoreCacheDB2Adapter()])
    await runTests(c, 'tbl1')
  },
  120000,
)

async function runTests (c: CacheDB2, table?: string) {
  await c.clear(table)

  // String
  expect(await c.getString('k1', table)).toBeUndefined()

  await c.delete('k1', table)
  expect(await c.getString('k1', table)).toBeUndefined()

  await c.setString('k1', 'v1', table)
  expect(await c.getString('k1', table)).toBe('v1')
  expect(await c.getString('k1', table)).toBe('v1')
  await c.setString('k1', 'v11', table)
  expect(await c.getString('k1', table)).toBe('v11')
  await c.delete('k1', table)
  expect(await c.getString('k1', table)).toBeUndefined()

  // Object
  expect(await c.getObject('o1', table)).toBeUndefined()
  await c.setObject('o1', { a: 'b' }, table)
  expect(await c.getObject('o1', table)).toEqual({ a: 'b' })
  await c.delete('o1', table)

  // Buffer
  const b1 = Buffer.from('abcd')
  expect(await c.get('b1', table)).toBeUndefined()
  await c.set('b1', b1, table)
  expect(await c.get('b1', table)).toEqual(b1)
  expect(await c.keys(table)).toEqual(['b1'])
  await c.clear(table)
  expect(await c.get('b1', table)).toBeUndefined()
  expect(await c.keys(table)).toEqual([])

  if (table) {
    // expect((await c.tables()).includes(table)).toBeTruthy()
  }
}
