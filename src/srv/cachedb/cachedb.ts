import { MapCacheDBAdapter } from '@src/srv/cachedb/map.cachedb.adapter'
import { objectUtil } from '@src/util/object.util'
import { timeUtil } from '@src/util/time.util'

export interface CacheDBAdapter {
  name: string
  set (key: string, value: any, table?: string): Promise<void>
  get<T> (key: string, table?: string): Promise<T | undefined>
  delete (key: string, table?: string): Promise<void>
  clear (table?: string): Promise<void>
  clearAll (): Promise<void>
  keys (table?: string): Promise<string[] | undefined> // undefined === cache miss
  values<T> (table?: string): Promise<T[] | undefined> // undefined === cache miss
  entries<T> (table?: string): Promise<{ [k: string]: T } | undefined> // undefined === cache miss
  tables (): Promise<string[]>
}

export interface WrappedValue<T> {
  _value: T
}

class CacheDB implements CacheDBAdapter {
  name = 'CacheDB'
  adapters: CacheDBAdapter[] = [new MapCacheDBAdapter()] // default
  defaultTtl?: number = undefined

  async set (key: string, _value: any, table?: string): Promise<void> {
    const updated = timeUtil.nowUnixtime()
    const value = {
      ...(objectUtil.isObject(_value) ? _value : { _value }), // wrap if non-object
      // id: key, // do we need it?
      updated,
    }

    // set to all adapters simultaneously, wait for all
    await Promise.all(this.adapters.map(a => a.set(key, value, table)))
  }

  // ttl is applied to all levels, except the last one (which we call "source of truth")
  // ttl=undefined means "don't use ttl", so "cache forever" (default behavior)
  // ttl=0 means "invalidate cache", go to the deepest level (directly)
  // ttl=X means:
  // if (!expired) => return (treat as "cache hit")
  // if (expired) => treat as "cache miss" and go deeper (also, delete expired key)
  async get<T = any> (key: string, table?: string, ttl = this.defaultTtl): Promise<T | undefined> {
    // try to get one-by-one, return first who got result !== undefined
    const now = timeUtil.nowUnixtime()
    let level = 0
    // look mom - async iteration!
    for await (const a of this.adapters) {
      level++

      // if ttl=0 - invalidate cache and skip to the deepest level directly
      if (ttl === 0 && level < this.adapters.length) continue

      // console.log(`trying level ${level}`)
      const r = await a.get<any>(key, table)
      if (r === undefined) continue // miss

      // check ttl (for all levels, except the last one, which we call "source of truth")
      if (ttl !== undefined && level < this.adapters.length && now - r.updated >= ttl) {
        console.log(`cache expired ${now - r.updated} seconds ago (${key}) at ${level} (${a.name})`)
        // Let's not delete, cause it's expected that value will be reset by higher-level cache (source of truth)
        // a.delete(key, table) // async
        continue
      }

      console.log(`cache returned (${table || ''}.${key}) from level ${level} (${a.name})`)
      if (level > 1) {
        // need to populate to lower-level caches (which are actually "higher-level" :)
        const updated = timeUtil.nowUnixtime()
        const value = {
          ...r,
          updated,
        }
        for (let i = 1; i < level; i++) {
          this.adapters[i - 1].set(key, value, table) // async
        }
      }

      // unwrap "_value" if needed
      return r._value || r
    }

    console.log(`cache not found (${table || ''}.${key})`)
  }

  // todo: DRY
  async entries<T = any> (table: string, ttl = this.defaultTtl): Promise<{ [k: string]: T }> {
    // try to get one-by-one, return first who got result !== undefined
    // const now = timeUtil.nowUnixtime()
    let level = 0
    // look mom - async iteration!
    for await (const a of this.adapters) {
      level++

      // if ttl=0 - invalidate cache and skip to the deepest level directly
      if (ttl === 0 && level < this.adapters.length) continue

      // console.log(`trying level ${level}`)
      const r = await a.entries<T>(table)
      if (r === undefined) continue // miss

      // ttl is not supported yet, except ttl=0 (above)

      console.log(`cache returned (${table || ''}.entries) from level ${level} (${a.name})`)
      if (level > 1) {
        // need to populate to lower-level caches (which are actually "higher-level" :)
        const updated = timeUtil.nowUnixtime()
        for (let i = 1; i < level; i++) {
          // Set "entries" as all objects, one by one, async
          Object.keys(r).forEach(k => {
            const value = {
              ...(r[k] as any),
              updated,
            }
            this.adapters[i - 1].set(k, value, table) // async
          })
        }
      }
      return r
    }

    console.log(`cache not found (${table || ''}.entries())`)
    return {}
  }

  async getOrDefault<T = any> (key: string, defaultValue: T, table?: string, ttl = this.defaultTtl): Promise<T> {
    const r = await this.get<T>(key, table, ttl)
    if (r !== undefined) return r

    console.log(`cacheService.getOrDefault(${key}): setting default value`)
    await this.set(key, defaultValue, table)
    return defaultValue
  }

  async delete (key: string, table?: string): Promise<void> {
    // all adapters
    await Promise.all(this.adapters.map(a => a.delete(key, table)))
  }

  async clear (table?: string): Promise<void> {
    // all adapters
    await Promise.all(this.adapters.map(a => a.clear(table)))
  }

  async clearAll (): Promise<void> {
    // all adapters
    await Promise.all(this.adapters.map(a => a.clearAll()))
  }

  async keys (table?: string): Promise<string[]> {
    for await (const a of this.adapters) {
      const keys = await a.keys(table)
      if (keys) return keys
    }
    return []
  }

  async values<T = any> (table?: string): Promise<T[]> {
    for await (const a of this.adapters) {
      const values = await a.values<T>(table)
      if (values) return values
    }
    return []
  }

  async tables (): Promise<string[]> {
    // get from the first adapter
    return this.adapters[0].tables()
  }
}

export const cacheDB = new CacheDB()
