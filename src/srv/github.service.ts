import { secret } from '@src/environment/secret'
import { Release, ReleaseType, Repo, Tag } from '@src/releases/releases.service'
import { Resp } from '@src/releases/resp'
import { firestoreService } from '@src/srv/firestore.service'
import { gotService } from '@src/srv/got.service'
import { StringMap } from '@src/typings/other'
import { timeUtil } from '@src/util/time.util'
import * as P from 'bluebird'
import { DateTime } from 'luxon'

/* tslint:disable:variable-name */

const API = 'https://api.github.com'
const username = 'kirillgroshkov'

class GithubService {
  get headers (): StringMap {
    return {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': username,
      Authorization: `token ${secret('SECRET_GITHUB_TOKEN')}`,
    }
  }

  // undefined means "unchanged" (304)
  // mutates "etagMap" if not "unchanged"
  async getStarred (etagMap: StringMap, lastStarredRepo?: string): Promise<Repo[] | undefined> {
    const per_page = 100
    const allResults: Repo[] = []
    let results: Repo[] | undefined
    let page = 0

    do {
      page++
      results = await this.getStarredPage(etagMap, per_page, page)
      if (!results) return undefined // not changed
      if (page === 1 && results.length && results[0].fullName === lastStarredRepo) return undefined // not changed
      // console.log(`page ${page} results: ${results.length}`)
      allResults.push(...results)
    } while (results.length === per_page)

    if (!results) return undefined
    return allResults
  }

  // undefined means "unchanged" (304)
  // mutates "etagMap" if not "unchanged"
  private async getStarredPage (etagMap: StringMap, per_page = 100, page = 0): Promise<Repo[] | undefined> {
    // if (page >= 3) return []

    const url = `${API}/users/${username}/starred?per_page=${per_page}&page=${page}`
    const opt = {
      headers: this.headers,
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
  async getReleases (etagMap: StringMap, repoFullName: string, since: number): Promise<Resp<Release>> {
    const per_page = 100
    const page = 1
    const releases: { [v: string]: Release } = {}
    const resp = Resp.create<Release>()

    // 1. Releases
    const releasesUrl = `${API}/repos/${repoFullName}/releases?per_page=${per_page}&page=${page}`
    const releasesResp = await gotService.gotResponse<any[]>('get', releasesUrl, {
      headers: this.headers,
      etagMap, // NO: because Tags changed are we need "descr" - we need to load them anyway
      noLog: true,
    })
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
      headers: this.headers,
      etagMap,
      noLog: true,
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
          headers: this.headers,
          etagMap,
          noLog: true,
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

  async getRateLimit (): Promise<any> {
    const r = await gotService.get(`${API}/rate_limit`, {
      headers: this.headers,
    })
    return {
      ...r.rate,
      reset: timeUtil.unixtimePretty(r.rate.reset),
    }
  }

  private mapRepo (r: any): Repo {
    return {
      githubId: r.id,
      fullName: r.full_name,
      // owner: r.owner.login,
      // name: r.name,
      descr: r.description,
      homepage: r.homepage,
      stargazersCount: r.stargazers_count,
      avatarUrl: r.owner.avatar_url,
    }
  }

  private mapRelease (r: any, repoFullName: string): Release {
    let v = r.tag_name as string
    if (v.startsWith('v')) v = v.substr(1)

    const [repoOwner, repoName] = repoFullName.split('/')
    const created = Math.floor(DateTime.fromISO(r.created_at).valueOf() / 1000)
    const published = Math.floor(DateTime.fromISO(r.published_at).valueOf() / 1000)

    return {
      id: [repoOwner, repoName, v].join('_'),
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
    const created = Math.floor(DateTime.fromISO(commit.commit.author.date).valueOf() / 1000)
    const published = Math.floor(DateTime.fromISO(commit.commit.author.date).valueOf() / 1000)

    return {
      id: t.id,
      v: t.v,
      tagName: t.tagName,
      repoFullName,
      created,
      published,
      descr: '',
      type: ReleaseType.TAG,
    }
  }
}

export const githubService = new GithubService()
