import * as fs from 'fs-extra'
import promiseMap from 'p-map'
import * as TJS from 'typescript-json-schema'
import { log } from '../../srv/log.service'

const settings: TJS.PartialArgs = {
  required: true,
  strictNullChecks: true,
  noExtraProps: true,
  typeOfKeyword: true,
}

const concurrency = 4

class JsonSchemaService {
  async generate (tsconfigFile: string, outDir: string, types: string[]): Promise<void> {
    const program = TJS.programFromConfig(tsconfigFile)
    /*
    const g = TJS.buildGenerator(program, settings) as JsonSchemaGenerator;

    await P.map(types,async t => {
      const schema = g.getSchemaForSymbol(t)
      const f = `${outDir}/${t}.schema.json`
      await fs.writeJson(f, schema, {spaces: 2})
      log(`<< ${f}`)
    })
    */
    // const schema = TJS.generateSchema(program, "MyType", settings);
    await promiseMap(
      types,
      async t => {
        const schema = TJS.generateSchema(program, t, settings)
        const f = `${outDir}/${t}.schema.json`
        await fs.writeJson(f, schema, { spaces: 2 })
        log(`<< ${f}`)
      },
      { concurrency },
    )
  }
}

export const jsonSchemaService = new JsonSchemaService()
