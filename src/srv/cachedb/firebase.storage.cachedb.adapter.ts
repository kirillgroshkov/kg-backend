import { CacheDBAdapter } from '@src/srv/cachedb/cachedb'
import { firebaseStorageService } from '@src/srv/firebase/firebase.storage.service'

export class FirebaseStorageCacheDBAdapter implements CacheDBAdapter {
  constructor (public defaultTable = 'cacheDB') {}

  name = 'FirebaseStorage'

  async set (key: string, value: string | Buffer, table = this.defaultTable): Promise<void> {
    await firebaseStorageService.saveFile(`${table}/${key}`, value)
  }

  async get<T = Buffer> (key: string, table = this.defaultTable): Promise<T | undefined> {
    return firebaseStorageService.loadFile(`${table}/${key}`) as any
  }

  async delete (key: string, table = this.defaultTable): Promise<void> {
    await firebaseStorageService.deleteFile(`${table}/${key}`)
  }

  async clear (table = this.defaultTable): Promise<void> {
    // todo
  }

  async clearAll (): Promise<void> {
    // todo
  }

  async keys (table = this.defaultTable): Promise<string[] | undefined> {
    // todo
    return
  }

  async values<T = any> (table: string): Promise<T[] | undefined> {
    // todo
    return
  }

  async tables (): Promise<string[]> {
    // todo
    return []
  }

  async entries<T = any> (table: string): Promise<{ [k: string]: T } | undefined> {
    // todo
    return
  }
}
