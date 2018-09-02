import { CacheDBAdapter } from '@src/srv/cachedb/cachedb'
import * as fs from 'fs-extra'
import * as promiseMap from 'p-map'
import * as path from 'path'

const EXT = '.json'
const EXT_LEN = EXT.length

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
    return path.join(await this.getTable(table), `${key}${EXT}`)
  }

  async set (key: string, value: any, table?: string): Promise<void> {
    const filePath = await this.getFilePath(table, key)
    let v: any = value

    if (value && value._value instanceof Buffer) {
      // Buffer case
      v = {
        ...value,
        type: 'buffer',
      }
      await fs.writeFile(filePath + '.buffer', value._value)
      delete v._value
    }

    v = JSON.stringify(v, undefined, 2)
    await fs.writeFile(filePath, v)
  }

  async get<T = any> (key: string, table?: string): Promise<T | undefined> {
    const file = await this.getFilePath(table, key)
    if (!(await fs.pathExists(file))) return undefined
    const v = await fs.readFile(file, 'utf8')
    const r = v ? JSON.parse(v) : undefined
    if (r && r.type === 'buffer') {
      // Buffer case
      r._value = await fs.readFile(file + '.buffer')
    }

    return r
  }

  async delete (key: string, table?: string): Promise<void> {
    await fs.unlink(await this.getFilePath(table, key))
  }

  async clear (table?: string): Promise<void> {
    const tablePath = await this.getTable(table)
    await fs.unlink(tablePath)
  }

  async clearAll (): Promise<void> {
    await fs.unlink(this.cacheDirPath)
    await fs.ensureDir(this.cacheDirPath)
  }

  async keys (table = this.defaultTable): Promise<string[] | undefined> {
    const tablePath = path.join(this.cacheDirPath, table)
    if (!(await fs.pathExists(tablePath))) return undefined
    const files = await fs.readdir(tablePath)
    return files.map(f => f.substr(0, f.length - EXT_LEN))
  }

  async entries<T = any> (table: string): Promise<{ [k: string]: T } | undefined> {
    const keys = await this.keys(table)
    if (!keys) return undefined

    const r: { [k: string]: T } = {}
    await promiseMap(keys, async k => {
      const filePath = path.join(this.cacheDirPath, table, k + EXT)
      const v = await fs.readFile(filePath, 'utf8')
      r[k] = v ? JSON.parse(v) : undefined
    })
    return r
  }

  async values<T = any> (table = this.defaultTable): Promise<T[] | undefined> {
    const entries = await this.entries(table)
    if (!entries) return undefined
    return Object.values(entries)
  }

  async tables (): Promise<string[]> {
    return fs.readdir(this.cacheDirPath)
  }
}
