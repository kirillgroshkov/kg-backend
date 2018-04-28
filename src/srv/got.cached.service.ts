import { GotOptions, GotResponse, GotService } from '@src/srv/got.service'
import { log } from '@src/srv/log.service'
import * as got from 'got'

interface EtagBody {
  etag: string
  body: any
}

const cacheMap = new Map<string, EtagBody>()

class GotCachedService extends GotService {
  cacheKey (url: string): string {
    return url
  }

  async gotResponse<T = any> (method: string, url: string, _opt: Partial<GotOptions> = {}): Promise<GotResponse<T>> {
    const opt: GotOptions = {
      method,
      json: true,
      headers: {},
      ..._opt,
    }

    const etagBody = cacheMap.get(url)
    if (etagBody) {
      Object.assign(opt.headers, {
        'If-None-Match': etagBody.etag,
      })
    }

    log(`>> ${method} ${url} ${(etagBody && etagBody.etag) || ''}`)

    const r = await got(url, opt)

    if (etagBody && r.statusCode === 304) {
      console.log(`<< ${method} ${url} cached ${etagBody.etag}`)
      return {
        body: etagBody.body,
        fromCache: true,
      } as GotResponse<T>
    }

    if (r.headers.etag) {
      const etag = r.headers.etag as string
      console.log(`<< ${method} ${url} NOT cached ${etag}`)
      cacheMap.set(url, {
        etag,
        body: r.body,
      })
    } else {
      console.log(`<< ${method} ${url} no etag header!`, r.headers)
    }

    return r
  }
}

export const gotCachedService = new GotCachedService()
