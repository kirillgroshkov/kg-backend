import { firestoreService } from '@src/srv/firestore.service'

test('saveBatch', async () => {
  const items = []
  for (let i = 0; i < 1200; i++) items.push({ id: 'b' + i })

  // await firestoreService.saveBatch('test', items)
})
