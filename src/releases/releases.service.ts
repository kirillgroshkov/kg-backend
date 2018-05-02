import { QuerySnapshot } from '@google-cloud/firestore'
import { memo } from '@src/decorators/memo.decorator'
import { Resp } from '@src/releases/resp'
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
  lastStarredRepo = 'lastStarredRepo',
}

export enum ReleaseType {
  RELEASE = 'RELEASE',
  TAG = 'TAG',
}

export interface Release {
  // `${repoOwner}_${repoName}_${v}`
  id: string
  name?: string
  repoFullName: string
  created: number
  published: number
  v: string // semver
  tagName: string // can include 'v' or not
  descr: string // markdown
  // githubId: number
  // githubUrl: string
  type: ReleaseType
}

export interface Tag {
  // `${repoOwner}_${repoName}_${v}`
  id: string
  v: string // semver
  tagName: string // can include 'v' or not
  commitUrl: string
}

export interface Repo {
  githubId: number
  fullName: string
  descr: string
  homepage: string
  stargazersCount: number
  avatarUrl: string
}

export interface RepoMap {
  [fullName: string]: Repo
}

const concurrency = 8

class ReleasesService {
  async test (): Promise<any> {
    if (1 === 1) return // disabled
    const since = Math.floor(
      DateTime.local()
        .minus({ days: 7 })
        .valueOf() / 1000,
    )
    const r = await githubService.getReleases(await this.getEtagMap(), 'sindresorhus/p-queue', since)
    return r
  }

  async cronUpdate (_since?: number): Promise<any> {
    console.log('ReleasesService cronUpdate')

    /* _since = Math.floor(
      DateTime.local()
        .minus({ days: 2 })
        .valueOf() / 1000)*/

    const since = _since || (await this.getLastCheckedReleases())
    const resp = Resp.create<Release>()

    if (resp.started / 1000 - since < 180)
      return {
        err: 'cronUpdate was called recently',
      }

    const etagMap = await this.getEtagMap()

    const repos = await this.getStarredRepos(etagMap)
    // const repos = await this.getCachedStarredRepos() // to speedup things
    let processed = 0

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
        const releasesResp = await githubService.getReleases(etagMap, repo.fullName, since)
        resp.add(releasesResp)
        const releases = releasesResp.body
        if (releases.length) {
          resp.firestoreWrites += releases.length
          await firestoreService.saveBatch('releases', releases)
          // console.log(`newReleases: ${resp.body.length}`)
        }

        processed++
        if (processed % 100 === 0) {
          console.log(`*** processed: ${processed}`)
          resp.log()
          resp.firestoreWrites++
          cacheService.set(CacheKey.etagMap, etagMap) // async
        }
      },
      { concurrency },
    )

    const newReleases = resp.body
    if (newReleases.length) {
      // Save to DB
      // await firestoreService.saveBatch('releases', newReleases)

      // Slack notification
      const t: string[] = []
      if (newReleases.length > 1) t.push(`${newReleases.length} releases`)
      t.push(...newReleases.map(r => `${r.repoFullName}@${r.v}`))

      slackService.send(t.join('\n')) // async
    }

    const lastCheckedReleases = Math.round(resp.started / 1000)
    resp.firestoreWrites += 2
    cacheService.set(CacheKey.etagMap, etagMap) // async
    cacheService.set(CacheKey.lastCheckedReleases, lastCheckedReleases) // async

    resp.finish()
    const logMsg = [
      'lastCheckedReleases: ' + timeUtil.unixtimePretty(lastCheckedReleases),
      'newReleases: ' + newReleases.length,
      'etagMap items: ' + Object.keys(etagMap).length,
      'starred repos: ' + repos.length,
      ...resp.getLog(),
      ``,
    ].join('\n')

    console.log(logMsg)
    // const githubRateLimit = await githubService.getRateLimit()
    // console.log(githubRateLimit)
    // debug
    slackService.send(logMsg) // async

    return resp
  }

  async getLastCheckedReleases (): Promise<number> {
    const since = Math.floor(
      DateTime.local()
        .minus({ days: 7 })
        .valueOf() / 1000,
    )
    return await cacheService.getOrDefault<number>(CacheKey.lastCheckedReleases, since)
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
    const lastStarredRepo = await cacheService.get<string>(CacheKey.lastStarredRepo)
    const repos = await githubService.getStarred(etagMap, lastStarredRepo)
    if (repos) {
      if (repos.length) {
        console.log('starred repos CHANGED')
        cacheService.set(CacheKey.lastStarredRepo, repos[0].fullName)
        cacheService.set(CacheKey.starredRepos, repos) //  async
        cacheService.set(CacheKey.etagMap, etagMap) // async
      } else {
        console.log('starred repos CHANGED, but returned zero!?')
      }
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

    const p = await P.props({
      feed: firestoreService.runQuery<Release>(q),
      rmap: this.getCachedStarredReposMap(),
      rateLimit: githubService.getRateLimit(),
      lastCheckedReleases: cacheService.get<number>(CacheKey.lastCheckedReleases),
    })

    const releases = p.feed.map(r => {
      return {
        // ...objectUtil.pick(r, FEED_FIELDS),
        ...r,
        avatarUrl: (p.rmap[r.repoFullName] || {}).avatarUrl,
        // publishedAt: timeUtil.unixtimePretty(r.published),
        // createdAt: timeUtil.unixtimePretty(r.created),
      }
    })

    return {
      lastCheckedReleases: p.lastCheckedReleases,
      rateLimit: p.rateLimit,
      starredRepos: Object.keys(p.rmap).length,
      lastStarred: Object.keys(p.rmap).slice(0, 10),
      releases,
    }
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
