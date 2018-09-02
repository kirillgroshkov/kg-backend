import { _envDev } from '@src/environment/environment.dev'
import { _envProd, Environment } from './environment.prod'

let environment: Environment

if (process.env.NOW) {
  environment = _envProd
} else {
  environment = _envDev
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
