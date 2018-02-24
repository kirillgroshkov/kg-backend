/*

ts-node -P src/scripts/tsconfig.json -r tsconfig-paths/register src/scripts/generateJsonSchemas.ts
ts-node src/scripts/generateJsonSchemas.ts

 */

import { projectDir, schemaDir } from '../cnst/paths.cnst'
import { SCHEMAS } from '../validation/schemaValidation.service'
import { jsonSchemaService } from './srv/jsonSchema.service'

jsonSchemaService
  .generate(projectDir + '/tsconfig.json', schemaDir, SCHEMAS)
  .then(() => console.log('done!'))
  .catch(err => console.error(err))
