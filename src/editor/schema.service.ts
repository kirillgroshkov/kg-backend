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

class SchemaService {}

export const schemaService = new SchemaService()
