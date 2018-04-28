import { CacheAdapter } from '@src/srv/cache/cache.service'

export class MapCacheAdapter implements CacheAdapter {
  name = 'Map'
  map = new Map<string, any>()

  async set (key: string, value: any): Promise<void> {
    this.map.set(key, value)
  }

  async get<T = any> (key: string): Promise<T | undefined> {
    return this.map.get(key)
  }

  async delete (key: string): Promise<void> {
    this.map.delete(key)
  }

  async clear (): Promise<void> {
    this.map.clear()
  }

  async keys (): Promise<string[]> {
    return [...this.map.keys()]
  }
}
