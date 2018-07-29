import { CacheDB2Adapter } from '@src/srv/cachedb2/cachedb2'
import { firebaseStorageService } from '@src/srv/firebase/firebase.storage.service'
import { zipUtil } from '@src/util/zip.util'

export class FireStorageCachedb2Adapter implements CacheDB2Adapter {
  constructor (public enableZip = false) {}

  name = 'FireStorage'

  async set (key: string, value: Buffer, table: string): Promise<void> {
    const data = this.enableZip ? await zipUtil.zip(value) : value
    await firebaseStorageService.saveFile(`${table}/${key}`, data)
  }

  async get (key: string, table: string): Promise<Buffer | undefined> {
    const b = await firebaseStorageService.loadFile(`${table}/${key}`)

    return b && this.enableZip ? await zipUtil.unzip(b) : b
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
