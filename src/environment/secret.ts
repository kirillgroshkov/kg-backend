import { StringMap } from '../typings/other'

let secretData: StringMap

export function secret (k: string): string {
  if (!secretData) loadSecretsFromEnv()
  return secretData[k]
}

export function secretInit (): void {
  secret('')
}

function loadSecretsFromEnv (): void {
  if (secretData) return
  require('dotenv').config()
  secretData = {}
  Object.keys(process.env)
    .filter(k => k.startsWith('SECRET_'))
    .forEach(k => {
      secretData[k] = process.env[k]!
      delete process.env[k]
    })
}
