import { CacheDB2Adapter } from '@src/srv/cachedb2/cachedb2'
import { firestoreService } from '@src/srv/firebase/firestore.service'
import { zipUtil } from '@src/util/zip.util'

interface WrappedBuffer {
  v: Buffer
}

export class FirestoreCacheDB2Adapter implements CacheDB2Adapter {
  constructor (public enableZip = false) {}

  name = 'Firestore'

  async set (key: string, value: Buffer, table: string): Promise<void> {
    const wb: WrappedBuffer = {
      v: value,
    }
    if (this.enableZip) wb.v = await zipUtil.zip(wb.v)
    await firestoreService.saveDoc(table, wb, key)
  }

  async get (key: string, table: string): Promise<Buffer | undefined> {
    const wb = await firestoreService.getDoc<WrappedBuffer>(table, key)
    if (!wb) return
    return wb.v && this.enableZip ? await zipUtil.unzip(wb.v) : wb.v
  }

  async delete (key: string, table: string): Promise<void> {
    await firestoreService.deleteDoc(table, key)
  }

  async keys (table: string): Promise<string[]> {
    const values = await firestoreService.getCollectionData(table)
    return values.map(v => (v as any).id)
  }

  async clear (table: string): Promise<void> {
    await firestoreService.deleteCollection(table)
  }

  async tables (): Promise<string[]> {
    // todo
    return []
  }
}
