import { App } from 'aws-cdk-lib'
import { BnMallorcaStack } from './bn-mallorca-stack'

export class BnMallorcaApp extends App {
  constructor() {
    super()

    const props = {
      envName: '',
      jwtSecretArn: '',
    }
    // eslint-disable-next-line no-new
    new BnMallorcaStack(this, '', props)
  }
}
