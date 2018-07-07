import { zipUtil } from '@src/util/zip.util'

test('zip/unzip', async () => {
  const s = 'abcd1234$%^'

  // String
  let zippedBuf = await zipUtil.zipString(s)
  const unzippedStr = await zipUtil.unzipToString(zippedBuf)
  expect(unzippedStr).toBe(s)

  const sBuf = Buffer.from(s)
  zippedBuf = await zipUtil.zip(sBuf)
  const unzippedBuf = await zipUtil.unzip(zippedBuf)
  expect(unzippedBuf).toEqual(sBuf)
})
