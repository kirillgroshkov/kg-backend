import * as KoaRouter from 'koa-router'
import { rootDir } from '../cnst/paths.cnst'
import { firestoreService } from '../srv/firestore.service'
const yamljs = require('yamljs')

const router = new KoaRouter({
  prefix: '/editor',
})
export const editorResource = router.routes()

router.get('/schema', ctx => {
  ctx.body = yamljs.load(rootDir + '/editor/schema.yaml')
})

router.get('/collections', ctx => {
  ctx.body = yamljs.load(rootDir + '/editor/schema.yaml').collections
})

router.get('/test', async ctx => {
  ctx.body = await firestoreService.saveDoc('col2', {
    id: 'yazz',
    a: 'b',
    c: 123,
    d: 'azzzzz',
    mm: {
      ddd: '23',
    },
  })
})

router.get('/data/:colName', async ctx => {
  ctx.body = await firestoreService.getCollectionData(ctx.params.colName)
})

router.put('/data/:colName', async ctx => {
  // ctx.body = ctx.request.body
  console.log(`saving ${ctx.params.colName}/${ctx.request.body.id}`)
  ctx.body = await firestoreService.saveDoc(
    ctx.params.colName,
    ctx.request.body,
  )
})

router.delete('/data/:colName/:id', async ctx => {
  console.log(`deleting ${ctx.params.colName}/${ctx.params.id}`)
  ctx.body = await firestoreService.deleteDoc(ctx.params.colName, ctx.params.id)
})
