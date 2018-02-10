/*

ts-node -P src/scripts src/scripts/test.ts

 */

import { slApiService } from '../slApi.service'
require('dotenv').config()

slApiService.getDepartures('9309').then(r => console.log(r.ResponseData))
