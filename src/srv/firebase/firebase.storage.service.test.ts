import { firebaseStorageService } from '@src/srv/firebase/firebase.storage.service'

test('test1', async () => {
  // const bucket = firebaseStorageService.bucket()
  // await bucket.file('sdf.txt').save('abcd')
  await firebaseStorageService.saveFile('aaa.txt', 'abcd')
  const b = await firebaseStorageService.loadFile('aaa.txt')
  console.log(b.toString('utf8'))
  await firebaseStorageService.deleteFile('aaa.txt')
})
