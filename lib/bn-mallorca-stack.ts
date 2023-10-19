import { Duration, Stack, StackProps } from 'aws-cdk-lib'
import {
  AuthorizationType,
  BasePathMapping,
  DomainName,
  EndpointType,
  LambdaIntegration,
  RestApi,
  TokenAuthorizer,
} from 'aws-cdk-lib/aws-apigateway'
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb'
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { RetentionDays } from 'aws-cdk-lib/aws-logs'
import { Bucket } from 'aws-cdk-lib/aws-s3'
import { Secret } from 'aws-cdk-lib/aws-secretsmanager'
import { Topic } from 'aws-cdk-lib/aws-sns'
import { Construct } from 'constructs'

interface BnMallorcaStackProps extends StackProps {
  envName: string
  jwtSecretArn: string
  spotifyClientIdArn: string
  spotifySecretArn: string
  apiDomainName: string
  apiDomainAPIGatewayDomainName: string
  apiDomainHostedZoneId: string
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

    /**
     *  S3 Buckets
     */
    const albumArtBucket = new Bucket(this, `${this.props.envName}-albumArtBucket`, {
      bucketName: `${this.props.envName}-bnmca-albums`,
    })

    /**
     *  SNS Topics
     */
    const notificationsTopic = new Topic(this, `${this.props.envName}-notificationTopic`)

    /**
     *  Lambda functions
     */
    const authorizerLambda = new NodejsFunction(this, `${this.props.envName}-authorizerLambda`, {
      runtime: Runtime.NODEJS_18_X,
      architecture: Architecture.ARM_64,
      handler: 'handler',
      memorySize: 128,
      functionName: `${this.props.envName}-authorizerLambda`,
      entry: `${LAMBDA_DIR}api-authorizer.lambda.ts`,
      timeout: Duration.seconds(10),
      logRetention: RetentionDays.ONE_MONTH,
      environment: {
        JWT_SECRET_ARN: this.props.jwtSecretArn,
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
    })

    const cacheAlbumArtLambda = new NodejsFunction(this, `${this.props.envName}-cacheAlbumArtLambda`, {
      runtime: Runtime.NODEJS_18_X,
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
      runtime: Runtime.NODEJS_18_X,
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
      runtime: Runtime.NODEJS_18_X,
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

    const postNewTrackLambda = new NodejsFunction(this, `${this.props.envName}-postNewTrackLambda`, {
      runtime: Runtime.NODEJS_18_X,
      architecture: Architecture.ARM_64,
      handler: 'handler',
      memorySize: 128,
      functionName: `${this.props.envName}-postNewTrackLambda`,
      entry: `${LAMBDA_DIR}post-new-track.lambda.ts`,
      timeout: Duration.seconds(10),
      logRetention: RetentionDays.ONE_MONTH,
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
      endpointConfiguration: {
        types: [EndpointType.REGIONAL],
      },
    })

    const domain = DomainName.fromDomainNameAttributes(this, `${this.props.envName}-apiDomain`, {
      domainName: this.props.apiDomainName,
      domainNameAliasHostedZoneId: this.props.apiDomainHostedZoneId,
      domainNameAliasTarget: this.props.apiDomainAPIGatewayDomainName,
    })

    const authorizer = new TokenAuthorizer(this, `${this.props.envName}-apiAuthorizer`, {
      handler: authorizerLambda,
      identitySource: 'method.request.header.Authorization',
    })

    const getTrackListIntegration = new LambdaIntegration(getTackListLambda)
    const postTrackIntegration = new LambdaIntegration(postNewTrackLambda)
    const trackListResource = api.root.addResource('api').addResource('v1').addResource('tracklist')
    trackListResource.addMethod('GET', getTrackListIntegration)
    trackListResource.addMethod('POST', postTrackIntegration, {
      authorizationType: AuthorizationType.CUSTOM,
      authorizer,
    })

    // eslint-disable-next-line no-new
    new BasePathMapping(this, `${this.props.envName}-apiPathMapping`, {
      domainName: domain,
      restApi: api,
      stage: api.deploymentStage,
    })

    /**
     * Secrets Manager
     */
    const jwtSecret = Secret.fromSecretCompleteArn(this, `${this.props.envName}-jwt-secret`, this.props.jwtSecretArn)
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
     *  Permissions
     */
    processNewTrackLambda.grantInvoke(postNewTrackLambda)

    cacheAlbumArtLambda.grantInvoke(processNewTrackLambda)

    trackListTable.grantWriteData(processNewTrackLambda)
    trackListTable.grantReadData(getTackListLambda)

    albumArtTable.grantWriteData(cacheAlbumArtLambda)
    albumArtTable.grantReadData(processNewTrackLambda)
    albumArtTable.grantReadData(getTackListLambda)

    albumArtBucket.grantWrite(cacheAlbumArtLambda)
    albumArtBucket.grantRead(processNewTrackLambda)
    albumArtBucket.grantRead(getTackListLambda)

    notificationsTopic.grantPublish(processNewTrackLambda)

    jwtSecret.grantRead(authorizerLambda)
    spotifySecret.grantRead(processNewTrackLambda)
    spotifyClientId.grantRead(processNewTrackLambda)
  }
}
