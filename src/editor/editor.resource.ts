import * as KoaRouter from 'koa-router'
import { firestoreService } from '../srv/firestore.service'
import { editorService } from './editor.service'

const router = new KoaRouter({
  prefix: '/editor',
})
export const editorResource = router.routes()

router.get('/:project/schema', async ctx => {
  const schema = await editorService.getSchema(ctx.params.project)
  if (!schema) ctx.throw(404)
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

router.put('/:project/data/:colName', async ctx => {
  ctx.body = await editorService.saveData(
    ctx.params.project,
    ctx.params.colName,
    ctx.request.body,
  )
})

router.delete('/:project/data/:colName/:id', async ctx => {
  ctx.body = await editorService.deleteData(
    ctx.params.project,
    ctx.params.colName,
    ctx.params.id,
  )
})
