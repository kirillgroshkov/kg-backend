import { DocumentSnapshot, Firestore, Query, QueryDocumentSnapshot, QuerySnapshot } from '@google-cloud/firestore'
import { memo } from '@src/decorators/memo.decorator'
import { firebaseService } from '@src/srv/firebase/firebase.service'
import { log } from '@src/srv/log.service'
import { stringUtil } from '@src/util/string.util'

class FirestoreService {
  @memo()
  db (): FirebaseFirestore.Firestore {
    log('FirestoreService init...')
    const firestore = firebaseService.admin().firestore()
    firestore.settings({
      timestampsInSnapshots: true,
    })

    return firestore
  }

  private escapeDocId (docId: string): string {
    return stringUtil.replaceAll(docId, '/', 'SLASH')
  }

  private unescapeDocId (docId: string): string {
    return stringUtil.replaceAll(docId, 'SLASH', '/')
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
    docId = docId || doc.id
    const docSize = JSON.stringify(doc || {}).length
    console.log(`firestoreService.saveDoc ${colName}.${docId} size=${docSize}`)

    return await this.db()
      .collection(colName)
      .doc(this.escapeDocId(docId!))
      .set(doc)
      .catch(err => {
        // todo: fix it with cachedb2 and firebaseStorageAdapter
        const msg = `error in saveDoc ${colName} docId=${docId}, docSize=${docSize}`
        console.log(msg)
        // sentryService.captureMessage(`error in saveDoc ${colName} docId=${docId}, docSize=${docSize}`)
        // console.log('str doc:\n', JSON.stringify(doc))
        // throw err
      })
  }

  async saveBatch (colName: string, _docs: any[]): Promise<void> {
    const docs = [..._docs]
    if (!docs.length) return

    // Firestore allows to save up to 500 docs in 1 batch
    while (docs.length > 500) {
      const subDocs = docs.splice(0, 500)
      await this.saveBatch(colName, subDocs)
    }

    console.log(`firestoreService.saveBatch ${colName} ${docs.length} items`, docs.map(d => d.id))

    const db = this.db()
    const b = db.batch()

    docs.forEach(doc => {
      b.set(db.collection(colName).doc(this.escapeDocId(doc.id)), doc)
    })

    await b.commit()
  }

  async getDoc<T = any> (colName: string, docId: string): Promise<T | undefined> {
    console.log(`firestoreService.getDoc ${colName}.${docId}`)

    const doc: DocumentSnapshot = await this.db()
      .collection(colName)
      .doc(this.escapeDocId(docId))
      .get()

    const data = doc.data()
    if (data === undefined) return undefined

    return {
      id: docId,
      ...(data as any),
    }
  }

  async deleteDoc (colName: string, docId: string): Promise<any> {
    console.log(`firestoreService.deleteDoc ${colName}.${docId}`)

    return this.db()
      .collection(colName)
      .doc(this.escapeDocId(docId))
      .delete()
  }

  // https://firebase.google.com/docs/firestore/manage-data/delete-data#collections
  async deleteCollection (colName: string): Promise<void> {
    const s: QuerySnapshot = await this.db()
      .collection(colName)
      .orderBy('__name__')
      .get()

    if (!s.size) return

    const batch = this.db().batch()
    s.docs.forEach(doc => batch.delete(doc.ref))
    await batch.commit()
  }
}

export const firestoreService = new FirestoreService()
