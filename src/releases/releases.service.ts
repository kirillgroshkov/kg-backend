import { QuerySnapshot } from '@google-cloud/firestore'
import { cacheDir } from '@src/cnst/paths.cnst'
import { memo } from '@src/decorators/memo.decorator'
import { Resp } from '@src/releases/resp'
import { cacheDB } from '@src/srv/cachedb/cachedb'
import { firebaseService } from '@src/srv/firebase.service'
import { firestoreService } from '@src/srv/firestore.service'
import { githubService } from '@src/srv/github.service'
import { slackService } from '@src/srv/slack.service'
import { StringMap } from '@src/typings/other'
import { jsonify, objectUtil } from '@src/util/object.util'
import { timeUtil } from '@src/util/time.util'
import * as P from 'bluebird'
import { IRouterContext } from 'koa-router'
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
  starredAt: number
}

export interface RepoMap {
  [fullName: string]: Repo
}

export interface AuthInput {
  username: string
  accessToken: string
  idToken: string
}

export interface UserInfo {
  id: string
  username: string
  accessToken: string
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

  async cronUpdate (_since?: number, noLog = true): Promise<any> {
    // noLog = false
    /*_since = Math.floor(
      DateTime.local()
        .minus({ months: 5 })
        .valueOf() / 1000)*/

    const since = _since || (await this.getLastCheckedReleases())
    console.log('ReleasesService cronUpdate since: ' + timeUtil.unixtimePretty(since))
    const resp = Resp.create<Release>()

    if (resp.started / 1000 - since < 180)
      return {
        err: 'cronUpdate was called recently',
      }

    const etagMap = await this.getEtagMap()

    const repos = await this.getStarredRepos(etagMap)
    // const repos = await this.getCachedStarredRepos() // to speedup things
    let processed = 0
    let etagsSaved = 0

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
        const releasesResp = await githubService.getReleases(etagMap, repo.fullName, since, noLog)
        resp.add(releasesResp)
        const releases = releasesResp.body
        if (releases.length) {
          resp.firestoreWrites += releases.length
          await firestoreService.saveBatch('releases', releases)
          // console.log(`newReleases: ${resp.body.length}`)
        }

        // Save etags after each 100 cache misses
        if (resp.githubRequests > etagsSaved + 100) {
          etagsSaved = resp.githubRequests
          resp.firestoreWrites++
          cacheDB.set(CacheKey.etagMap, etagMap) // async
        }

        processed++
        if (processed % 100 === 0) {
          console.log(`*** processed: ${processed}`)
          resp.log()
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
    cacheDB.set(CacheKey.etagMap, etagMap) // async
    cacheDB.set(CacheKey.lastCheckedReleases, lastCheckedReleases) // async

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
    return await cacheDB.getOrDefault<number>(CacheKey.lastCheckedReleases, since)
  }

  async getEtagMap (): Promise<StringMap> {
    return cacheDB.getOrDefault<StringMap>(CacheKey.etagMap, {})
  }

  async getCachedStarredReposMap (): Promise<RepoMap> {
    const repos = await this.getCachedStarredRepos()
    const r: RepoMap = {}
    repos.forEach(repo => (r[repo.fullName] = repo))
    return r
  }

  async getCachedStarredRepos (): Promise<Repo[]> {
    return cacheDB.getOrDefault(CacheKey.starredRepos, [])
  }

  async getUserInfo (uid: string): Promise<UserInfo> {
    return cacheDB.get(`user_${uid}`)
  }

  async getUserInfoFromContext (ctx: IRouterContext): Promise<UserInfo> {
    // Skip tight security for now, use just 'uid' header from ctx
    /*
    const idToken = ctx.get('idToken')
    if (!idToken) return Promise.reject(new Error('idToken required'))
    const d = await firebaseService.verifyIdToken(idToken)
    const u = await this.getUserInfo(d.uid)*/
    const uid = ctx.get('uid')
    if (!uid) return Promise.reject(new Error('uid required'))
    const u = await this.getUserInfo(uid)
    console.log(`${u.id} ${u.username}`)
    return u
  }

  async getStarredRepos (etagMap: StringMap): Promise<Repo[]> {
    const lastStarredRepo = await cacheDB.get<string>(CacheKey.lastStarredRepo)
    const repos = await githubService.getStarred(etagMap, lastStarredRepo)
    if (repos) {
      if (repos.length) {
        console.log('starred repos CHANGED')
        cacheDB.set(CacheKey.lastStarredRepo, repos[0].fullName)
        cacheDB.set(CacheKey.starredRepos, repos) //  async
        cacheDB.set(CacheKey.etagMap, etagMap) // async
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
  async getFeed (ctx: IRouterContext, limit = 100): Promise<any> {
    const userInfo = await this.getUserInfoFromContext(ctx)

    const q = firestoreService
      .db()
      .collection('releases')
      .orderBy('published', 'desc')
      .limit(limit)

    const p = await P.props({
      feed: firestoreService.runQuery<Release>(q),
      rmap: this.getCachedStarredReposMap(),
      rateLimit: githubService.getRateLimit(),
      lastCheckedReleases: cacheDB.get<number>(CacheKey.lastCheckedReleases),
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

  /*@memo({
    ttl: 60000,
  })*/
  async getRepos (): Promise<Repo[]> {
    const repos = await this.getCachedStarredRepos()
    return repos
  }

  async getReleasesByRepo (owner: string, name: string, limit = 100): Promise<Release[]> {
    const repoFullName = [owner, name].join('/')

    const q = firestoreService
      .db()
      .collection('releases')
      .where('repoFullName', '==', repoFullName)
      .orderBy('published', 'desc')
      .limit(limit)

    return firestoreService.runQuery<Release>(q)
  }

  async fetchReleasesByRepo (owner: string, name: string, _since?: number): Promise<Release[]> {
    const repoFullName = [owner, name].join('/')
    // const etagMap = await this.getEtagMap()
    const etagMap: StringMap = {}

    const since = _since || timeUtil.toUnixtime(DateTime.local().minus({ years: 2 }))
    console.log(`fetchReleasesByRepo ${repoFullName} since ${timeUtil.unixtimePretty(since)}`)

    const releasesResp = await githubService.getReleases(etagMap, repoFullName, since, false)
    console.log(releasesResp)
    const releases = releasesResp.body
    if (releases.length) {
      await firestoreService.saveBatch('releases', releases)
    }

    return releases
  }

  async getReleaseById (id: string): Promise<Release> {
    return (await firestoreService.getDoc('releases', id)) || 'not found'
  }

  async auth (input: AuthInput): Promise<any> {
    const d = await firebaseService.verifyIdToken(input.idToken)
    const uid = d.uid
    // console.log('d', JSON.stringify(d, null, 2))

    cacheDB.set(`user_${uid}`, {
      id: uid,
      username: input.username,
      accessToken: input.accessToken,
    } as UserInfo)

    return {}
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
