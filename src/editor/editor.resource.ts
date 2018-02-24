import { editorService } from '@src/editor/editor.service'
import { schemaService } from '@src/editor/schema.service'
import { adminMiddleware } from '@src/mw/admin.mw'
import { schemaValidationService } from '@src/validation/schemaValidation.service'
import * as KoaRouter from 'koa-router'

const router = new KoaRouter({
  prefix: '/editor',
})
export const editorResource = router.routes()

router.get('/:project/schema', async ctx => {
  const schema = await schemaService.getSchema(ctx.params.project)
  if (!schema) ctx.throw(404)
  schemaValidationService.validate('AppSchema', schema)
  ctx.body = schema
})

/*
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
})*/

router.get('/:project/allData', async ctx => {
  ctx.body = await editorService.getAllData(ctx.params.project)
})

router.get('/:project/data/:colName', async ctx => {
  ctx.body = await editorService.getData(ctx.params.project, ctx.params.colName)
})

router.put('/:project/data/:colName', adminMiddleware(), async ctx => {
  ctx.body = await editorService.saveData(
    ctx.params.project,
    ctx.params.colName,
    ctx.request.body,
  )
})

router.delete('/:project/data/:colName/:id', adminMiddleware(), async ctx => {
  ctx.body = await editorService.deleteData(
    ctx.params.project,
    ctx.params.colName,
    ctx.params.id,
  )
})
