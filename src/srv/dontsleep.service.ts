import { gotService } from './got.service'

class DontsleepService {
  run (): void {
    gotService.get(process.env.NOW_URL!).catch(err => {}) // async
  }
}

export const dontsleepService = new DontsleepService()
