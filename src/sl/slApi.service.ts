import * as got from 'got'
import { memo } from '../decorators/memo.decorator'
import { secret } from '../environment/secret'
import { timeUtil } from '../util/time.util'

class SLApiService {
  @memo({
    ttl: 15000,
  })
  async getDepartures (siteId: string, timeWindow: number = 30): Promise<any> {
    const url = `http://api.sl.se/api2/realtimedeparturesV4.json`

    const r = await got(url, {
      json: true,
      query: {
        key: secret.SECRET_SL_REALTIME_API_KEY,
        siteId,
        timeWindow,
        Bus: false,
        Train: false,
        Tram: false,
        Ship: false,
      },
    })
    const d = r.body
    d['fetchedAt'] = timeUtil.nowPretty()
    return d
  }
}

export const slApiService = new SLApiService()
