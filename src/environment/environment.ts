import { Environment } from './environment.prod'

let environment: Environment

if (process.env.NOW) {
  environment = require('./environment.prod').default
} else {
  environment = require('./environment.dev').default
}

export function env (): Environment {
  return environment
}

export function logEnvironment (): void {
  console.log(environment)
}

export function extendEnvironment (extension: Partial<Environment>): void {
  Object.assign(environment, extension)
}
