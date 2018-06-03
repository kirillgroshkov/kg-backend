import { by, objectUtil } from '@src/util/object.util'

test('isObject', () => {
  // console.log(Buffer.from('asd') instanceof Buffer)
  expect(objectUtil.isObject(Buffer.from('asd'))).toBe(false)
})

test('by', () => {
  const a = [{ a: 'aa' }, { a: 'ab' }]
  const r = by(a, 'a')
  expect(r).toEqual({
    aa: { a: 'aa' },
    ab: { a: 'ab' },
  })
})
