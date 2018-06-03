import { promisify } from 'util'
import { InputType, ZlibOptions } from 'zlib'
import * as zlib from 'zlib'

const deflate = promisify(zlib.deflate.bind(zlib))
const inflate = promisify(zlib.inflate.bind(zlib))

class ZipUtil {
  async deflate (buf: string, options?: ZlibOptions): Promise<Buffer> {
    return deflate(buf, options)
  }

  async inflate (buf: Buffer, options?: ZlibOptions): Promise<Buffer> {
    return inflate(buf, options)
  }

  // convenience
  async inflateStr (buf: Buffer, options?: ZlibOptions): Promise<string> {
    return (await this.inflate(buf, options)).toString()
  }
}

export const zipUtil = new ZipUtil()
