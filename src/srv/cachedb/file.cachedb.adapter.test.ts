import { FileCacheDBAdapter } from '@src/srv/cachedb/file.cachedb.adapter'

test('test1', async () => {
  const a = new FileCacheDBAdapter(__dirname)
  // const keys = await a.keys()
  // console.log(await a.keys())
  // console.log(await a.tables())
  console.log(await a.entries('cacheDB'))
})
