import { cacheDB, firebaseStorageCacheDB } from '@src/srv/cachedb/cachedb'
import { StringMap } from '@src/typings/other'
import { zipUtil } from '@src/util/zip.util'
import { IRouterContext } from 'koa-router'
import { DateTime } from 'luxon'

export enum CacheKey {
  etagMap = 'etagMap',
  // starredRepos = 'starredRepos', // now per User
  lastCheckedReleases = 'lastCheckedReleases',
  // lastStarredRepo = 'lastStarredRepo', // now per User
}

export enum ReleaseType {
  RELEASE = 'RELEASE',
  TAG = 'TAG',
}

export enum Table {
  users = 'users',
  releases = 'releases',
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

export interface User {
  id: string
  username: string
  accessToken?: string
  starredRepos: Repo[]
  lastStarredRepo?: string
  displayName?: string
  settings: UserSettings
}

export interface UserSettings {
  notificationEmail?: string
  notifyEmailRealtime?: boolean
  notifyEmailDaily?: boolean
}

// frontend model of User
export interface UserFM {
  id: string
  username: string
  starredReposCount: number
  displayName?: string
  settings: UserSettings
}

// Everything Data-related should be here
class ReleasesDao {
  async getLastCheckedReleases (): Promise<number> {
    const since = Math.floor(
      DateTime.local()
        .minus({ days: 7 })
        .valueOf() / 1000,
    )
    return await cacheDB.getOrDefault<number>(CacheKey.lastCheckedReleases, since)
  }

  async saveLastCheckedReleases (lastCheckedReleases: number): Promise<void> {
    await cacheDB.set(CacheKey.lastCheckedReleases, lastCheckedReleases)
  }

  async getEtagMap (): Promise<StringMap> {
    // const m = await firebaseStorageCacheDB.get<Buffer>(CacheKey.etagMap)
    const m = await cacheDB.get<Buffer>(CacheKey.etagMap)
    if (!m) return {} // default
    try {
      return JSON.parse(await zipUtil.inflateStr(m))
    } catch (err) {
      console.warn('error reading etagMap')
      return {}
    }
  }

  async saveEtagMap (etagMap: StringMap): Promise<void> {
    const b = await zipUtil.zip(JSON.stringify(etagMap || {}))
    // console.log(b)
    // await firebaseStorageCacheDB.set(CacheKey.etagMap, etagMap || {})
    await cacheDB.set(CacheKey.etagMap, b).catch(err => {
      console.log('error saving etagMap (temporary catch)')
    })
  }

  // Now per User
  /*
  async getCachedStarredReposMap (): Promise<RepoMap> {
    const repos = await this.getCachedStarredRepos()
    const r: RepoMap = {}
    repos.forEach(repo => (r[repo.fullName] = repo))
    return r
  }

  async getCachedStarredRepos (): Promise<Repo[]> {
    return cacheDB.getOrDefault(CacheKey.starredRepos, [])
  }*/

  // todo: ttl! or just use getUserEntries instead
  async getUsers (): Promise<User[]> {
    return cacheDB.values<User>(Table.users)
  }

  async getUsersEntries (): Promise<{ [uid: string]: User }> {
    return cacheDB.entries<User>(Table.users, 0) // always from firestore, to avoid cache
  }

  async getUser (uid: string): Promise<User> {
    if (!uid) return undefined as any
    return cacheDB.get(uid, Table.users)
  }

  async saveUser (u: User): Promise<void> {
    await cacheDB.set(u.id, u, Table.users)
  }

  async getUserFromContext (ctx: IRouterContext): Promise<User> {
    // Skip tight security for now, use just 'uid' header from ctx
    /*
    const idToken = ctx.get('idToken')
    if (!idToken) return Promise.reject(new Error('idToken required'))
    const d = await firebaseService.verifyIdToken(idToken)
    const u = await this.getUserInfo(d.uid)*/
    const uid = ctx.get('uid')

    // FOR DEBUGGING ONLY
    // if (!uid) uid = 'kr87n2F9QLcBH3ZuYEUAPl0PK6J3'

    const u = await this.getUser(uid)
    if (!u) return Promise.reject(new Error('401 uid required'))
    console.log(`${u.id} ${u.username}`)
    return u
  }

  requireUid (ctx: IRouterContext): string {
    let uid = ctx.get('uid')

    // FOR DEBUGGING ONLY
    if (!uid) uid = 'kr87n2F9QLcBH3ZuYEUAPl0PK6J3'

    if (!uid) throw new Error('uid required')
    return uid
  }

  userToFM (u: User): UserFM {
    return {
      id: u.id,
      username: u.username,
      starredReposCount: (u.starredRepos || []).length,
      displayName: u.displayName,
      settings: u.settings || {},
    }
  }
}

export const releasesDao = new ReleasesDao()
