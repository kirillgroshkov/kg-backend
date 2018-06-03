import { nunjucksService } from '@src/srv/nunjucks.service'

test('render', async () => {
  const r = await nunjucksService.render('test1.html', { world: 'World' })
  // console.log(r)
  expect(r).toBe('Hello World!\n')
})
