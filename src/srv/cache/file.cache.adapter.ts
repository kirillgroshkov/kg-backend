import { CacheAdapter } from '@src/srv/cache/cache.service'
import * as fs from 'fs-extra'
import * as path from 'path'

export class FileCacheAdapter implements CacheAdapter {
  constructor (private cacheDirPath: string) {
    fs.ensureDir(cacheDirPath) // async
  }

  name = 'File'

  async set (key: string, value: any): Promise<void> {
    const file = path.join(this.cacheDirPath, `${key}.json`)
    const v = value ? JSON.stringify(value, undefined, 2) : undefined
    await fs.writeFile(file, v)
  }

  async get<T = any> (key: string): Promise<T | undefined> {
    const file = path.join(this.cacheDirPath, `${key}.json`)
    if (!(await fs.pathExists(file))) return undefined
    const v = await fs.readFile(file, 'utf8')
    return v ? JSON.parse(v) : undefined
  }

  async delete (key: string): Promise<void> {
    const file = path.join(this.cacheDirPath, `${key}.json`)
    await fs.unlink(file)
  }

  async clear (): Promise<void> {
    // todo
  }

  async keys (): Promise<string[]> {
    // todo
    return []
  }
}
