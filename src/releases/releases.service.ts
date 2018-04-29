import { QuerySnapshot } from '@google-cloud/firestore'
import { memo } from '@src/decorators/memo.decorator'
import { cacheService } from '@src/srv/cache/cache.service'
import { firestoreService } from '@src/srv/firestore.service'
import { githubService } from '@src/srv/github.service'
import { slackService } from '@src/srv/slack.service'
import { StringMap } from '@src/typings/other'
import { objectUtil } from '@src/util/object.util'
import { timeUtil } from '@src/util/time.util'
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
  avatarUrl: string
}

export interface RepoMap { [fullName: string]: Repo }

const concurrency = 8

class ReleasesService {
  async cronUpdate (_since?: number): Promise<any> {
    console.log('ReleasesService cronUpdate')
    const since = _since || (await this.getLastCheckedReleases())
    const started = Date.now()
    const newReleases: Release[] = []

    if (started / 1000 - since < 180)
      return {
        err: 'cronUpdate was called recently',
      }

    const etagMap = await this.getEtagMap()

    const repos = await this.getStarredRepos(etagMap)
    // const repos = await this.getCachedStarredRepos() // to speedup things

    console.log(
      [
        'since: ' + timeUtil.unixtimePretty(since),
        'etagMap items: ' + Object.keys(etagMap).length,
        'starred repos: ' + repos.length,
      ].join('\n'),
    )

    await P.map(
      repos,
      async repo => {
        const releases = await githubService.getReleases(etagMap, repo.fullName, since)
        if (releases && releases.length) {
          // await firestoreService.saveBatch('releases', releases)
          newReleases.push(...releases)
          console.log(`newReleases: ${newReleases.length}`)
        }
      },
      { concurrency },
    )

    if (newReleases.length) {
      // Save to DB
      await firestoreService.saveBatch('releases', newReleases)

      // Slack notification
      const t: string[] = []
      if (newReleases.length > 1) t.push(`${newReleases.length} releases`)
      t.push(...newReleases.map(r => `${r.repoFullName}@${r.v}`))

      slackService.send(t.join('\n')) // async
    }

    const lastCheckedReleases = Math.round(started / 1000)
    cacheService.set(CacheKey.etagMap, etagMap) // async
    cacheService.set(CacheKey.lastCheckedReleases, lastCheckedReleases) // async

    const millis = Date.now() - started
    const logMsg = [
      `Finished in ${millis} ms`,
      'lastCheckedReleases: ' + timeUtil.unixtimePretty(lastCheckedReleases),
      'newReleases: ' + newReleases.length,
      'etagMap items: ' + Object.keys(etagMap).length,
      'starred repos: ' + repos.length,
    ].join('\n')

    console.log(logMsg)
    // debug
    slackService.send(logMsg) // async

    return newReleases
  }

  async getLastCheckedReleases (): Promise<number> {
    const yesterday = Math.floor(
      DateTime.local()
        .minus({ days: 7 })
        .valueOf() / 1000,
    )
    return await cacheService.getOrDefault<number>(CacheKey.lastCheckedReleases, yesterday)
  }

  async getEtagMap (): Promise<StringMap> {
    return cacheService.getOrDefault<StringMap>(CacheKey.etagMap, {})
  }

  async getCachedStarredReposMap (): Promise<RepoMap> {
    const repos = await this.getCachedStarredRepos()
    const r: RepoMap = {}
    repos.forEach(repo => (r[repo.fullName] = repo))
    return r
  }

  async getCachedStarredRepos (): Promise<Repo[]> {
    return cacheService.getOrDefault(CacheKey.starredRepos, [])
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

  @memo({
    ttl: 60000,
  })
  async getFeed (): Promise<any> {
    const q = firestoreService
      .db()
      .collection('releases')
      .orderBy('published', 'desc')
      .limit(100)
    const feed = await firestoreService.runQuery<Release>(q)
    const rmap = await this.getCachedStarredReposMap()

    return feed.map(r => {
      return {
        ...objectUtil.pick(r, FEED_FIELDS),
        avatarUrl: (rmap[r.repoFullName] || {}).avatarUrl,
        // publishedAt: timeUtil.unixtimePretty(r.published),
        // createdAt: timeUtil.unixtimePretty(r.created),
      }
    })
  }
}

export const releasesService = new ReleasesService()

const FEED_FIELDS: string[] = [
  'repoFullName',
  'descr',
  'v',
  'published',
  'created',
  // 'githubId',
  'avatarUrl',
]
