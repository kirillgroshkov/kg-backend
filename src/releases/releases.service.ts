import { QuerySnapshot } from '@google-cloud/firestore'
import { memo } from '@src/decorators/memo.decorator'
import { githubService } from '@src/releases/github.service'
import { CacheKey, Release, releasesDao, Repo, User } from '@src/releases/releases.dao'
import { Resp } from '@src/releases/resp'
import { cacheDB } from '@src/srv/cachedb/cachedb'
import { firebaseService } from '@src/srv/firebase.service'
import { firestoreService } from '@src/srv/firestore.service'
import { slackService } from '@src/srv/slack.service'
import { StringMap } from '@src/typings/other'
import { by } from '@src/util/object.util'
import { LUXON_ISO_DATE_FORMAT, timeUtil } from '@src/util/time.util'
import * as P from 'bluebird'
import { IRouterContext } from 'koa-router'
import { DateTime } from 'luxon'

export interface AuthInput {
  username: string
  accessToken: string
  idToken: string
}

export interface AuthResp {
  newUser: boolean
}

const concurrency = 8

class ReleasesService {
  async test (ctx: IRouterContext): Promise<any> {
    if (1 === 1) return // disabled
    const since = Math.floor(
      DateTime.local()
        .minus({ days: 7 })
        .valueOf() / 1000,
    )
    const user = await releasesDao.getUserFromContext(ctx)
    const r = await githubService.getRepoReleases(
      await releasesDao.getEtagMap(),
      user,
      'sindresorhus/p-queue',
      since,
      0,
      false,
    )
    return r
  }

  private async getUserStarredRepos (u: User, etagMap: StringMap): Promise<Repo[]> {
    const repos = await githubService.getUserStarredRepos(u, etagMap)
    if (repos) {
      if (repos.length) {
        console.log(`${u.username} starred repos CHANGED`)
        u.lastStarredRepo = repos[0].fullName
        u.starredRepos = repos
        releasesDao.saveUser(u) // async
        releasesDao.saveEtagMap(etagMap) // async
      } else {
        console.log(`${u.username} starred repos CHANGED, but returned zero!?`)
      }
      return repos
    } else {
      console.log(`${u.username} starred repos not changed`)
      return u.starredRepos || []
    }
  }

  // For all users
  async cronUpdate (_since?: number, singleUser?: User, maxReleasesPerRepo?: number, noLog = true): Promise<any> {
    /* noLog = false
    _since = Math.floor(
      DateTime.local()
        .minus({ months: 5 })
        .valueOf() / 1000) */

    const since = _since || (await releasesDao.getLastCheckedReleases())
    console.log('ReleasesService cronUpdate since: ' + timeUtil.unixtimePretty(since))
    const resp = Resp.create<Release>()

    if (!singleUser && resp.started / 1000 - since < 180)
      return {
        err: 'cronUpdate was called recently',
      }

    const etagMap = await releasesDao.getEtagMap()

    const userIdForRepo: { [repoFullName: string]: string } = {}

    const usersEntries = singleUser ? { [singleUser.id]: singleUser } : await releasesDao.getUsersEntries()
    const users = Object.values(usersEntries)
    const repos: Repo[] = []

    // async iteration
    for await (const u of users) {
      const userRepos = await this.getUserStarredRepos(u, etagMap)
      userRepos.forEach(repo => (userIdForRepo[repo.fullName] = u.id))
      repos.push(...userRepos)
    }

    // todo: exclude duplicate repos

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
        const uid = userIdForRepo[repo.fullName]
        const u = usersEntries[uid]
        const releasesResp = await githubService.getRepoReleases(
          etagMap,
          u,
          repo.fullName,
          since,
          maxReleasesPerRepo,
          noLog,
        )

        if (maxReleasesPerRepo && releasesResp.body.length > maxReleasesPerRepo) {
          releasesResp.body = releasesResp.body.slice(0, maxReleasesPerRepo)
        }

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
          releasesDao.saveEtagMap(etagMap) // async
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
      t.push(`${newReleases.length} new releases:`)
      t.push(...newReleases.map(r => `${r.repoFullName}@${r.v}`))

      slackService.send(t.join('\n')) // async
    }

    const lastCheckedReleases = Math.round(resp.started / 1000)
    resp.firestoreWrites += 2
    releasesDao.saveEtagMap(etagMap) // async
    releasesDao.saveLastCheckedReleases(lastCheckedReleases) // async

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

  @memo({
    ttl: 60000,
    log: true,
    cacheKeyFn: (u, _minIncl, _maxExcl) => [u.id, _minIncl, _maxExcl].join(),
  })
  async getFeed (u: User, _minIncl: string, _maxExcl: string): Promise<any> {
    // defaults
    const minIncl =
      _minIncl ||
      DateTime.utc()
        .startOf('day')
        .minus({ days: 3 })
        .toFormat(LUXON_ISO_DATE_FORMAT)
    const maxExcl =
      _maxExcl ||
      DateTime.utc()
        .startOf('day')
        .plus({ days: 1 })
        .toFormat(LUXON_ISO_DATE_FORMAT)
    console.log(`getFeed [${minIncl}; ${maxExcl})`)

    const q = firestoreService
      .db()
      .collection('releases')
      .where('published', '>=', timeUtil.isoToUnixtime(minIncl))
      .where('published', '<', timeUtil.isoToUnixtime(maxExcl))
      .orderBy('published', 'desc')

    const p = await P.props({
      feed: firestoreService.runQuery<Release>(q),
      // rmap: this.getCachedStarredReposMap(),
      rateLimit: githubService.getRateLimit(u),
      lastCheckedReleases: cacheDB.get<number>(CacheKey.lastCheckedReleases),
    })

    const rmap = by(u.starredRepos || [], 'fullName')

    const releases = p.feed
      .filter(r => {
        // only show releases belonging to the user!
        return !!rmap[r.repoFullName]
      })
      .map(r => {
        return {
          // ...objectUtil.pick(r, FEED_FIELDS),
          ...r,
          avatarUrl: (rmap[r.repoFullName] || {}).avatarUrl,
          // publishedAt: timeUtil.unixtimePretty(r.published),
          // createdAt: timeUtil.unixtimePretty(r.created),
        }
      })

    return {
      lastCheckedReleases: p.lastCheckedReleases,
      rateLimit: p.rateLimit,
      starredRepos: Object.keys(rmap).length,
      lastStarred: Object.keys(rmap).slice(0, 10),
      releases,
    }
  }

  @memo({
    ttl: 60000,
    log: true,
    cacheKeyFn: u => u.id,
  })
  async getRepos (u: User): Promise<Repo[]> {
    return u.starredRepos || []
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

  async fetchReleasesByRepo (u: User, owner: string, name: string, _since?: number): Promise<Release[]> {
    const repoFullName = [owner, name].join('/')
    // const etagMap = await this.getEtagMap()
    const etagMap: StringMap = {}

    const since = _since || timeUtil.toUnixtime(DateTime.local().minus({ years: 2 }))
    console.log(`fetchReleasesByRepo ${repoFullName} since ${timeUtil.unixtimePretty(since)}`)

    const releasesResp = await githubService.getRepoReleases(etagMap, u, repoFullName, since, 100, false)
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

    const existingUser = await releasesDao.getUser(uid)
    const newUser = !existingUser

    const u = {
      ...existingUser, // to preserve "starredRepos"
      id: uid,
      username: input.username,
      accessToken: input.accessToken,
      // starredRepos: [], // will be fetched later
    }
    releasesDao.saveUser(u) // async

    if (newUser) {
      slackService.send(`New user! ${u.username} ${u.id}`) // async

      const since = timeUtil.toUnixtime(DateTime.local().minus({ months: 6 }))
      this.cronUpdate(since, u, 5) // async
    }

    const r: AuthResp = { newUser }

    return r
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
