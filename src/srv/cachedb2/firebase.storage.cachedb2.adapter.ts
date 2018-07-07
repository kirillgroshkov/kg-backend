import { CacheDB2Adapter } from '@src/srv/cachedb2/cachedb2'
import { firebaseStorageService } from '@src/srv/firebase/firebase.storage.service'

export class FirebaseStorageCacheDB2Adapter implements CacheDB2Adapter {
  constructor () {}

  name = 'FirebaseStorage'

  async set (key: string, value: Buffer, table: string): Promise<void> {
    await firebaseStorageService.saveFile(`${table}/${key}`, value)
  }

  async get (key: string, table: string): Promise<Buffer | undefined> {
    return firebaseStorageService.loadFile(`${table}/${key}`)
  }

  async delete (key: string, table: string): Promise<void> {
    await firebaseStorageService.deleteFile(`${table}/${key}`)
  }

  async keys (table: string): Promise<string[]> {
    return firebaseStorageService.getFiles(table)
  }

  async tables (): Promise<string[]> {
    return [] // todo
  }

  async clear (table: string): Promise<void> {
    await firebaseStorageService.deleteFolder(table)
  }
}
