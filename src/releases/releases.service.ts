import { QuerySnapshot } from '@google-cloud/firestore'
import { cacheService } from '@src/srv/cache/cache.service'
import { firestoreService } from '@src/srv/firestore.service'
import { githubService } from '@src/srv/github.service'
import { StringMap } from '@src/typings/other'
import * as P from 'bluebird'
import { DateTime } from 'luxon'

export enum CacheKey {
  etagMap = 'etagMap',
  starredRepos = 'starredRepos',
  lastCheckedReleases = 'lastCheckedReleases',
}

export interface Release {
  // `${repoOwner}_${repoName}_${v}`
  id: string
  repoFullName: string
  created: number
  published: number
  v: string // semver
  descr: string // markdown
  githubId: number
  // githubUrl: string
}

export interface Repo {
  githubId: number
  fullName: string
  descr: string
  homepage: string
  stargazersCount: number
}

const concurrency = 8

class ReleasesService {
  async cronUpdate (_since?: number): Promise<any> {
    const yesterday = Math.floor(
      DateTime.local()
        .minus({ days: 365 })
        .valueOf() / 1000,
    )
    const since = _since || (await cacheService.getOrDefault<number>(CacheKey.lastCheckedReleases, yesterday))
    const started = Date.now()

    if (started / 1000 - since < 180)
      return {
        err: 'cronUpdate was called recently',
      }

    const etagMap = await this.getEtagMap()

    const repos = await this.getStarredRepos(etagMap)
    // const repos = await this.getCachedStarredRepos() // to speedup things

    console.log(
      [
        'since: ' + DateTime.fromMillis(since * 1000).toISO(),
        'etagMap items: ' + Object.keys(etagMap).length,
        'starred repos: ' + repos.length,
      ].join('\n'),
    )

    let saved = 0
    await P.map(
      repos,
      async repo => {
        const releases = await githubService.getReleases(etagMap, repo.fullName, since)
        if (releases) {
          await firestoreService.saveBatch('releases', releases)
          saved += releases.length
        }
      },
      { concurrency },
    )

    cacheService.set(CacheKey.etagMap, etagMap) // async
    const lastCheckedReleases = Math.round(started / 1000)
    cacheService.set(CacheKey.lastCheckedReleases, lastCheckedReleases) // async

    console.log(
      [
        'lastCheckedReleases: ' + DateTime.fromMillis(lastCheckedReleases * 1000).toISO(),
        'saved: ' + saved,
        'etagMap items: ' + Object.keys(etagMap).length,
        'starred repos: ' + repos.length,
      ].join('\n'),
    )

    return { saved }
  }

  async getCachedStarredRepos (): Promise<Repo[]> {
    return cacheService.getOrDefault(CacheKey.starredRepos, [])
  }

  async getEtagMap (): Promise<StringMap> {
    return cacheService.getOrDefault<StringMap>(CacheKey.etagMap, {})
  }

  async getStarredRepos (etagMap: StringMap): Promise<Repo[]> {
    const repos = await githubService.getStarred(etagMap)
    if (repos) {
      console.log('starred repos CHANGED')
      // changed!
      cacheService.set(CacheKey.starredRepos, repos) //  async
      cacheService.set(CacheKey.etagMap, etagMap) // async
      return repos
    } else {
      console.log('starred repos not changed')
      return this.getCachedStarredRepos()
    }
  }

  async getFeed (): Promise<any> {
    const q = firestoreService
      .db()
      .collection('releases')
      .orderBy('created', 'desc')
      .limit(100)
    const feed = await firestoreService.runQuery(q)
    return feed.map(r => {
      return {
        ...r,
        createdAt: DateTime.fromMillis(r.created * 1000).toISO(),
      }
    })
  }
}

export const releasesService = new ReleasesService()
