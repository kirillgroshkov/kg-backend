import { schemaDir } from '@src/cnst/paths.cnst'
import { memo } from '@src/decorators/memo.decorator'
import { AppValidationError } from '@src/error/app.validation.error'
import { log } from '@src/srv/log.service'
import { Ajv, ErrorObject, ValidateFunction } from 'ajv'
import * as AjvStatic from 'ajv'
import * as fs from 'fs-extra'

export const SCHEMAS = ['AppSchema']

class SchemaValidationService {
  @memo()
  private ajv (): Ajv {
    const ajv = new AjvStatic({
      removeAdditional: true,
      useDefaults: true,
      allErrors: true,
      format: 'full',
      // logger: log,
      verbose: true,

      // meta: require('ajv/lib/refs/json-schema-draft-04.json'),
      // compat with draft-04
      // meta: false, // optional, to prevent adding draft-06 meta-schema
      // extendRefs: true, // optional, current default is to 'fail', spec behaviour is to 'ignore'
      // unknownFormats: 'ignore',  // optional, current default is true (fail)
    })

    ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'))
    // const metaSchema = require('ajv/lib/refs/json-schema-draft-04.json')
    // ajv.addMetaSchema(metaSchema)
    // ;(ajv as any)._opts.defaultMeta = metaSchema.id

    // optional, using unversioned URI is out of spec, see https://github.com/json-schema-org/json-schema-spec/issues/216
    // ;(ajv as any)._refs['http://json-schema.org/schema#'] = 'http://json-schema.org/draft-04/schema';
    // ;(ajv as any)._refs['http://json-schema.org/draft-04/schema#'] = 'http://json-schema.org/draft-04/schema';

    return ajv
  }

  @memo()
  private getFn (type: string): ValidateFunction | undefined {
    console.log(`Loading ${type}.schema.json...`)
    const schemaFile = `${schemaDir}/${type}.schema.json`
    if (!fs.existsSync(schemaFile)) return
    const s = fs.readJsonSync(schemaFile)
    return this.ajv().compile(s)
  }

  validate (type: string, object: any, throwOnError = true): ErrorObject[] {
    const fn = this.getFn(type)
    if (!fn) {
      log.warn(`Schema not found! ${type}`)
      return []
    }

    if (fn(object)) return []
    const errors = fn.errors as ErrorObject[]
    if (throwOnError) this.throwValidationError(errors, type, object)
    return errors
  }

  throwValidationError (
    errors: ErrorObject[],
    type?: string,
    object?: any,
    message?: string,
  ): never {
    throw new AppValidationError(
      this.formatErrors(errors, type, object, message),
    )
  }

  formatErrors (
    errors: ErrorObject[],
    type?: string,
    object?: any,
    message?: string,
  ): string {
    const t = ['\n']
    if (message) t.push(message, '')

    if (errors && errors.length) {
      for (let i = 0; i < errors.length; i++) {
        const e = errors[i]

        t.push(
          `${i + 1}. Invalid ${type || ''} object:`,
          JSON.stringify(object || e.data, undefined, 2),
          '',
          e.dataPath ? `${e.dataPath} ${e.message}` : `${e.message}`,
          '', // extra \n
        )
      }
    }

    return t.join('\n')
  }
}

export const schemaValidationService = new SchemaValidationService()
