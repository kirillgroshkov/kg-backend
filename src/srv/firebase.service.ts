import * as FirebaseAdmin from 'firebase-admin'
import { memo } from '../decorators/memo.decorator'
import { secret } from '../environment/secret'
import { log } from './log.service'

class FirebaseService {
  @memo()
  admin (): typeof FirebaseAdmin {
    log('FirebaseService init...')
    const serviceAccount = JSON.parse(Buffer.from(secret('SECRET_FIREBASE'), 'base64').toString('utf8'))

    FirebaseAdmin.initializeApp({
      credential: FirebaseAdmin.credential.cert(serviceAccount),
    })

    return FirebaseAdmin
  }

  async verifyIdToken (idToken: string): Promise<FirebaseAdmin.auth.DecodedIdToken> {
    return this.admin()
      .auth()
      .verifyIdToken(idToken)
  }
}

export const firebaseService = new FirebaseService()
