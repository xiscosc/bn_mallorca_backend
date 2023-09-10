import { verify } from 'jsonwebtoken'
import * as log from 'lambda-log'
import { env } from '../config/env'
import { getSecretValue } from '../net/secrets-manager'

export class AuthService {
  private jwtKey: string | undefined

  public async isValidJwt(token: string): Promise<boolean> {
    const secret = await this.getJwtKey()
    try {
      verify(token, secret, { complete: true, ignoreExpiration: false })
      return true
    } catch (err: any) {
      log.error(`Error verifying the jwt token: ${err.toString()}`)
      return false
    }
  }

  private async getJwtKey(): Promise<string> {
    if (!this.jwtKey) {
      this.jwtKey = await getSecretValue(env.jwtSecretArn)
    }

    if (!this.jwtKey) {
      throw Error('Could not load JWT secret')
    }

    return this.jwtKey
  }
}
