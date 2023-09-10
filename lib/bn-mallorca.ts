import { App } from 'aws-cdk-lib'
import { BnMallorcaStack } from './bn-mallorca-stack'

export class BnMallorcaApp extends App {
  constructor() {
    super()

    const props = {
      envName: BnMallorcaApp.getFromEnv('ENV_NAME'),
      jwtSecretArn: BnMallorcaApp.getFromEnv('JWT_SECRET_ARN'),
      spotifyClientIdArn: BnMallorcaApp.getFromEnv('SPOTIFY_CLIENT_ID_ARN'),
      spotifySecretArn: BnMallorcaApp.getFromEnv('SPOTIFY_SECRET_ID_ARN'),
    }
    // eslint-disable-next-line no-new
    new BnMallorcaStack(this, '', props)
  }

  private static getFromEnv(key: string): string {
    if (process.env[key] !== undefined) {
      return process.env[key]!!
    }

    throw Error(`Undefined env ${key}`)
  }
}
