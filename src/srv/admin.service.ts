import * as fs from 'fs-extra'
import { Context } from 'koa'
import { staticDir } from '../cnst/paths.cnst'
import { firebaseService } from './firebase.service'
import { log } from './log.service'

const ADMIN_LIST: string[] = ['ceo@inventix.ru']

class AdminService {
  async serve401 (ctx: Context): Promise<void> {
    console.log('!!!!!!!!!!!!!!!!! SERVE')
    ctx.body = await fs.readFile(staticDir + '/needsLogin.html', 'utf-8')
    ctx.response.status = 401
  }

  private isEmailAdmin (email: string): boolean {
    return ADMIN_LIST.includes(email)
  }

  private async getEmailByToken (idToken?: string): Promise<string | undefined> {
    if (!idToken) return undefined

    try {
      const t = await firebaseService.verifyIdToken(idToken)
      const email = t && t.email
      log('admin: ' + email)
      return email
    } catch (err) {
      log('firebaseService.getEmailByToken error', (err || {}).message)
      return undefined
    }
  }

  private async isTokenAdmin (idToken: string): Promise<boolean> {
    const email = await this.getEmailByToken(idToken)
    if (!email) return false

    return this.isEmailAdmin(email)
  }

  getToken (ctx: Context): string | undefined {
    return ctx.cookies.get('kg_admin_token')
  }

  async isAdmin (ctx: Context): Promise<boolean> {
    const adminToken = this.getToken(ctx)
    if (!adminToken) return false

    return this.isTokenAdmin(adminToken)
  }

  async isAuthenticated (ctx: Context): Promise<boolean> {
    return !!(await this.getEmailByToken(this.getToken(ctx)))
  }

  async reqAdmin (ctx: Context): Promise<void> {
    const email = await this.getEmailByToken(this.getToken(ctx))
    if (!email) {
      return this.serve401(ctx)
    }

    const admin = await this.isEmailAdmin(email)
    if (!admin) {
      return ctx.throw('Forbidden', 403)
    }
  }

  async getAdminInfo (ctx: Context): Promise<any> {
    const email = await this.getEmailByToken(this.getToken(ctx))
    if (!email) return

    const admin = await this.isEmailAdmin(email)
    if (!admin) return

    return {
      email,
    }
  }
}

export const adminService = new AdminService()
