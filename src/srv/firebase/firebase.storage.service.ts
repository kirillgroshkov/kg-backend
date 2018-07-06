import { Bucket } from '@google-cloud/storage'
import { memo } from '@src/decorators/memo.decorator'
import { env } from '@src/environment/environment'
import { firebaseService } from '@src/srv/firebase/firebase.service'
import { log } from '@src/srv/log.service'

class FirebaseStorageService {
  @memo()
  bucket (): Bucket {
    log('FirebaseStorageService init...')
    return firebaseService
      .admin()
      .storage()
      .bucket(env().firebaseStorageBucketName)
  }

  async saveFile (fileName: string, data: string | Buffer): Promise<void> {
    log(`>> Storage saveFile ${fileName} ${data.length} bytes`)
    await this.bucket()
      .file(fileName)
      .save(data)
  }

  async loadFile (fileName: string): Promise<Buffer> {
    log(`<< Storage loadFile ${fileName}`)
    const [b] = await this.bucket()
      .file(fileName)
      .download()
    return b
  }

  async deleteFile (fileName: string): Promise<void> {
    log(`xx Storage deleteFile ${fileName}`)
    await this.bucket()
      .file(fileName)
      .delete()
  }
}

export const firebaseStorageService = new FirebaseStorageService()
