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

  async keys (table?: string): Promise<string[]> {
    return [...this.getTable(table).keys()]
  }

  async tables (): Promise<string[]> {
    return [...this.map.keys()]
  }
}
