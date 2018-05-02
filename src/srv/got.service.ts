import { StringMap } from '@src/typings/other'
import { GotJSONOptions, Response } from 'got'
import * as got from 'got'
import { log } from './log.service'

export interface GotResponse<T> extends Response<T> {}

export interface GotOptions extends GotJSONOptions {
  etagMap?: StringMap
  noLog?: boolean
}

export class GotService {
  async got<T = any> (method: string, url: string, _opt: Partial<GotOptions> = {}): Promise<T> {
    const { body } = await this.gotResponse<T>(method, url, _opt)
    return body
  }

  async gotResponse<T = any> (method: string, url: string, _opt: Partial<GotOptions> = {}): Promise<GotResponse<T>> {
    method = method.toUpperCase() // forgivable mutation

    const opt: GotOptions = {
      method,
      json: true,
      headers: {},
      ..._opt,
    }

    const etag = (opt.etagMap && opt.etagMap[url]) || undefined
    if (etag) opt.headers!['If-None-Match'] = etag

    if (!opt.noLog) log(`>> ${method} ${url} ${etag || ''}`)

    const started = Date.now()
    const r = await got(url, opt)
    const etagReturned = r.headers.etag as string
    if (!opt.noLog) log(`<< ${r.statusCode} ${method} ${url} ${etagReturned || ''} in ${Date.now() - started} ms`)
    if (etagReturned && opt.etagMap) opt.etagMap[url] = etagReturned
    return r
  }

  // convenience methods
  async get<T = any> (url: string, opt?: Partial<GotOptions>): Promise<T> {
    return this.got<T>('GET', url, opt)
  }
  async post<T = any> (url: string, opt?: Partial<GotOptions>): Promise<T> {
    return this.got<T>('POST', url, opt)
  }
  async put<T = any> (url: string, opt?: Partial<GotOptions>): Promise<T> {
    return this.got<T>('PUT', url, opt)
  }
  async delete<T = any> (url: string, opt?: Partial<GotOptions>): Promise<T> {
    return this.got<T>('DELETE', url, opt)
  }
}

export const gotService = new GotService()
