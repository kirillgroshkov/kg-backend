import { CacheDB2Adapter } from '@src/srv/cachedb2/cachedb2'
import * as fs from 'fs-extra'
import * as path from 'path'

export interface FileCachedb2AdapterCfg {
  ext: string
  cacheDirPath: string
}

const DEF_CFG: FileCachedb2AdapterCfg = {
  ext: '.txt',
  cacheDirPath: __dirname,
}

export class FileCacheDB2Adapter implements CacheDB2Adapter {
  constructor (cfg: Partial<FileCachedb2AdapterCfg> = {}) {
    this.cfg = { ...DEF_CFG, ...cfg }
    // fs.ensureDir(this.cfg.cacheDirPath) // async
  }

  private cfg: FileCachedb2AdapterCfg

  name = 'File'

  // Ensures that table (folder) exists
  private async getTable (table: string): Promise<string> {
    const tablePath = path.join(this.cfg.cacheDirPath, table)
    await fs.ensureDir(tablePath)
    return tablePath
  }

  private async getFilePath (table: string, key: string): Promise<string> {
    return path.join(await this.getTable(table), `${key}${this.cfg.ext}`)
  }

  async set (key: string, value: Buffer, table: string): Promise<void> {
    const filePath = await this.getFilePath(table, key)
    await fs.writeFile(filePath, value)
  }

  async get (key: string, table: string): Promise<Buffer | undefined> {
    const file = await this.getFilePath(table, key)
    if (!(await fs.pathExists(file))) return undefined
    return fs.readFile(file)
  }

  async delete (key: string, table: string): Promise<void> {
    const file = await this.getFilePath(table, key)
    if (!(await fs.pathExists(file))) return
    await fs.unlink(file)
  }

  async keys (table: string): Promise<string[]> {
    const tablePath = path.join(this.cfg.cacheDirPath, table)
    if (!(await fs.pathExists(tablePath))) return []
    const files = await fs.readdir(tablePath)
    const extLen = this.cfg.ext.length
    return files.map(f => f.substr(0, f.length - extLen))
  }

  async tables (): Promise<string[]> {
    return fs.readdir(this.cfg.cacheDirPath)
  }

  async clear (table: string): Promise<void> {
    const tablePath = await this.getTable(table)
    const files = await fs.readdir(tablePath)
    await Promise.all(files.map(f => fs.unlink(`${tablePath}/${f}`)))
  }
}
