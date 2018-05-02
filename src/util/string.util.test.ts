import { stringUtil } from '@src/util/string.util'

test('replaceAll', () => {
  let r = stringUtil.replaceAll('ab/cd/ef', '/', 'SLASH')
  expect(r).toBe('abSLASHcdSLASHef')
  // console.log(r)
  r = stringUtil.replaceAll(r, 'SLASH', '/')
  // console.log(r)
  expect(r).toBe('ab/cd/ef')
})
