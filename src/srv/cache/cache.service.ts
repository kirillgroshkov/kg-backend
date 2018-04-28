import { MapCacheAdapter } from '@src/srv/cache/map.cache.adapter'

export interface CacheAdapter {
  name: string
  set (key: string, value: any): Promise<void>
  get<T> (key: string): Promise<T | undefined>
  delete (key: string): Promise<void>
  clear (): Promise<void>
  keys (): Promise<string[]>
}

class CacheService implements CacheAdapter {
  name = 'CacheService'
  adapters: CacheAdapter[] = [new MapCacheAdapter()] // default

  async set (key: string, value: any): Promise<void> {
    // set to all adapters simultaneously, wait for all
    await Promise.all(this.adapters.map(a => a.set(key, value)))
  }

  async get<T = any> (key: string): Promise<T | undefined> {
    // try to get one-by-one, return first who got result !== undefined
    // look mom - async iteration!
    let level = 0
    for await (const a of this.adapters) {
      level++
      // console.log(`trying level ${level}`)
      const r = await a.get<T>(key)
      if (r !== undefined) {
        console.log(`cache returned (${key}) from level ${level} (${a.name})`)
        if (level > 1) {
          // need to populate to lower-level caches (which are actually "higher-level" :)
          for (let i = 1; i < level; i++) {
            this.adapters[i - 1].set(key, r) // async
          }
        }
        return r
      }
    }
  }

  async getOrDefault<T = any> (key: string, defaultValue: T): Promise<T> {
    const r = await this.get<T>(key)
    if (r !== undefined) return r

    console.log(`cacheService.getOrDefault(${key}): setting default value`)
    await this.set(key, defaultValue)
    return defaultValue
  }

  async delete (key: string): Promise<void> {
    // all adapters
    await Promise.all(this.adapters.map(a => a.delete(key)))
  }

  async clear (): Promise<void> {
    // all adapters
    await Promise.all(this.adapters.map(a => a.clear()))
  }

  async keys (): Promise<string[]> {
    // get from the first adapter
    return this.adapters[0].keys()
  }
}

export const cacheService = new CacheService()
