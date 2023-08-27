import type { StackProps } from 'aws-cdk-lib'
import { Duration, Stack } from 'aws-cdk-lib'
import { Queue } from 'aws-cdk-lib/aws-sqs'
import type { Construct } from 'constructs'

export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)
    // eslint-disable-next-line no-new
    new Queue(this, 'CdkQueue', {
      visibilityTimeout: Duration.seconds(300),
    })
  }
}
