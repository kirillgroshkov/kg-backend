import { rootDir } from '@src/cnst/paths.cnst'
import { firestoreService } from '@src/srv/firestore.service'
import * as P from 'bluebird'
import * as fs from 'fs-extra'
const yamljs = require('yamljs')

class EditorService {
  async getSchema (project: string): Promise<any> {
    const schemaFile = `${rootDir}/editor/${project}/schema.yaml`
    if (!await fs.pathExists(schemaFile)) return
    return yamljs.load(schemaFile)
  }

  async getAllData (project: string): Promise<any> {
    const schema = await this.getSchema(project)
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

  async saveData (project: string, colName: string, body: any): Promise<any> {
    console.log(`saving ${colName}/${body.id}`)
    return await firestoreService.saveDoc(`${project}_${colName}`, body)
  }

  async deleteData (project: string, colName: string, id: string): Promise<any> {
    console.log(`deleting ${colName}/${id}`)
    return await firestoreService.deleteDoc(`${project}_${colName}`, id)
  }
}

export const editorService = new EditorService()
