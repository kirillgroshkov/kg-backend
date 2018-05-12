import { CacheDBAdapter } from '@src/srv/cachedb/cachedb'

export class MapCacheDBAdapter implements CacheDBAdapter {
  constructor (public defaultTable = 'cacheDB') {}

  name = 'Map'
  map = new Map<string, Map<string, any>>()

  // Ensures that table exists
  private getTable (table = this.defaultTable): Map<string, any> {
    if (!this.map.has(table)) {
      // Create if doesn't exist
      this.map.set(table, new Map<string, any>())
    }
    return this.map.get(table)!
  }

  async set (key: string, value: any, table?: string): Promise<void> {
    this.getTable(table).set(key, value)
  }

  async get<T = any> (key: string, table?: string): Promise<T | undefined> {
    return this.getTable(table).get(key)
  }

  async delete (key: string, table?: string): Promise<void> {
    this.getTable(table).delete(key)
  }

  async clear (table?: string): Promise<void> {
    this.getTable(table).clear()
  }

  async clearAll (): Promise<void> {
    this.map.clear()
  }

  async keys (table = this.defaultTable): Promise<string[] | undefined> {
    const map = this.map.get(table)
    if (!map) return undefined
    return [...map.keys()]
  }

  async values<T = any> (table = this.defaultTable): Promise<T[] | undefined> {
    const map = this.map.get(table)
    if (!map) return undefined
    return [...map.values()]
  }

  async entries<T> (table: string): Promise<{ [k: string]: T } | undefined> {
    const r: { [k: string]: T } = {}
    const map = this.map.get(table)
    if (!map) return undefined
    map.forEach((v, k) => (r[k] = v))
    return r
  }

  async tables (): Promise<string[]> {
    return [...this.map.keys()]
  }
}
