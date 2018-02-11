export class EnvironmentProd {
  name = 'prod'
  prod = true
  dev = false

  port = 8000

  sentryDsn = 'https://4434a43b3ce348fa90230c94f63bf0d5:e816e3e4964e4822a602d95c32599929@sentry.io/286298'
}

export type Environment = EnvironmentProd

export default new EnvironmentProd()
