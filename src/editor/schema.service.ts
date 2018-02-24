import { rootDir } from '@src/cnst/paths.cnst'
import { AppError } from '@src/error/app.error'
import * as fs from 'fs-extra'
const yamljs = require('yamljs')

export interface AppSchema {
  types: SchemaType[]
  collections: Collection[]
}

export interface SchemaType {
  name: string
  label?: string
  fields: Field[]
}

export interface Collection {
  name: string
  label?: string
  icon?: string
  folders?: boolean
  type: string
}

export interface Field {
  name: string
  label?: string
  type?: string
  required?: boolean

  minLength?: number
  maxLength?: number

  objectOf?: string
  arrayOf?: string
}

class SchemaService {
  async getSchema (project: string): Promise<AppSchema> {
    const schemaFile = `${rootDir}/editor/${project}/schema.yaml`
    if (!await fs.pathExists(schemaFile))
      throw new AppError(`Cannot find schema file: ${schemaFile}`)
    return yamljs.load(schemaFile)
  }
}

export const schemaService = new SchemaService()
