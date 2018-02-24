export class AppError extends Error {
  constructor (message: string) {
    super(message)

    Object.defineProperty(this, 'name', {
      value: this.constructor.name,
    })
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    } else {
      Object.defineProperty(this, 'stack', {
        value: new Error().stack,
      })
    }
  }
}
