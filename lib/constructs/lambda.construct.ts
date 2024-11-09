import { Duration } from 'aws-cdk-lib'
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { RetentionDays } from 'aws-cdk-lib/aws-logs'
import { Construct } from 'constructs'
import { BnBuckets } from './bucket.construct'
import { BnTables } from './database.construct'
import { BnQueues } from './queue.construct'
import { BnSecrets } from './secret.construct'
import { BnTopics } from './topic.construct'

const LAMBDA_DIR = `${__dirname}/../../src/lambda/`

export type BnLambdas = {
  cacheAlbumArtLambda: NodejsFunction
  processNewTrackLambda: NodejsFunction
  getTackListLambda: NodejsFunction
  getScheduleLambda: NodejsFunction
  pollNewTrackLambda: NodejsFunction
  fillQueueLambda: NodejsFunction
  registerDeviceLambda: NodejsFunction
  unregisterDeviceLambda: NodejsFunction
  deleteDevicesLambda: NodejsFunction
  findDisabledDevicesLambda: NodejsFunction
}

export function createLambdas(
  scope: Construct,
  envName: string,
  iosAppSns: string,
  androidAppSns: string,
  centovaUrl: string,
  { pollingQueue }: BnQueues,
  { trackListTable, albumArtTable, deviceTable, scheduleTable }: BnTables,
  { albumArtBucket }: BnBuckets,
  { notificationsTopic }: BnTopics,
  { spotifyClientId, spotifySecret }: BnSecrets,
): BnLambdas {
  const cacheAlbumArtLambda = new NodejsFunction(scope, `${envName}-cacheAlbumArtLambda`, {
    runtime: Runtime.NODEJS_20_X,
    architecture: Architecture.ARM_64,
    handler: 'handler',
    memorySize: 256,
    functionName: `${envName}-cacheAlbumArtLambda`,
    entry: `${LAMBDA_DIR}/manual-invocation/cache-album-art/lambda.ts`,
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

  const processNewTrackLambda = new NodejsFunction(scope, `${envName}-processNewTrackLambda`, {
    runtime: Runtime.NODEJS_20_X,
    architecture: Architecture.ARM_64,
    handler: 'handler',
    memorySize: 256,
    functionName: `${envName}-processNewTrackLambda`,
    entry: `${LAMBDA_DIR}process-new-track.lambda.ts`,
    timeout: Duration.seconds(10),
    logRetention: RetentionDays.ONE_MONTH,
    environment: {
      ALBUM_ART_BUCKET: albumArtBucket.bucketName,
      ALBUM_ART_TABLE: albumArtTable.tableName,
      TRACK_LIST_TABLE: trackListTable.tableName,
      NOTIFICATION_TOPIC: notificationsTopic.topicArn,
      CACHE_LAMBDA_ARN: cacheAlbumArtLambda.functionArn,
      SPOTIFY_CLIENT_ID: spotifyClientId.secretArn,
      SPOTIFY_SECRET_ID: spotifySecret.secretArn,
    },
    bundling: {
      minify: true,
      sourceMap: true,
    },
  })

  const getTackListLambda = new NodejsFunction(scope, `${envName}-getTackListLambda`, {
    runtime: Runtime.NODEJS_20_X,
    architecture: Architecture.ARM_64,
    handler: 'handler',
    memorySize: 1024,
    functionName: `${envName}-getTackListLambda`,
    entry: `${LAMBDA_DIR}api/v1/tracklist/get/lambda.ts`,
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

  const getScheduleLambda = new NodejsFunction(scope, `${envName}-getScheduleLambda`, {
    runtime: Runtime.NODEJS_20_X,
    architecture: Architecture.ARM_64,
    handler: 'handler',
    memorySize: 256,
    functionName: `${envName}-getScheduleLambda`,
    entry: `${LAMBDA_DIR}api/v1/schedule/get/lambda.ts`,
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

  const pollNewTrackLambda = new NodejsFunction(scope, `${envName}-pollNewTrackLambda`, {
    runtime: Runtime.NODEJS_20_X,
    architecture: Architecture.ARM_64,
    handler: 'handler',
    memorySize: 256,
    functionName: `${envName}-pollNewTrackLambda`,
    entry: `${LAMBDA_DIR}/from-queue/poll-new-track/lambda.ts`,
    timeout: Duration.seconds(10),
    logRetention: RetentionDays.ONE_MONTH,
    environment: {
      CENTOVA_URL: centovaUrl,
      ALBUM_ART_BUCKET: albumArtBucket.bucketName,
      ALBUM_ART_TABLE: albumArtTable.tableName,
      TRACK_LIST_TABLE: trackListTable.tableName,
      NOTIFICATION_TOPIC: notificationsTopic.topicArn,
      CACHE_LAMBDA_ARN: cacheAlbumArtLambda.functionArn,
      SPOTIFY_CLIENT_ID: spotifyClientId.secretArn,
      SPOTIFY_SECRET_ID: spotifySecret.secretArn,
    },
    bundling: {
      minify: true,
      sourceMap: true,
    },
  })

  const fillQueueLambda = new NodejsFunction(scope, `${envName}-fillQueueLambda`, {
    runtime: Runtime.NODEJS_20_X,
    architecture: Architecture.ARM_64,
    handler: 'handler',
    memorySize: 128,
    functionName: `${envName}-fillQueueLambda`,
    entry: `${LAMBDA_DIR}/cronjob/fill-queue/lambda.ts`,
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

  const registerDeviceLambda = new NodejsFunction(scope, `${envName}-registerDeviceLambda`, {
    runtime: Runtime.NODEJS_20_X,
    architecture: Architecture.ARM_64,
    handler: 'handler',
    memorySize: 1024,
    functionName: `${envName}-registerDeviceLambda`,
    entry: `${LAMBDA_DIR}api/v1/register/post/lambda.ts`,
    timeout: Duration.seconds(10),
    logRetention: RetentionDays.ONE_MONTH,
    environment: {
      NOTIFICATION_TOPIC: notificationsTopic.topicArn,
      IOS_APP_SNS: iosAppSns,
      ANDROID_APP_SNS: androidAppSns,
      DEVICE_TABLE: deviceTable.tableName,
    },
    bundling: {
      minify: true,
      sourceMap: true,
    },
  })

  const unregisterDeviceLambda = new NodejsFunction(scope, `${envName}-unregisterDeviceLambda`, {
    runtime: Runtime.NODEJS_20_X,
    architecture: Architecture.ARM_64,
    handler: 'handler',
    memorySize: 128,
    functionName: `${envName}-unregisterDeviceLambda`,
    entry: `${LAMBDA_DIR}api/v1/unregister/post/lambda.ts`,
    timeout: Duration.seconds(10),
    logRetention: RetentionDays.ONE_MONTH,
    environment: {
      NOTIFICATION_TOPIC: notificationsTopic.topicArn,
      IOS_APP_SNS: iosAppSns,
      ANDROID_APP_SNS: androidAppSns,
      DEVICE_TABLE: deviceTable.tableName,
    },
    bundling: {
      minify: true,
      sourceMap: true,
    },
  })

  const deleteDevicesLambda = new NodejsFunction(scope, `${envName}-deleteDevicesLambda`, {
    runtime: Runtime.NODEJS_20_X,
    architecture: Architecture.ARM_64,
    handler: 'handler',
    memorySize: 256,
    functionName: `${envName}-deleteDevicesLambda`,
    entry: `${LAMBDA_DIR}/cronjob/delete-devices/lambda.ts`,
    timeout: Duration.seconds(10),
    logRetention: RetentionDays.ONE_MONTH,
    environment: {
      NOTIFICATION_TOPIC: notificationsTopic.topicArn,
      IOS_APP_SNS: iosAppSns,
      ANDROID_APP_SNS: androidAppSns,
      DEVICE_TABLE: deviceTable.tableName,
    },
    bundling: {
      minify: true,
      sourceMap: true,
    },
  })

  const findDisabledDevicesLambda = new NodejsFunction(scope, `${envName}-findDisabledDevicesLambda`, {
    runtime: Runtime.NODEJS_20_X,
    architecture: Architecture.ARM_64,
    handler: 'handler',
    memorySize: 256,
    functionName: `${envName}-findDisabledDevicesLambda`,
    entry: `${LAMBDA_DIR}/cronjob/find-disabled-devices/lambda.ts`,
    timeout: Duration.seconds(10),
    logRetention: RetentionDays.ONE_MONTH,
    environment: {
      NOTIFICATION_TOPIC: notificationsTopic.topicArn,
      IOS_APP_SNS: iosAppSns,
      ANDROID_APP_SNS: androidAppSns,
      DEVICE_TABLE: deviceTable.tableName,
    },
    bundling: {
      minify: true,
      sourceMap: true,
    },
  })

  return {
    cacheAlbumArtLambda,
    processNewTrackLambda,
    getTackListLambda,
    getScheduleLambda,
    pollNewTrackLambda,
    fillQueueLambda,
    registerDeviceLambda,
    unregisterDeviceLambda,
    deleteDevicesLambda,
    findDisabledDevicesLambda,
  }
}
