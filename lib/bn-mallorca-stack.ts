import { Duration, Stack, StackProps } from 'aws-cdk-lib'
import { BasePathMapping, DomainName, EndpointType, LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway'
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb'
import { Rule, Schedule } from 'aws-cdk-lib/aws-events'
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets'
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam'
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda'
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { RetentionDays } from 'aws-cdk-lib/aws-logs'
import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3'
import { Secret } from 'aws-cdk-lib/aws-secretsmanager'
import { Topic } from 'aws-cdk-lib/aws-sns'
import { Queue } from 'aws-cdk-lib/aws-sqs'
import { Construct } from 'constructs'

interface BnMallorcaStackProps extends StackProps {
  envName: string
  spotifyClientIdArn: string
  spotifySecretArn: string
  apiDomainName: string
  apiDomainAPIGatewayDomainName: string
  apiDomainHostedZoneId: string
  centovaUrl: string
  iosAppSns: string
  androidAppSns: string
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
      timeToLiveAttribute: 'deleteTs',
    })

    const albumArtTable = new Table(this, `${this.props.envName}-albumArtTable`, {
      tableName: `${this.props.envName}-albumArt`,
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'id', type: AttributeType.STRING },
    })

    const deviceTable = new Table(this, `${this.props.envName}-deviceTable`, {
      tableName: `${this.props.envName}-deviceTable`,
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'token', type: AttributeType.STRING },
    })

    deviceTable.addGlobalSecondaryIndex({
      indexName: 'statusIndex',
      partitionKey: { name: 'status', type: AttributeType.NUMBER },
      sortKey: { name: 'token', type: AttributeType.STRING },
    })

    deviceTable.addGlobalSecondaryIndex({
      indexName: 'statusSubscribedAtIndex',
      partitionKey: { name: 'status', type: AttributeType.NUMBER },
      sortKey: { name: 'subscribedAt', type: AttributeType.NUMBER },
    })

    const scheduleTable = new Table(this, `${this.props.envName}-scheduleTable`, {
      tableName: `${this.props.envName}-scheduleTable`,
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'id', type: AttributeType.STRING },
    })

    /**
     * Queue
     */
    const pollingQueue = new Queue(this, `${this.props.envName}-polling-queue`, {})

    /**
     *  S3 Buckets
     */
    const albumArtBucket = new Bucket(this, `${this.props.envName}-albumArtBucket`, {
      bucketName: `${this.props.envName}-bnmca-albums`,
      publicReadAccess: true,
      websiteIndexDocument: 'index.html',
      blockPublicAccess: new BlockPublicAccess({
        blockPublicPolicy: false,
        blockPublicAcls: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),
    })

    /**
     *  SNS Topics
     */
    const notificationsTopic = new Topic(this, `${this.props.envName}-notificationTopic`)

    /**
     *  Lambda functions
     */

    const cacheAlbumArtLambda = new NodejsFunction(this, `${this.props.envName}-cacheAlbumArtLambda`, {
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.ARM_64,
      handler: 'handler',
      memorySize: 256,
      functionName: `${this.props.envName}-cacheAlbumArtLambda`,
      entry: `${LAMBDA_DIR}cache-album-art.lambda.ts`,
      timeout: Duration.seconds(10),
      logRetention: RetentionDays.ONE_MONTH,
      environment: {
        ALBUM_ART_BUCKET: albumArtBucket.bucketName,
        ALBUM_ART_TABLE: albumArtTable.tableName,
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
    })

    const processNewTrackLambda = new NodejsFunction(this, `${this.props.envName}-processNewTrackLambda`, {
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.ARM_64,
      handler: 'handler',
      memorySize: 256,
      functionName: `${this.props.envName}-processNewTrackLambda`,
      entry: `${LAMBDA_DIR}process-new-track.lambda.ts`,
      timeout: Duration.seconds(10),
      logRetention: RetentionDays.ONE_MONTH,
      environment: {
        ALBUM_ART_BUCKET: albumArtBucket.bucketName,
        ALBUM_ART_TABLE: albumArtTable.tableName,
        TRACK_LIST_TABLE: trackListTable.tableName,
        NOTIFICATION_TOPIC: notificationsTopic.topicArn,
        CACHE_LAMBDA_ARN: cacheAlbumArtLambda.functionArn,
        SPOTIFY_CLIENT_ID: this.props.spotifyClientIdArn,
        SPOTIFY_SECRET_ID: this.props.spotifySecretArn,
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
    })

    const getTackListLambda = new NodejsFunction(this, `${this.props.envName}-getTackListLambda`, {
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.ARM_64,
      handler: 'handler',
      memorySize: 256,
      functionName: `${this.props.envName}-getTackListLambda`,
      entry: `${LAMBDA_DIR}get-track-list.lambda.ts`,
      timeout: Duration.seconds(10),
      logRetention: RetentionDays.ONE_MONTH,
      environment: {
        ALBUM_ART_BUCKET: albumArtBucket.bucketName,
        TRACK_LIST_TABLE: trackListTable.tableName,
        ALBUM_ART_TABLE: albumArtTable.tableName,
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
    })

    const getScheduleLambda = new NodejsFunction(this, `${this.props.envName}-getScheduleLambda`, {
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.ARM_64,
      handler: 'handler',
      memorySize: 256,
      functionName: `${this.props.envName}-getScheduleLambda`,
      entry: `${LAMBDA_DIR}get-schedule.lambda.ts`,
      timeout: Duration.seconds(10),
      logRetention: RetentionDays.ONE_MONTH,
      environment: {
        SCHEDULE_TABLE: scheduleTable.tableName,
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
    })

    const pollNewTrackLambda = new NodejsFunction(this, `${this.props.envName}-pollNewTrackLambda`, {
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.ARM_64,
      handler: 'handler',
      memorySize: 256,
      functionName: `${this.props.envName}-pollNewTrackLambda`,
      entry: `${LAMBDA_DIR}poll-new-track.lambda.ts`,
      timeout: Duration.seconds(10),
      logRetention: RetentionDays.ONE_MONTH,
      environment: {
        CENTOVA_URL: this.props.centovaUrl,
        ALBUM_ART_BUCKET: albumArtBucket.bucketName,
        ALBUM_ART_TABLE: albumArtTable.tableName,
        TRACK_LIST_TABLE: trackListTable.tableName,
        NOTIFICATION_TOPIC: notificationsTopic.topicArn,
        CACHE_LAMBDA_ARN: cacheAlbumArtLambda.functionArn,
        SPOTIFY_CLIENT_ID: this.props.spotifyClientIdArn,
        SPOTIFY_SECRET_ID: this.props.spotifySecretArn,
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
    })

    const fillQueueLambda = new NodejsFunction(this, `${this.props.envName}-fillQueueLambda`, {
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.ARM_64,
      handler: 'handler',
      memorySize: 128,
      functionName: `${this.props.envName}-fillQueueLambda`,
      entry: `${LAMBDA_DIR}fill-queue.lambda.ts`,
      timeout: Duration.seconds(10),
      logRetention: RetentionDays.ONE_MONTH,
      environment: {
        POLL_QUEUE_URL: pollingQueue.queueUrl,
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
    })

    const registerDeviceLambda = new NodejsFunction(this, `${this.props.envName}-registerDeviceLambda`, {
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.ARM_64,
      handler: 'handler',
      memorySize: 128,
      functionName: `${this.props.envName}-registerDeviceLambda`,
      entry: `${LAMBDA_DIR}register-device.lambda.ts`,
      timeout: Duration.seconds(10),
      logRetention: RetentionDays.ONE_MONTH,
      environment: {
        NOTIFICATION_TOPIC: notificationsTopic.topicArn,
        IOS_APP_SNS: this.props.iosAppSns,
        ANDROID_APP_SNS: this.props.androidAppSns,
        DEVICE_TABLE: deviceTable.tableName,
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
    })

    const unregisterDeviceLambda = new NodejsFunction(this, `${this.props.envName}-unregisterDeviceLambda`, {
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.ARM_64,
      handler: 'handler',
      memorySize: 128,
      functionName: `${this.props.envName}-unregisterDeviceLambda`,
      entry: `${LAMBDA_DIR}unregister-device.lambda.ts`,
      timeout: Duration.seconds(10),
      logRetention: RetentionDays.ONE_MONTH,
      environment: {
        NOTIFICATION_TOPIC: notificationsTopic.topicArn,
        IOS_APP_SNS: this.props.iosAppSns,
        ANDROID_APP_SNS: this.props.androidAppSns,
        DEVICE_TABLE: deviceTable.tableName,
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
    })

    const deleteDevicesLambda = new NodejsFunction(this, `${this.props.envName}-deleteDevicesLambda`, {
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.ARM_64,
      handler: 'handler',
      memorySize: 256,
      functionName: `${this.props.envName}-deleteDevicesLambda`,
      entry: `${LAMBDA_DIR}delete-devices.lambda.ts`,
      timeout: Duration.seconds(10),
      logRetention: RetentionDays.ONE_MONTH,
      environment: {
        NOTIFICATION_TOPIC: notificationsTopic.topicArn,
        IOS_APP_SNS: this.props.iosAppSns,
        ANDROID_APP_SNS: this.props.androidAppSns,
        DEVICE_TABLE: deviceTable.tableName,
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
    })

    const findDisabledDevicesLambda = new NodejsFunction(this, `${this.props.envName}-findDisabledDevicesLambda`, {
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.ARM_64,
      handler: 'handler',
      memorySize: 256,
      functionName: `${this.props.envName}-findDisabledDevicesLambda`,
      entry: `${LAMBDA_DIR}find-disabled-devices.lambda.ts`,
      timeout: Duration.seconds(10),
      logRetention: RetentionDays.ONE_MONTH,
      environment: {
        NOTIFICATION_TOPIC: notificationsTopic.topicArn,
        IOS_APP_SNS: this.props.iosAppSns,
        ANDROID_APP_SNS: this.props.androidAppSns,
        DEVICE_TABLE: deviceTable.tableName,
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
      restApiName: `TrackList API - ${this.props.envName}`,
      endpointConfiguration: {
        types: [EndpointType.REGIONAL],
      },
    })

    const domain = DomainName.fromDomainNameAttributes(this, `${this.props.envName}-apiDomain`, {
      domainName: this.props.apiDomainName,
      domainNameAliasHostedZoneId: this.props.apiDomainHostedZoneId,
      domainNameAliasTarget: this.props.apiDomainAPIGatewayDomainName,
    })

    const getTrackListIntegration = new LambdaIntegration(getTackListLambda)
    const registerDeviceIntegration = new LambdaIntegration(registerDeviceLambda)
    const unregisterDeviceIntegration = new LambdaIntegration(unregisterDeviceLambda)
    const getScheduleIntegration = new LambdaIntegration(getScheduleLambda)
    const apiV1 = api.root.addResource('api').addResource('v1')
    const trackListResource = apiV1.addResource('tracklist')
    const scheduleResource = apiV1.addResource('schedule')
    const registerResource = apiV1.addResource('register')
    const unregisterResource = apiV1.addResource('unregister')
    trackListResource.addMethod('GET', getTrackListIntegration)

    scheduleResource.addMethod('GET', getScheduleIntegration)
    registerResource.addMethod('POST', registerDeviceIntegration)
    unregisterResource.addMethod('POST', unregisterDeviceIntegration)

    // eslint-disable-next-line no-new
    new BasePathMapping(this, `${this.props.envName}-apiPathMapping`, {
      domainName: domain,
      restApi: api,
      stage: api.deploymentStage,
    })

    /**
     * Secrets Manager
     */
    const spotifyClientId = Secret.fromSecretCompleteArn(
      this,
      `${this.props.envName}-spotify-client-id`,
      this.props.spotifyClientIdArn,
    )
    const spotifySecret = Secret.fromSecretCompleteArn(
      this,
      `${this.props.envName}-spotify-secret`,
      this.props.spotifySecretArn,
    )

    /**
     * Schedule the polling job and the cleaning job (Only in prod)
     */

    if (this.props.envName === 'prod') {
      const pollingEventRule = new Rule(this, `${this.props.envName}-pollingEventRule`, {
        schedule: Schedule.cron({ minute: '*' }),
      })
      pollingEventRule.addTarget(new LambdaFunction(fillQueueLambda))

      // const cleaningEventRule = new Rule(this, `${this.props.envName}-cleaningEventRule`, {
      //   schedule: Schedule.cron({ hour: '*' }),
      // })
      // cleaningEventRule.addTarget(new LambdaFunction(deleteDevicesLambda))

      const findDisabledDevicesRule = new Rule(this, `${this.props.envName}-findDisabledDevicesRule`, {
        schedule: Schedule.cron({ minute: '0', hour: '3' }),
      })
      findDisabledDevicesRule.addTarget(new LambdaFunction(findDisabledDevicesLambda))
    }

    const queueEventSource = new SqsEventSource(pollingQueue, { batchSize: 1 })
    pollNewTrackLambda.addEventSource(queueEventSource)

    /**
     *  Permissions
     */

    cacheAlbumArtLambda.grantInvoke(processNewTrackLambda)
    cacheAlbumArtLambda.grantInvoke(pollNewTrackLambda)

    trackListTable.grantWriteData(processNewTrackLambda)
    trackListTable.grantReadData(getTackListLambda)
    trackListTable.grantReadWriteData(pollNewTrackLambda)

    scheduleTable.grantReadData(getScheduleLambda)

    albumArtTable.grantWriteData(cacheAlbumArtLambda)
    albumArtTable.grantReadData(processNewTrackLambda)
    albumArtTable.grantReadData(pollNewTrackLambda)
    albumArtTable.grantReadData(getTackListLambda)

    albumArtBucket.grantWrite(cacheAlbumArtLambda)

    notificationsTopic.grantPublish(processNewTrackLambda)
    notificationsTopic.grantPublish(pollNewTrackLambda)

    spotifySecret.grantRead(processNewTrackLambda)
    spotifySecret.grantRead(pollNewTrackLambda)
    spotifyClientId.grantRead(processNewTrackLambda)
    spotifyClientId.grantRead(pollNewTrackLambda)

    pollingQueue.grantSendMessages(fillQueueLambda)

    deviceTable.grantReadWriteData(registerDeviceLambda)
    deviceTable.grantReadWriteData(unregisterDeviceLambda)
    deviceTable.grantReadWriteData(deleteDevicesLambda)
    deviceTable.grantReadWriteData(findDisabledDevicesLambda)

    const snsRegisterPolicy = new PolicyStatement({
      actions: ['sns:CreatePlatformEndpoint'],
      resources: [this.props.iosAppSns, this.props.androidAppSns],
    })

    const listAppsPolicy = new PolicyStatement({
      actions: ['sns:ListEndpointsByPlatformApplication'],
      resources: [this.props.iosAppSns, this.props.androidAppSns],
    })

    const listSubscriptionsPolicy = new PolicyStatement({
      actions: ['sns:ListSubscriptionsByTopic'],
      resources: [notificationsTopic.topicArn],
    })

    const snsSubscribePolicy = new PolicyStatement({
      actions: ['sns:Subscribe'],
      resources: [notificationsTopic.topicArn],
    })

    registerDeviceLambda.role?.attachInlinePolicy(
      new Policy(this, `${this.props.envName}-registerDevicePolicy`, {
        statements: [snsRegisterPolicy, snsSubscribePolicy],
      }),
    )

    const deleteDevicesPolicy = new PolicyStatement({
      actions: ['sns:DeleteEndpoint', 'sns:Unsubscribe'],
      resources: ['*'],
    })

    deleteDevicesLambda.role?.attachInlinePolicy(
      new Policy(this, `${this.props.envName}-deleteDevicesPolicy`, {
        statements: [deleteDevicesPolicy],
      }),
    )

    findDisabledDevicesLambda.role?.attachInlinePolicy(
      new Policy(this, `${this.props.envName}-findDisabledDevicesPolicy`, {
        statements: [listSubscriptionsPolicy, listAppsPolicy],
      }),
    )
  }
}
