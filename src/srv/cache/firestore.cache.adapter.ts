import { CacheAdapter } from '@src/srv/cache/cache.service'
import { firestoreService } from '@src/srv/firestore.service'

interface WrappedValue {
  v: string
}

export class FirestoreCacheAdapter implements CacheAdapter {
  constructor (private COLLECTION: string) {}

  name = 'Firestore'

  async set (key: string, value: any): Promise<void> {
    await firestoreService.saveDoc(this.COLLECTION, { v: JSON.stringify(value) }, key)
  }

  async get<T = any> (key: string): Promise<T | undefined> {
    const r = await firestoreService.getDoc<WrappedValue>(this.COLLECTION, key)
    return r && r.v ? JSON.parse(r.v) : undefined
  }

  async delete (key: string): Promise<void> {
    await firestoreService.deleteDoc(this.COLLECTION, key)
  }

  async clear (): Promise<void> {
    // todo
    return undefined
  }

  async keys (): Promise<string[]> {
    // todo
    return []
  }
}
