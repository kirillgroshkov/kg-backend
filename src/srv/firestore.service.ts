import { DocumentSnapshot, Firestore, Query, QueryDocumentSnapshot, QuerySnapshot } from '@google-cloud/firestore'
import { memo } from '@src/decorators/memo.decorator'
import { firebaseService } from '@src/srv/firebase.service'
import { log } from '@src/srv/log.service'

class FirestoreService {
  @memo()
  db (): FirebaseFirestore.Firestore {
    log('FirestoreService init...')
    return firebaseService.admin().firestore()
  }

  async getCollectionData<T = any> (colName: string): Promise<T[]> {
    console.log(`firestoreService.getCollectionData ${colName}`)
    return this.runQuery<T>(await this.db().collection(colName))
  }

  async runQuery<T = any> (q: Query): Promise<T[]> {
    const qs: QuerySnapshot = await q.get()
    return this.querySnapshotToArray<T>(qs)
  }

  private querySnapshotToArray<T = any> (qs: QuerySnapshot): T[] {
    const r: any[] = []
    qs.forEach(d => {
      r.push({
        id: d.id,
        ...d.data(),
      })
    })
    return r
  }

  async saveDoc (colName: string, doc: any, docId?: string): Promise<any> {
    const id = docId || doc.id
    console.log(`firestoreService.saveDoc ${colName}.${id}`)

    return this.db()
      .collection(colName)
      .doc(id)
      .set(doc)
  }

  // todo: max 500
  async saveBatch (colName: string, docs: any[]): Promise<void> {
    if (!docs.length) return
    console.log(`firestoreService.saveBatch ${colName} ${docs.length} items`)

    const db = this.db()
    const b = db.batch()

    docs.forEach(doc => {
      b.set(db.collection(colName).doc(doc.id), doc)
    })

    await b.commit()
  }

  async getDoc<T = any> (colName: string, docId: string): Promise<T | undefined> {
    console.log(`firestoreService.getDoc ${colName}.${docId}`)

    const doc: DocumentSnapshot = await this.db()
      .collection(colName)
      .doc(docId)
      .get()

    return {
      id: doc.id,
      ...(doc.data() as any),
    }
  }

  async deleteDoc (colName: string, id: string): Promise<any> {
    console.log(`firestoreService.deleteDoc ${colName}.${id}`)

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
