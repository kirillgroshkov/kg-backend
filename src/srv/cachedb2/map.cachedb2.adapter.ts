import { CacheDB2Adapter } from '@src/srv/cachedb2/cachedb2'

export class MapCacheDB2Adapter implements CacheDB2Adapter {
  constructor () {}

  name = 'Map'
  map = new Map<string, Map<string, any>>()

  // Ensures that table exists
  private getTable (table: string): Map<string, any> {
    if (!this.map.has(table)) {
      // Create if doesn't exist
      this.map.set(table, new Map<string, any>())
    }
    return this.map.get(table)!
  }

  async set (key: string, value: Buffer, table: string): Promise<void> {
    this.getTable(table).set(key, value)
  }

  async get (key: string, table: string): Promise<Buffer | undefined> {
    return this.getTable(table).get(key)
  }

  async delete (key: string, table: string): Promise<void> {
    this.getTable(table).delete(key)
  }

  async keys (table: string): Promise<string[]> {
    const map = this.map.get(table)
    if (!map) return []
    return [...map.keys()]
  }

  async tables (): Promise<string[]> {
    return [...this.map.keys()]
  }

  async clear (table: string): Promise<void> {
    this.getTable(table).clear()
  }
}
