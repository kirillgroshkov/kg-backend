import { StringMap } from '../typings/other'

export const secret: StringMap = {}

export function loadSecretsFromEnv () {
  Object.keys(process.env)
    .filter(k => k.startsWith('SECRET_'))
    .forEach(k => {
      secret[k] = process.env[k]!
      delete process.env[k]
    })
}
