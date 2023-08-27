import { Stack, StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'

interface BnMallorcaStackProps extends StackProps {}

export class BnMallorcaStack extends Stack {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(scope: Construct, id: string, props: BnMallorcaStackProps) {
    super(scope, id, props)
  }
}
