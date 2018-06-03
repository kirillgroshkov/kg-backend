import { firebaseService } from '@src/srv/firebase.service'

test('getUser', async () => {
  const u = await firebaseService.getUser('kr87n2F9QLcBH3ZuYEUAPl0PK6J3')
  console.log(u)
  expect(u.uid).toBe('kr87n2F9QLcBH3ZuYEUAPl0PK6J3')
})
