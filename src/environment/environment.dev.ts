import { EnvironmentProd } from './environment.prod'

export class EnvironmentDev extends EnvironmentProd {
  name = 'dev'
  prod = false
  dev = true

  sentryDsn = undefined

  authEnabled = false
}

export default new EnvironmentDev()
