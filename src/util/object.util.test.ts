import { by } from '@src/util/object.util'

test('by', () => {
  const a = [{ a: 'aa' }, { a: 'ab' }]
  const r = by(a, 'a')
  expect(r).toEqual({
    aa: { a: 'aa' },
    ab: { a: 'ab' },
  })
})
