import { githubService } from '@src/releases/github.service'
import { releasesDao } from '@src/releases/releases.dao'
import { cacheDB } from '@src/srv/cachedb/cachedb'
import { FirestoreCacheDBAdapter } from '@src/srv/cachedb/firestore.cachedb.adapter'
import { MapCacheDBAdapter } from '@src/srv/cachedb/map.cachedb.adapter'

test('empty', () => {})

test.skip('getUserStarredRepos', async () => {
  cacheDB.adapters = [new MapCacheDBAdapter(), new FirestoreCacheDBAdapter()]
  const u = await releasesDao.getUser('10R6sW9PC2PrsLkSwmTmgwX68kD3')
  // console.log(u)
  delete u.lastStarredRepo
  const repos = await githubService.getUserStarredRepos(u, {})
  console.log(repos)
})
