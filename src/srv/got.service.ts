import { GotJSONOptions, GotOptions } from 'got'
import * as got from 'got'
import { log } from './log.service'

class GotService {
  private async got<T> (
    method: string,
    url: string,
    _opt: GotOptions<string | null> = {},
  ): Promise<T> {
    log(`>> ${method} ${url}`)
    const opt: GotJSONOptions = {
      method,
      json: true,
      ..._opt,
    }

    const r = await got(url, opt)
    log(`<< ${method} ${url}`)
    return r.body
  }

  // convenience methods
  async get<T> (url: string, opt?: GotOptions<string | null>): Promise<T> {
    return this.got<T>('GET', url, opt)
  }
  async post<T> (url: string, opt?: GotOptions<string | null>): Promise<T> {
    return this.got<T>('POST', url, opt)
  }
  async put<T> (url: string, opt?: GotOptions<string | null>): Promise<T> {
    return this.got<T>('PUT', url, opt)
  }
  async delete<T> (url: string, opt?: GotOptions<string | null>): Promise<T> {
    return this.got<T>('DELETE', url, opt)
  }
}

export const gotService = new GotService()
