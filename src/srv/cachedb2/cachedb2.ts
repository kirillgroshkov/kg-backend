import { MapCacheDB2Adapter } from '@src/srv/cachedb2/map.cachedb2.adapter'

export interface CacheDB2Adapter {
  name: string
  set (key: string, value: Buffer, table: string): Promise<void>
  get (key: string, table: string): Promise<Buffer | undefined>
  delete (key: string, table: string): Promise<void>
  keys (table: string): Promise<string[]>
  tables (): Promise<string[]>
  clear (table: string): Promise<void>
}

export class CacheDB2 {
  constructor (public adapters: CacheDB2Adapter[] = [new MapCacheDB2Adapter()], public defaultTable = 'cacheDB') {}

  //
  // convenience methods
  //
  async setObject<T> (key: string, obj: T, table = this.defaultTable): Promise<void> {
    const b = obj && Buffer.from(JSON.stringify(obj))
    await this.set(key, b, table)
  }

  async getObject<T = any> (key: string, table = this.defaultTable, skipCache = false): Promise<T | undefined> {
    const b = await this.get(key, table, skipCache)
    return b && JSON.parse(b.toString())
  }

  async setString (key: string, s: string, table = this.defaultTable): Promise<void> {
    await this.set(key, Buffer.from(s), table)
  }

  async getString (key: string, table = this.defaultTable, skipCache = false): Promise<string | undefined> {
    const b = await this.get(key, table, skipCache)
    return b && b.toString()
  }

  //
  // Buffer api
  //
  async set (key: string, value: Buffer | undefined, table = this.defaultTable): Promise<void> {
    if (value === undefined) {
      // set to undefined means "delete"
      return this.delete(key, table)
    }

    // set to all adapters simultaneously, wait for all
    await Promise.all(this.adapters.map(a => a.set(key, value, table)))
  }

  async get (key: string, table = this.defaultTable, skipCache = false): Promise<Buffer | undefined> {
    // try to get one-by-one, return first who got result !== undefined
    let level = 0
    // look mom - async iteration!
    for await (const a of this.adapters) {
      level++

      // if (skipCache) - invalidate cache and skip to the deepest level directly
      if (skipCache && level < this.adapters.length) continue

      // console.log(`trying level ${level}`)
      const r = await a.get(key, table)
      if (r === undefined) continue // miss

      console.log(`cache returned (${table || ''}.${key}) from level ${level} (${a.name})`)
      if (level > 1) {
        // need to populate to lower-level caches (which are actually "higher-level" :)
        for (let i = 1; i < level; i++) {
          this.adapters[i - 1].set(key, r, table) // async
        }
      }

      return r
    }

    console.log(`cache not found (${table || ''}.${key})`)
  }

  async getOrDefault (key: string, defaultValue: Buffer, table = this.defaultTable): Promise<Buffer> {
    const r = await this.get(key, table)
    if (r !== undefined) return r

    console.log(`cacheDB.getOrDefault(${key}): setting default value`)
    await this.set(key, defaultValue, table)
    return defaultValue
  }

  async delete (key: string, table = this.defaultTable): Promise<void> {
    // all adapters
    await Promise.all(this.adapters.map(a => a.delete(key, table)))
  }

  async clear (table = this.defaultTable): Promise<void> {
    // all adapters
    await Promise.all(this.adapters.map(a => a.clear(table)))
  }

  async keys (table = this.defaultTable, skipCache = false): Promise<string[]> {
    // skipCache ? last adapter (source of truth)
    // otherwise: first adapter (cache)
    const a = skipCache ? this.adapters[this.adapters.length - 1] : this.adapters[0]
    return a.keys(table)
  }

  async tables (skipCache = false): Promise<string[]> {
    // skipCache ? last adapter (source of truth)
    // otherwise: first adapter (cache)
    const a = skipCache ? this.adapters[this.adapters.length - 1] : this.adapters[0]
    return a.tables()
  }

  /*
  private valueToBuffer (v: any): Buffer | undefined {
    if (v === undefined || v === null) return undefined

    if (Buffer.isBuffer(v)) return v

    if (typeof v === 'string') {
      return Buffer.from(v)
    }

    const s = JSON.stringify(v)
    return Buffer.from(s)
  }*/
}

export const firestoreCacheDB = new CacheDB2()
export const fireStorageCacheDB = new CacheDB2()
