import { Firestore, QuerySnapshot } from '@google-cloud/firestore'
import { memo } from '../decorators/memo.decorator'
import { firebaseService } from './firebase.service'
import { log } from './log.service'

class FirestoreService {
  @memo()
  db (): Firestore {
    log('FirestoreService init...')
    return firebaseService.admin().firestore()
  }

  async getCollectionData (colName: string): Promise<any> {
    const col: QuerySnapshot = await this.db()
      .collection(colName)
      .get()
    const r: any[] = []
    col.forEach(d => {
      r.push(
        Object.assign(
          {
            id: d.id,
          },
          d.data(),
        ),
      )
    })
    return r
  }

  async saveDoc (colName: string, doc: any): Promise<any> {
    return this.db()
      .collection(colName)
      .doc(doc.id)
      .set(doc)
  }

  async deleteDoc (colName: string, id: string): Promise<any> {
    return this.db()
      .collection(colName)
      .doc(id)
      .delete()
  }

  async test (): Promise<any> {
    const col: QuerySnapshot = await this.db()
      .collection('col1')
      .get()
    const r: any = {}
    col.forEach(d => (r[d.id] = d.data()))
    return r
  }
}

export const firestoreService = new FirestoreService()
