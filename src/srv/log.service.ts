interface LogFunction {
  (...args: any[]): void
  debug (...args: any[]): void
  warn (...args: any[]): void
  error (...args: any[]): void
}

const logFn: any = (...args: any[]): void => {
  console.log(...args)
}

logFn.debug = (...args: any[]): void => {
  console.debug(...args)
}

logFn.warn = (...args: any[]): void => {
  console.warn(...args)
}

logFn.error = (...args: any[]): void => {
  console.error(...args)
}

export const log: LogFunction = logFn
