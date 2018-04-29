import { secret } from '@src/environment/secret'
import { Release, Repo } from '@src/releases/releases.service'
import { gotService } from '@src/srv/got.service'
import { StringMap } from '@src/typings/other'
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
  async getStarred (etagMap: StringMap): Promise<Repo[] | undefined> {
    const per_page = 100
    const allResults: Repo[] = []
    let results: Repo[] | undefined
    let page = 0

    do {
      page++
      results = await this.getStarredPage(etagMap, per_page, page)
      if (!results) break
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
    }

    const r = await gotService.gotResponse<any[]>('get', url, opt)
    if (r.statusCode === 304) return undefined // unchanged
    return r.body.map(r => this.mapRepo(r))
  }

  // undefined means "unchanged" (304)
  // mutates "etagMap" if not "unchanged"
  async getReleases (etagMap: StringMap, repoFullName: string, since: number): Promise<Release[] | undefined> {
    const per_page = 100
    const page = 1
    const url = `${API}/repos/${repoFullName}/releases?per_page=${per_page}&page=${page}`
    const r = await gotService.gotResponse<any[]>('get', url, {
      headers: this.headers,
      etagMap,
    })
    if (r.statusCode === 304) return undefined // unchanged
    return r.body.map(r => this.mapRelease(r, repoFullName)).filter(r => r.created > since || r.published > since)
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
      githubId: r.id,
    }
  }
}

export const githubService = new GithubService()
