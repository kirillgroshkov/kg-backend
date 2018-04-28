import { memo } from '../decorators/memo.decorator'
import { secret } from '../environment/secret'
import { gotService } from '../srv/got.service'
import { timeUtil } from '../util/time.util'

class SLApiService {
  @memo({
    ttl: 15000,
  })
  async getDepartures (siteId: string, timeWindow: number = 30): Promise<any> {
    const url = `http://api.sl.se/api2/realtimedeparturesV4.json`

    const r = await gotService.get(url, {
      query: {
        key: secret('SECRET_SL_REALTIME_API_KEY'),
        siteId,
        timeWindow,
        Bus: false,
        Train: false,
        Tram: false,
        Ship: false,
      },
    })

    return {
      fetchedAt: timeUtil.nowPretty(),
      ...r,
    }
  }
}

export const slApiService = new SLApiService()
