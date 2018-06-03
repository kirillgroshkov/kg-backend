import { memo } from '../decorators/memo.decorator'
import { env } from '../environment/environment'

class SentryService {
  @memo()
  raven (): any {
    console.log('SentryService init...')
    const Raven = require('raven')
    Raven.config(env().sentryDsn, {
      captureUnhandledRejections: true,
      environment: env().name,
      autoBreadcrumbs: {
        console: true,
        http: true,
      },
    }).install()
    return Raven
  }

  init (): void {
    if (!env().sentryDsn) return

    this.raven()
  }

  captureException (err: any): void {
    console.error('sentryService.captureException:\n', err)
    if (!env().sentryDsn) return

    this.raven().captureException(err, (err: any, eventId: string) => {
      console.log('Sentry reported error ' + eventId)
    })
  }

  captureMessage (msg: string): void {
    console.log('sentryService.captureMessage: ' + msg)
    if (!env().sentryDsn) return

    this.raven().captureMessage(msg, (err: any, eventId: string) => {
      console.log('Sentry reported error ' + eventId)
    })
  }
}

export const sentryService = new SentryService()
