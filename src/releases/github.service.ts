import { Release, ReleaseType, Repo, Tag, User } from '@src/releases/releases.dao'
import { Resp } from '@src/releases/resp'
import { GotResponse, gotService } from '@src/srv/got.service'
import * as P from 'bluebird'
import { firestoreService } from '../srv/firebase/firestore.service'
import { StringMap } from '../typings/other'
import { timeUtil } from '../util/time.util'

/* tslint:disable:variable-name */

const API = 'https://api.github.com'

class GithubService {
  headers (u: User): StringMap {
    return {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': u.username,
      Authorization: `token ${u.accessToken}`,
    }
  }

  // undefined means "unchanged" (304)
  // mutates "etagMap" if not "unchanged"
  async getUserStarredRepos (u: User, etagMap: StringMap): Promise<Repo[] | undefined> {
    const per_page = 100
    const allResults: Repo[] = []
    let results: Repo[] | undefined
    let page = 0

    do {
      page++
      results = await this.getUserStarredReposPage(etagMap, u, per_page, page)
      if (!results) return undefined // not changed
      if (page === 1 && results.length && results[0].fullName === u.lastStarredRepo) return undefined // not changed
      // console.log(`page ${page} results: ${results.length}`)
      allResults.push(...results)
    } while (results.length === per_page)

    if (!results) return undefined
    return allResults
  }

  // undefined means "unchanged" (304)
  // mutates "etagMap" if not "unchanged"
  private async getUserStarredReposPage (
    etagMap: StringMap,
    u: User,
    per_page = 100,
    page = 0,
  ): Promise<Repo[] | undefined> {
    // if (page >= 3) return []

    const url = `${API}/users/${u.username}/starred?per_page=${per_page}&page=${page}`
    const opt = {
      headers: {
        ...this.headers(u),
        Accept: 'application/vnd.github.v3.star+json', // will include "star creation timestamps" starred_at
      },
      timeout: 10000,
      etagMap,
      // noLog: true,
    }

    const r = await gotService.gotResponse<any[]>('get', url, opt)
    if (r.statusCode === 304) return undefined // unchanged
    return r.body.map(r => this.mapRepo(r))
  }

  // undefined means "unchanged" (304)
  // mutates "etagMap" if not "unchanged"
  async getRepoReleases (
    etagMap: StringMap,
    u: User,
    repoFullName: string,
    since: number,
    maxReleasesPerRepo?: number,
    noLog = true,
  ): Promise<Resp<Release>> {
    const per_page = 100
    const page = 1
    const releases: { [v: string]: Release } = {}
    const resp = Resp.create<Release>()

    // 1. Releases
    const releasesUrl = `${API}/repos/${repoFullName}/releases?per_page=${per_page}&page=${page}`
    let releasesResp: GotResponse<any[]>

    try {
      releasesResp = await gotService.gotResponse<any[]>('get', releasesUrl, {
        headers: this.headers(u),
        etagMap, // NO: because Tags changed are we need "descr" - we need to load them anyway
        noLog,
      })
    } catch (err) {
      if (err && err.response && err.response.statusCode === 451) {
        // Unavailable for legal reasons, e.g: "gloomyson/StarCraft"
        console.log(`${repoFullName} resp 451`)
        return resp // empty
      }
      throw err // rethrow
    }

    if (releasesResp.statusCode === 304) {
      resp.etagHits++
    } else {
      resp.githubRequests++

      releasesResp.body
        .map(r => this.mapRelease(r, repoFullName))
        .filter(r => r.created > since || r.published > since)
        .forEach(r => (releases[r.v] = r))
    }

    // 2. Tags (that are not "github releases")
    const tagsUrl = `${API}/repos/${repoFullName}/tags?per_page=${per_page}&page=${page}`
    const tagsResp = await gotService.gotResponse<any[]>('get', tagsUrl, {
      headers: this.headers(u),
      etagMap,
      noLog,
    })
    if (tagsResp.statusCode === 304) {
      resp.etagHits++
    } else {
      resp.githubRequests++

      const tags = tagsResp.body.map(r => this.mapTag(r, repoFullName))

      // Gather additional information from github commits that correspond to these tags
      // one by one, so we can "break" the loop when time is < than "since"
      for await (const t of tags) {
        if (releases[t.v]) continue // already in "releases"
        // if (t.v.includes('/')) continue // todo: support in Firestore

        // check if we already have it in DB
        resp.firestoreReads++
        if (await firestoreService.getDoc('releases', t.id)) {
          break // we already have it
        }

        const res = await gotService.gotResponse('get', t.commitUrl, {
          headers: this.headers(u),
          etagMap,
          noLog,
        })
        if (res.statusCode === 304) {
          resp.etagHits++
          break // 304, so we already have it
        }

        resp.githubRequests++

        const r = this.mapTagAsRelease(t, res.body, repoFullName)
        if (r.created <= since) break // we already have it
        releases[r.v] = r
      }
    }

    // Exclude versions with slash '/' (cause cannot save to Firestore document like this)
    // todo: on firestore level: escape as / => _SLASH_ => /
    Object.assign(resp, {
      body: Object.values(releases), // .filter(r => !r.v.includes('/')),
    })
    return resp
  }

  async getRateLimit (u: User): Promise<any> {
    const r = await gotService.get(`${API}/rate_limit`, {
      headers: this.headers(u),
    })
    return {
      ...r.rate,
    }
  }

  private mapRepo (r: any): Repo {
    // console.log('mapRepo', r, r.repo.full_name)
    return {
      githubId: r.repo.id,
      fullName: r.repo.full_name,
      // owner: r.repo.owner.login,
      // name: r.repo.name,
      descr: r.repo.description,
      homepage: r.repo.homepage,
      stargazersCount: r.repo.stargazers_count,
      avatarUrl: r.repo.owner.avatar_url,
      starredAt: timeUtil.isoToUnixtime(r.starred_at),
    }
  }

  private mapRelease (r: any, repoFullName: string): Release {
    let v = r.tag_name as string
    if (v.startsWith('v')) v = v.substr(1)

    const [repoOwner, repoName] = repoFullName.split('/')
    const created = timeUtil.isoToUnixtime(r.created_at)
    const published = timeUtil.isoToUnixtime(r.published_at)

    return {
      id: [repoOwner, repoName, v].join('_'),
      name: r.name,
      v,
      tagName: r.tag_name,
      repoFullName,
      created,
      published,
      descr: r.body,
      type: ReleaseType.RELEASE,
    }
  }

  private mapTag (r: any, repoFullName: string): Tag {
    let v = r.name as string
    if (v.startsWith('v')) v = v.substr(1)

    const [repoOwner, repoName] = repoFullName.split('/')

    return {
      id: [repoOwner, repoName, v].join('_'),
      v,
      tagName: r.name,
      commitUrl: r.commit.url,
    }
  }

  private mapTagAsRelease (t: Tag, commit: any, repoFullName: string): Release {
    const created = timeUtil.isoToUnixtime(commit.commit.committer.date)
    const published = timeUtil.isoToUnixtime(commit.commit.committer.date)

    return {
      id: t.id,
      v: t.v,
      tagName: t.tagName,
      repoFullName,
      created,
      published,
      descr: commit.commit.message || '',
      type: ReleaseType.TAG,
    }
  }
}

export const githubService = new GithubService()
