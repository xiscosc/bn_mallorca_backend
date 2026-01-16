import { Stack, StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { createApi } from './constructs/api.construct'
import { createBuckets } from './constructs/bucket.construct'
import { createTables } from './constructs/database.construct'
import { createLambdas } from './constructs/lambda.construct'
import { createPermissions } from './constructs/permission.construct'
import { createQueues } from './constructs/queue.construct'
import { createSecrets } from './constructs/secret.construct'
import { createTopics } from './constructs/topic.construct'
import { createTriggers } from './constructs/trigger.construct'

interface BnMallorcaStackProps extends StackProps {
  envName: string
  spotifyClientIdArn: string
  spotifySecretArn: string
  apiDomainName: string
  apiDomainAPIGatewayDomainName: string
  apiDomainHostedZoneId: string
  centovaUrl: string
  centovaStreamUrl: string
  trackSource: string
  iosAppSns: string
  androidAppSns: string
}

export class BnMallorcaStack extends Stack {
  private readonly props: BnMallorcaStackProps
  constructor(scope: Construct, id: string, props: BnMallorcaStackProps) {
    super(scope, id, props)
    this.props = props

    const tables = createTables(this, this.props.envName)
    const queues = createQueues(this, this.props.envName)
    const buckets = createBuckets(this, this.props.envName)
    const topics = createTopics(this, this.props.envName)
    const secrets = createSecrets(this, this.props.envName, this.props.spotifyClientIdArn, this.props.spotifySecretArn)
    const lambdas = createLambdas(
      this,
      this.props.envName,
      this.props.iosAppSns,
      this.props.androidAppSns,
      this.props.centovaUrl,
      this.props.centovaStreamUrl,
      this.props.trackSource,
      queues,
      tables,
      buckets,
      topics,
      secrets,
    )

    createApi(
      this,
      this.props.envName,
      this.props.apiDomainName,
      this.props.apiDomainAPIGatewayDomainName,
      this.props.apiDomainHostedZoneId,
      lambdas,
    )

    createTriggers(this, this.props.envName, queues, lambdas)

    createPermissions(
      this,
      this.props.envName,
      this.props.iosAppSns,
      this.props.androidAppSns,
      topics,
      tables,
      lambdas,
      queues,
      buckets,
      secrets,
    )
  }
}
