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

  async saveFile (fileName: string, data: Buffer): Promise<void> {
    log(`>> Storage saveFile ${fileName} ${data.length} bytes`)
    await this.bucket()
      .file(fileName)
      .save(data)
  }

  async loadFile (fileName: string): Promise<Buffer | undefined> {
    log(`<< Storage loadFile ${fileName}`)
    const [b] = await this.bucket()
      .file(fileName)
      .download()
      .catch(err => {
        if (err && err.code === 404) {
          log(`<< Storage loadFile ${fileName} not found`)
          return [undefined]
        }

        log.error(`<< Storage loadFile ${fileName} error: ${err.message}`)
        return [undefined]
      })
    return b
  }

  async deleteFile (fileName: string): Promise<void> {
    log(`xx Storage deleteFile ${fileName}`)
    await this.bucket()
      .file(fileName)
      .delete()
      .catch(err => {
        if (err && err.code === 404) {
          log(`xx Storage deleteFile ${fileName} not found`)
          return
        }

        log.error(`<< Storage deleteFile ${fileName} error: ${err.message}`)
        return
      })
  }

  async deleteFolder (folderPath: string): Promise<void> {
    log(`xx Storage deleteFolder ${folderPath}`)
    await this.bucket()
      .deleteFiles({
        prefix: folderPath,
      })
      .catch(err => {
        if (err && err.code === 404) {
          log(`xx Storage deleteFolder ${folderPath} not found`)
          return
        }

        log.error(`<< Storage deleteFolder ${folderPath} error: ${err.message}`)
        return
      })
  }

  async getFiles (folderPath: string): Promise<string[]> {
    const prefix = folderPath + '/'

    const [files] = await this.bucket().getFiles({
      prefix,
      delimiter: '/',
    })

    return files.map(f => f.name.substr(prefix.length))
  }
}

export const firebaseStorageService = new FirebaseStorageService()
