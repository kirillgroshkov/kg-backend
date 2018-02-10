/*
ts-node src/decorators/memo.decorator.test.ts
 */

import { memo } from './memo.decorator'

class A {
  @memo({
    ttl: 600,
    maxSize: 2,
  })
  a (a1: number, a2: number) {
    console.log('inside a')
    return a1 + a2
  }

  @memo()
  b (a1: number, a2: number) {
    console.log('inside b')
    return a1 * a2
  }
}

test()

async function test () {
  // test('a', () => {
  const a = new A()
  console.log(a.a(1, 2))
  // await new Promise(r => setTimeout(r, 500))
  console.log(a.a(1, 2))
  console.log(a.a(1, 3))
  console.log(a.a(1, 3))
  console.log(a.a(1, 2))
  console.log(a.a(1, 3))
  /*
  console.log(a.a(1, 4))
  console.log(a.a(1, 2))
  console.log(a.a(2, 3))
  console.log(a.a(2, 3))
  console.log(a.b(2, 3))
  console.log(a.b(2, 3))*/
  // })
}
