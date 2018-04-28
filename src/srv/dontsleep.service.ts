import { memo } from '../decorators/memo.decorator'
import { gotService } from './got.service'

class DontsleepService {
  @memo()
  start (): void {
    setInterval(() => {
      gotService.get(process.env.NOW_URL!).catch(err => {}) // async
    }, 60000)
  }
}

export const dontsleepService = new DontsleepService()
