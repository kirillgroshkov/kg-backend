import { QuerySnapshot } from '@google-cloud/firestore'
import { memo } from '@src/decorators/memo.decorator'
import { env } from '@src/environment/environment'
import { githubService } from '@src/releases/github.service'
import { CacheKey, Release, releasesDao, Repo, User, UserFM, UserSettings } from '@src/releases/releases.dao'
import { Resp } from '@src/releases/resp'
import { cacheDB } from '@src/srv/cachedb/cachedb'
import { firebaseService } from '@src/srv/firebase/firebase.service'
import { firestoreService } from '@src/srv/firebase/firestore.service'
import { nunjucksService } from '@src/srv/nunjucks.service'
import { sendgridService } from '@src/srv/sendgrid.service'
import { sentryService } from '@src/srv/sentry.service'
import { SLACK_CHANNEL, slackService } from '@src/srv/slack.service'
import { StringMap } from '@src/typings/other'
import { by } from '@src/util/object.util'
import { LUXON_ISO_DATE_FORMAT, timeUtil } from '@src/util/time.util'
import { IRouterContext } from 'koa-router'
import { DateTime } from 'luxon'
import * as promiseMap from 'p-map'
import promiseProps = require('p-props')

export interface AuthInput {
  username: string
  accessToken: string
  idToken: string
}

export interface BackendResponse {
  newUser?: boolean
  userFM?: UserFM
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

  private reportError (err: any): void {
    sentryService.captureException(err)
  }

  private async onUserErr (err: any, u: User): Promise<void> {
    if (!err || !err.response || (err.response.statusCode !== 401 && err.response.statusCode !== 404)) {
      sentryService.captureException(err)
      return
    }

    await this.onUser401(u)
  }

  private async onUser401 (u: User): Promise<void> {
    // 401, token is expired / revoked
    slackService.send(`${u.username} ${u.id} token ${u.accessToken} became invalid`, SLACK_CHANNEL.info) // async

    delete u.accessToken
    await releasesDao.saveUser(u)
  }

  private async getUserStarredRepos (u: User, etagMap: StringMap): Promise<Repo[]> {
    const repos = await githubService.getUserStarredRepos(u, etagMap).catch(err => this.onUserErr(err, u))

    if (repos) {
      if (repos.length) {
        console.log(`${u.username} starred repos CHANGED`)
        u.lastStarredRepo = repos[0].fullName
        u.starredRepos = repos
        releasesDao.saveUser(u) // async
        // releasesDao.saveEtagMap(etagMap) // async
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
    const users = Object.values(usersEntries).filter(u => u.accessToken)

    const allRepos: Repo[] = []

    const mapper = async (u: User): Promise<void> => {
      const userRepos = await this.getUserStarredRepos(u, etagMap).catch(err => {
        this.reportError(err)
        return [] as Repo[]
      })
      userRepos.forEach(repo => (userIdForRepo[repo.fullName] = u.id))
      allRepos.push(...userRepos)
    }

    const promises = users.map(u => mapper(u))
    await Promise.all(promises) // unlimited concurrency here!

    // async iteration
    /*for await (const u of users) {
      const userRepos = await this.getUserStarredRepos(u, etagMap)
        .catch(err => {
          this.reportError(err)
          return [] as Repo[]
        })
      userRepos.forEach(repo => (userIdForRepo[repo.fullName] = u.id))
      allRepos.push(...userRepos)
    }*/

    // deduplicate repos
    const repos: Repo[] = []
    const repoFullNames = new Set<string>()
    allRepos.forEach(r => {
      if (repoFullNames.has(r.fullName)) return
      repoFullNames.add(r.fullName)
      repos.push(r)
    })

    /*
    if (1 === 1) return {
      repos: repos.length,
      allRepos: allRepos.length,
      users: users.length,
      usersEntries: Object.keys(usersEntries).length,
    }*/

    let processed = 0
    let etagsSaved = 0

    console.log(
      [
        'since: ' + timeUtil.unixtimePretty(since),
        'etagMap items: ' + Object.keys(etagMap).length,
        'starred repos: ' + repos.length,
      ].join('\n'),
    )

    await promiseMap(
      repos,
      async repo => {
        try {
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
        } catch (err) {
          sentryService.captureException(err)
        }
      },
      { concurrency },
    )

    const newReleases = resp.body
    if (newReleases.length) {
      // Slack notification
      const t: string[] = []
      t.push(`${newReleases.length} new releases:`)
      t.push(...newReleases.map(r => `${r.repoFullName}@${r.v}`))

      slackService.send(t.join('\n')) // async

      this.emailNotifyNewReleases(newReleases, users) // async
    }

    const lastCheckedReleases = Math.round(resp.started / 1000)
    resp.firestoreWrites++
    releasesDao.saveEtagMap(etagMap) // async

    if (env().prod) {
      resp.firestoreWrites++
      releasesDao.saveLastCheckedReleases(lastCheckedReleases) // async
    }

    resp.finish()
    const logMsg = [
      'lastCheckedReleases: ' + timeUtil.unixtimePretty(lastCheckedReleases),
      'newReleases: ' + newReleases.length,
      'etagMap items: ' + Object.keys(etagMap).length,
      'starred repos: ' + repos.length,
      'allRepos: ' + allRepos.length,
      'users: ' + users.length,
      'usersEntries: ' + Object.keys(usersEntries).length,
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
  async getFeed (u: User, _minIncl: string, _maxExcl?: string): Promise<any> {
    // defaults
    const minIncl =
      _minIncl ||
      DateTime.utc()
        .startOf('day')
        .minus({ days: 3 })
        .toFormat(LUXON_ISO_DATE_FORMAT)
    const maxExcl = _maxExcl || DateTime.utc(2999).toFormat(LUXON_ISO_DATE_FORMAT)
    console.log(`getFeed [${minIncl}; ${maxExcl})`)

    const feed = this.firestoreGetReleases(timeUtil.isoToUnixtime(minIncl), timeUtil.isoToUnixtime(maxExcl))

    const p = await promiseProps({
      feed,
      // rmap: this.getCachedStarredReposMap(),
      rateLimit: githubService.getRateLimit(u),
      lastCheckedReleases: cacheDB.get<number>(CacheKey.lastCheckedReleases),
    })

    const rmap = by(u.starredRepos || [], 'fullName')

    const releases = (p.feed as Release[])
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
  })
  async firestoreGetReleases (minIncl: number, maxExcl: number): Promise<Release[]> {
    const q = firestoreService
      .db()
      .collection('releases')
      .where('published', '>=', minIncl)
      .where('published', '<', maxExcl)
      .orderBy('published', 'desc')

    return firestoreService.runQuery<Release>(q)
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

  async auth (input: AuthInput): Promise<BackendResponse> {
    const d = await firebaseService.verifyIdToken(input.idToken)
    const uid = d.uid
    // console.log('d', JSON.stringify(d, null, 2))

    const existingUser = await releasesDao.getUser(uid)
    const newUser = !existingUser

    const ur = await firebaseService.getUser(uid)

    const u: User = {
      settings: {
        notificationEmail: ur && ur.email,
      }, // default
      id: uid,
      ...existingUser, // to preserve "starredRepos"
      username: input.username,
      accessToken: input.accessToken,
      // starredRepos: [], // will be fetched later
      displayName: ur && ur.displayName,
    }
    releasesDao.saveUser(u) // async

    if (newUser) {
      this.emailNewUser(u) // async

      const since = timeUtil.toUnixtime(DateTime.local().minus({ months: 6 }))
      this.cronUpdate(since, u, 5) // async
    }

    const br: BackendResponse = {
      newUser,
      userFM: releasesDao.userToFM(u),
    }

    return br
  }

  async info (): Promise<any> {
    const etagMap = await releasesDao.getEtagMap()
    const etagMapFirestore = await firestoreService.getDoc<StringMap>('cacheDB', CacheKey.etagMap)
    const etagMapJsonSizeKB = Math.ceil(JSON.stringify(etagMapFirestore).length / 1024)

    return {
      etagMapSize: Object.keys(etagMap).length,
      etagFirestoreSize: Object.keys(etagMapFirestore!).length,
      etagMapJsonSizeKB,
    }
  }

  async emailNewUser (u: User): Promise<void> {
    await Promise.all([
      slackService.send(`New user! ${u.username} ${u.id}`, SLACK_CHANNEL.info),

      sendgridService.send({
        to: { email: '1@inventix.ru' },
        subject: `Releases user: ${u.username} ${u.id}`,
        content: `Tadaam!`,
      }),
    ])
  }

  private async emailNotifyNewReleases (newReleases: Release[], users: User[], daily?: string): Promise<void> {
    if (!newReleases.length) return

    let emailsSent = 0

    await promiseMap(
      users,
      async u => {
        if (!u.settings || !u.settings.notificationEmail) return // disabled
        if (daily) {
          if (!u.settings.notifyEmailDaily) return // disabled
        } else {
          if (!u.settings.notifyEmailRealtime) return // disabled
        }

        const repoNames = new Set<string>(u.starredRepos.map(r => r.fullName))
        const userReleases = newReleases.filter(r => repoNames.has(r.repoFullName))
        if (!userReleases.length) return

        // Notify!
        const releasesList = userReleases
          .map(r => r.repoFullName)
          .slice(0, 5)
          .join(', ')
        let subject: string
        if (daily) {
          subject = `New releases ${daily}: ${releasesList}`
        } else {
          subject = `New releases: ${releasesList}`
        }

        const content = await nunjucksService.render('newreleases.html', { releases: userReleases })

        console.log(`>> email to ${u.settings.notificationEmail}`)

        await sendgridService.send({
          to: {
            email: u.settings.notificationEmail,
            name: u.displayName || u.settings.notificationEmail,
          },
          subject,
          content,
        })
        emailsSent++
      },
      { concurrency: 1 },
    )

    slackService.send(`Emails sent: ${emailsSent}`) // async
  }

  // To run AFTER the day is finished, e.g on 00:00 next day or later
  async emailNotifyNewReleasesDaily (): Promise<void> {
    const maxExcl = DateTime.utc().startOf('day')
    const minIncl = maxExcl.minus({ days: 1 })
    console.log(
      `emailNotifyNewReleasesDaily: ${timeUtil.toDateTimePretty(minIncl)} - ${timeUtil.toDateTimePretty(maxExcl)}`,
    )

    const newReleases = await this.firestoreGetReleases(timeUtil.toUnixtime(minIncl), timeUtil.toUnixtime(maxExcl))
    console.log('Daily new releases: ' + newReleases.length)

    if (!newReleases.length) return

    const users = await releasesDao.getUsers()

    await this.emailNotifyNewReleases(newReleases, users, timeUtil.toDatePretty(minIncl))
  }

  async saveUserSettings (u: User, input: UserSettings): Promise<BackendResponse> {
    // todo: pick, validate
    Object.assign(u, {
      settings: input,
    })
    await releasesDao.saveUser(u)

    return {
      userFM: releasesDao.userToFM(u),
    }
  }

  async init (u: User): Promise<BackendResponse> {
    return {
      userFM: releasesDao.userToFM(u),
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
