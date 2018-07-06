import { api } from '@src/api'
import { schemaService } from '@src/editor/schema.service'
import { AppError } from '@src/error/app.error'
import { firestoreService } from '@src/srv/firebase/firestore.service'
import * as P from 'bluebird'

class EditorService {
  async getAllData (project: string): Promise<any> {
    const schema = await schemaService.getSchema(project)
    const colNames: string[] = schema.collections.map((c: any) => c.name)
    const props: { [c: string]: Promise<any> } = {}
    colNames.forEach(c => {
      props[c] = firestoreService.getCollectionData(`${project}_${c}`)
    })

    return P.props(props)
  }

  async getData (project: string, colName: string): Promise<any> {
    return firestoreService.getCollectionData(`${project}_${colName}`)
  }

  async saveData (project: string, colName: string, body: any): Promise<void> {
    if (!body.id) throw new AppError('id should be defined')
    console.log(`saving ${colName}/${body.id}`)
    this.pushToIO(project, colName, body.id, body)
    await firestoreService.saveDoc(`${project}_${colName}`, body)
  }

  async deleteData (project: string, colName: string, id: string): Promise<void> {
    console.log(`deleting ${colName}/${id}`)
    this.pushToIO(project, colName, id, undefined)
    await firestoreService.deleteDoc(`${project}_${colName}`, id)
  }

  pushToIO (project: string, colName: string, id: string, value: any): void {
    // const newData = await firestoreService.getCollectionData(`${project}_${colName}`)

    api.io.emit('dataUpdated', {
      collection: colName,
      // data: newData,
      id,
      value,
    })
  }
}

export const editorService = new EditorService()
