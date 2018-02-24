import { memo } from '../decorators/memo.decorator'
import { gotService } from './got.service'

class DontsleepService {
  @memo()
  start (): void {
    setInterval(async () => {
      await gotService.get(process.env.NOW_URL!).catch(err => {})
    }, 60000)
  }
}

export const dontsleepService = new DontsleepService()
