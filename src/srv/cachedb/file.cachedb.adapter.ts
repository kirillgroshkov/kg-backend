import { CacheDBAdapter } from '@src/srv/cachedb/cachedb'
import * as fs from 'fs-extra'
import * as path from 'path'

export class FileCacheDBAdapter implements CacheDBAdapter {
  constructor (private cacheDirPath: string, public defaultTable = 'cacheDB') {
    fs.ensureDir(cacheDirPath) // async
  }

  name = 'File'

  // Ensures that table (folder) exists
  private async getTable (table = this.defaultTable): Promise<string> {
    const tablePath = path.join(this.cacheDirPath, table)
    await fs.ensureDir(tablePath)
    return tablePath
  }

  private async getFilePath (table = this.defaultTable, key: string): Promise<string> {
    return path.join(await this.getTable(table), `${key}.json`)
  }

  async set (key: string, value: any, table?: string): Promise<void> {
    const filePath = await this.getFilePath(table, key)
    const v = JSON.stringify(value, undefined, 2)
    await fs.writeFile(filePath, v)
  }

  async get<T = any> (key: string, table?: string): Promise<T | undefined> {
    const file = await this.getFilePath(table, key)
    if (!(await fs.pathExists(file))) return undefined
    const v = await fs.readFile(file, 'utf8')
    return v ? JSON.parse(v) : undefined
  }

  async delete (key: string, table?: string): Promise<void> {
    await fs.unlink(await this.getFilePath(table, key))
  }

  async clear (table?: string): Promise<void> {
    // todo
  }

  async clearAll (): Promise<void> {
    await fs.unlink(this.cacheDirPath)
    await fs.ensureDir(this.cacheDirPath)
  }

  async keys (table?: string): Promise<string[]> {
    // todo
    return []
  }

  async tables (): Promise<string[]> {
    // todo
    return []
  }
}
