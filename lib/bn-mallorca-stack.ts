import { Duration, Stack, StackProps } from 'aws-cdk-lib'
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway'
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb'
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Bucket } from 'aws-cdk-lib/aws-s3'
import { Topic } from 'aws-cdk-lib/aws-sns'
import { Construct } from 'constructs'

interface BnMallorcaStackProps extends StackProps {
  envName: string
  jwtSecretArn: string
}

const LAMBDA_DIR = `${__dirname}/../src/lambda/`

export class BnMallorcaStack extends Stack {
  private readonly props: BnMallorcaStackProps
  constructor(scope: Construct, id: string, props: BnMallorcaStackProps) {
    super(scope, id, props)
    this.props = props

    /**
     *  DynamoDB Tables
     */
    const trackListTable = new Table(this, `${this.props.envName}-trackListTable`, {
      tableName: `${this.props.envName}-trackList`,
      billingMode: BillingMode.PAY_PER_REQUEST,
      sortKey: { name: 'timestamp', type: AttributeType.NUMBER },
      partitionKey: { name: 'radio', type: AttributeType.STRING },
    })

    const artWorkTable = new Table(this, `${this.props.envName}-artWorkTable`, {
      tableName: `${this.props.envName}-artWork`,
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'id', type: AttributeType.STRING },
    })

    /**
     *  S3 Buckets
     */
    const artWorkBucket = new Bucket(this, `${this.props.envName}-artWorkBucket`, {
      bucketName: `bn-mallorca-app-${this.props.envName}-artWork`,
    })

    /**
     *  SNS Topics
     */
    const notificationsTopic = new Topic(this, `${this.props.envName}-notificationTopic`)

    /**
     *  Lambda functions
     */
    const processNewTrackLambda = new NodejsFunction(this, `${this.props.envName}-processNewTrackLambda`, {
      runtime: Runtime.NODEJS_18_X,
      architecture: Architecture.ARM_64,
      handler: 'handler',
      memorySize: 256,
      functionName: `${this.props.envName}-processNewTrackLambda`,
      entry: `${LAMBDA_DIR}process-new-track.lambda.ts`,
      timeout: Duration.seconds(10),
      environment: {
        ARTWORK_BUCKET: artWorkBucket.bucketName,
        ARTWORK_TABLE: artWorkTable.tableName,
        TRACK_LIST_TABLE: trackListTable.tableName,
        NOTIFICATION_TOPIC: notificationsTopic.topicArn,
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
    })

    const getTackListLambda = new NodejsFunction(this, `${this.props.envName}-getTackListLambda`, {
      runtime: Runtime.NODEJS_18_X,
      architecture: Architecture.ARM_64,
      handler: 'handler',
      memorySize: 256,
      functionName: `${this.props.envName}-getTackListLambda`,
      entry: `${LAMBDA_DIR}get-track-list.lambda.ts`,
      timeout: Duration.seconds(10),
      environment: {
        ARTWORK_BUCKET: artWorkBucket.bucketName,
        TRACK_LIST_TABLE: trackListTable.tableName,
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
    })

    const receiveNewTrackLambda = new NodejsFunction(this, `${this.props.envName}-receiveNewTrackLambda`, {
      runtime: Runtime.NODEJS_18_X,
      architecture: Architecture.ARM_64,
      handler: 'handler',
      memorySize: 256,
      functionName: `${this.props.envName}-receiveNewTrackLambda`,
      entry: `${LAMBDA_DIR}receive-new-track.lambda.ts`,
      timeout: Duration.seconds(10),
      environment: {
        PROCESS_LAMBDA_ARN: processNewTrackLambda.functionArn,
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
    })

    /**
     * API Rest
     */
    const api = new RestApi(this, `${this.props.envName}-trackListApi`, {
      restApiName: 'TrackList API',
    })

    const getTrackListIntegration = new LambdaIntegration(getTackListLambda)
    const postTrackIntegration = new LambdaIntegration(receiveNewTrackLambda)
    const trackListResource = api.root.addResource('api').addResource('v1').addResource('tracklist')
    trackListResource.addMethod('GET', getTrackListIntegration)
    trackListResource.addMethod('POST', postTrackIntegration)

    /**
     *  Permissions
     */
    receiveNewTrackLambda.grantInvoke(receiveNewTrackLambda)
    trackListTable.grantWriteData(processNewTrackLambda)
    artWorkTable.grantReadWriteData(processNewTrackLambda)
    artWorkBucket.grantReadWrite(processNewTrackLambda)
    notificationsTopic.grantPublish(processNewTrackLambda)
    artWorkBucket.grantRead(getTackListLambda)
    trackListTable.grantReadData(getTackListLambda)
  }
}
