import { CacheDBAdapter } from '@src/srv/cachedb/cachedb'
import { firestoreService } from '@src/srv/firestore.service'

export class FirestoreCacheDBAdapter implements CacheDBAdapter {
  constructor (public defaultTable = 'cacheDB') {}

  name = 'Firestore'

  // So we only allow to save "object" values, arrays or primitives are not supported (should be wrapped above)
  async set (key: string, value: any, table = this.defaultTable): Promise<void> {
    await firestoreService.saveDoc(table, value, key)
  }

  async get<T = any> (key: string, table = this.defaultTable): Promise<T | undefined> {
    return firestoreService.getDoc<T>(table, key)
  }

  async delete (key: string, table = this.defaultTable): Promise<void> {
    await firestoreService.deleteDoc(table, key)
  }

  async clear (table = this.defaultTable): Promise<void> {
    // todo
  }

  async clearAll (): Promise<void> {
    // todo
  }

  async keys (table = this.defaultTable): Promise<string[]> {
    // todo
    return []
  }

  async tables (): Promise<string[]> {
    // todo
    return []
  }
}
