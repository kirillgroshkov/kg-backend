import { memo } from '@src/decorators/memo.decorator'
import { secret } from '@src/environment/secret'
import * as admin from 'firebase-admin'
import { log } from '../log.service'

class FirebaseService {
  @memo()
  admin (): typeof admin {
    log('FirebaseService init...')
    const serviceAccount = JSON.parse(Buffer.from(secret('SECRET_FIREBASE'), 'base64').toString('utf8'))

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })

    return admin
  }

  async verifyIdToken (idToken: string): Promise<admin.auth.DecodedIdToken> {
    return this.admin()
      .auth()
      .verifyIdToken(idToken)
  }

  async getUser (uid: string): Promise<admin.auth.UserRecord> {
    return this.admin()
      .auth()
      .getUser(uid)
  }
}

export const firebaseService = new FirebaseService()
