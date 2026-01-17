import { Duration } from 'aws-cdk-lib';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import type { Construct } from 'constructs';
import type { BnBuckets } from './bucket.construct';
import type { BnTables } from './database.construct';
import type { BnQueues } from './queue.construct';
import type { BnSecrets } from './secret.construct';
import type { BnTopics } from './topic.construct';

const FUNCTION_DIR = `${__dirname}/../../src/function`;
const DEFAULT_RUNTIME = Runtime.NODEJS_24_X;

export type BnLambdas = {
  cacheAlbumArtLambda: NodejsFunction;
  processNewTrackLambda: NodejsFunction;
  getTrackListLambda: NodejsFunction;
  getScheduleLambda: NodejsFunction;
  pollNewTrackLambda: NodejsFunction;
  fillQueueLambda: NodejsFunction;
  registerDeviceLambda: NodejsFunction;
  unregisterDeviceLambda: NodejsFunction;
  deleteDevicesLambda: NodejsFunction;
  findDisabledDevicesLambda: NodejsFunction;
  triggerRegisterDeviceLambda: NodejsFunction;
};

export function createLambdas(
  scope: Construct,
  envName: string,
  iosAppSns: string,
  androidAppSns: string,
  centovaUrl: string,
  centovaStreamUrl: string,
  trackSource: string,
  { pollingQueue }: BnQueues,
  { trackListTable, albumArtTable, deviceTable, scheduleTable }: BnTables,
  { albumArtBucket }: BnBuckets,
  { notificationsTopic }: BnTopics,
  { spotifyClientId, spotifySecret }: BnSecrets,
): BnLambdas {
  const cacheAlbumArtLambda = new NodejsFunction(scope, `${envName}-cacheAlbumArtLambda`, {
    runtime: DEFAULT_RUNTIME,
    architecture: Architecture.ARM_64,
    handler: 'handler',
    memorySize: 256,
    functionName: `${envName}-cacheAlbumArtLambda`,
    entry: `${FUNCTION_DIR}/album-art/cache-album-art.lambda.ts`,
    timeout: Duration.seconds(10),
    logGroup: new LogGroup(scope, `${envName}-bnmallorca-cacheAlbumArtLambdaLogGroup`, {
      retention: RetentionDays.ONE_MONTH,
    }),
    environment: {
      ALBUM_ART_BUCKET: albumArtBucket.bucketName,
      ALBUM_ART_TABLE: albumArtTable.tableName,
    },
    bundling: {
      minify: true,
    },
  });

  // For testing purposes
  const processNewTrackLambda = new NodejsFunction(scope, `${envName}-processNewTrackLambda`, {
    runtime: DEFAULT_RUNTIME,
    architecture: Architecture.ARM_64,
    handler: 'handler',
    memorySize: 256,
    functionName: `${envName}-processNewTrackLambda`,
    entry: `${FUNCTION_DIR}/track/process-new-track.lambda.ts`,
    timeout: Duration.seconds(10),
    logGroup: new LogGroup(scope, `${envName}-bnmallorca-processNewTrackLambdaLogGroup`, {
      retention: RetentionDays.ONE_MONTH,
    }),
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
    },
  });

  const getTrackListLambda = new NodejsFunction(scope, `${envName}-getTrackListLambda`, {
    runtime: DEFAULT_RUNTIME,
    architecture: Architecture.ARM_64,
    handler: 'handler',
    memorySize: 2048,
    functionName: `${envName}-getTrackListLambda`,
    entry: `${FUNCTION_DIR}/track/get-track-list.lambda.ts`,
    timeout: Duration.seconds(10),
    logGroup: new LogGroup(scope, `${envName}-bnmallorca-getTrackListLambdaLogGroup`, {
      retention: RetentionDays.ONE_MONTH,
    }),
    environment: {
      ALBUM_ART_BUCKET: albumArtBucket.bucketName,
      TRACK_LIST_TABLE: trackListTable.tableName,
      ALBUM_ART_TABLE: albumArtTable.tableName,
    },
    bundling: {
      minify: true,
    },
  });

  const getScheduleLambda = new NodejsFunction(scope, `${envName}-getScheduleLambda`, {
    runtime: DEFAULT_RUNTIME,
    architecture: Architecture.ARM_64,
    handler: 'handler',
    memorySize: 256,
    functionName: `${envName}-getScheduleLambda`,
    entry: `${FUNCTION_DIR}/schedule/get-schedule.lambda.ts`,
    timeout: Duration.seconds(10),
    logGroup: new LogGroup(scope, `${envName}-bnmallorca-getScheduleLambdaLogGroup`, {
      retention: RetentionDays.ONE_MONTH,
    }),
    environment: {
      SCHEDULE_TABLE: scheduleTable.tableName,
    },
    bundling: {
      minify: true,
    },
  });

  const pollNewTrackLambda = new NodejsFunction(scope, `${envName}-pollNewTrackLambda`, {
    runtime: DEFAULT_RUNTIME,
    architecture: Architecture.ARM_64,
    handler: 'handler',
    memorySize: 256,
    functionName: `${envName}-pollNewTrackLambda`,
    entry: `${FUNCTION_DIR}/track/poll-new-track.lambda.ts`,
    timeout: Duration.seconds(10),
    logGroup: new LogGroup(scope, `${envName}-bnmallorca-pollNewTrackLambdaLogGroup`, {
      retention: RetentionDays.ONE_MONTH,
    }),
    environment: {
      CENTOVA_URL: centovaUrl,
      TRACK_SOURCE: trackSource,
      CENTOVA_STREAM_URL: centovaStreamUrl,
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
    },
  });

  const fillQueueLambda = new NodejsFunction(scope, `${envName}-fillQueueLambda`, {
    runtime: DEFAULT_RUNTIME,
    architecture: Architecture.ARM_64,
    handler: 'handler',
    memorySize: 128,
    functionName: `${envName}-fillQueueLambda`,
    entry: `${FUNCTION_DIR}/track/fill-track-polling-queue.lambda.ts`,
    timeout: Duration.seconds(10),
    logGroup: new LogGroup(scope, `${envName}-bnmallorca-fillQueueLambdaLogGroup`, {
      retention: RetentionDays.ONE_MONTH,
    }),
    environment: {
      POLL_QUEUE_URL: pollingQueue.queueUrl,
    },
    bundling: {
      minify: true,
    },
  });

  const registerDeviceLambda = new NodejsFunction(scope, `${envName}-registerDeviceLambda`, {
    runtime: DEFAULT_RUNTIME,
    architecture: Architecture.ARM_64,
    handler: 'handler',
    memorySize: 512,
    functionName: `${envName}-registerDeviceLambda`,
    entry: `${FUNCTION_DIR}/device/register-device.lambda.ts`,
    timeout: Duration.seconds(10),
    logGroup: new LogGroup(scope, `${envName}-bnmallorca-registerDeviceLambdaLogGroup`, {
      retention: RetentionDays.ONE_MONTH,
    }),
    environment: {
      NOTIFICATION_TOPIC: notificationsTopic.topicArn,
      IOS_APP_SNS: iosAppSns,
      ANDROID_APP_SNS: androidAppSns,
      DEVICE_TABLE: deviceTable.tableName,
    },
    bundling: {
      minify: true,
    },
  });

  const triggerRegisterDeviceLambda = new NodejsFunction(
    scope,
    `${envName}-triggerRegisterDeviceLambda`,
    {
      runtime: DEFAULT_RUNTIME,
      architecture: Architecture.ARM_64,
      handler: 'handler',
      memorySize: 2048,
      functionName: `${envName}-triggerRegisterDeviceLambda`,
      entry: `${FUNCTION_DIR}/device/trigger-async-register-device.lambda.ts`,
      timeout: Duration.seconds(10),
      logGroup: new LogGroup(scope, `${envName}-bnmallorca-triggerRegisterDeviceLambdaLogGroup`, {
        retention: RetentionDays.ONE_MONTH,
      }),
      environment: {
        REGISTER_DEVICE_LAMBDA_ARN: registerDeviceLambda.functionArn,
      },
      bundling: {
        minify: true,
      },
    },
  );

  const unregisterDeviceLambda = new NodejsFunction(scope, `${envName}-unregisterDeviceLambda`, {
    runtime: DEFAULT_RUNTIME,
    architecture: Architecture.ARM_64,
    handler: 'handler',
    memorySize: 128,
    functionName: `${envName}-unregisterDeviceLambda`,
    entry: `${FUNCTION_DIR}/device/unregister-device.lambda.ts`,
    timeout: Duration.seconds(10),
    logGroup: new LogGroup(scope, `${envName}-bnmallorca-unregisterDeviceLambdaLogGroup`, {
      retention: RetentionDays.ONE_MONTH,
    }),
    environment: {
      NOTIFICATION_TOPIC: notificationsTopic.topicArn,
      IOS_APP_SNS: iosAppSns,
      ANDROID_APP_SNS: androidAppSns,
      DEVICE_TABLE: deviceTable.tableName,
    },
    bundling: {
      minify: true,
    },
  });

  const deleteDevicesLambda = new NodejsFunction(scope, `${envName}-deleteDevicesLambda`, {
    runtime: DEFAULT_RUNTIME,
    architecture: Architecture.ARM_64,
    handler: 'handler',
    memorySize: 512,
    functionName: `${envName}-deleteDevicesLambda`,
    entry: `${FUNCTION_DIR}/device/clean-devices.lambda.ts`,
    timeout: Duration.minutes(2),
    logGroup: new LogGroup(scope, `${envName}-bnmallorca-deleteDevicesLambdaLogGroup`, {
      retention: RetentionDays.ONE_MONTH,
    }),
    environment: {
      NOTIFICATION_TOPIC: notificationsTopic.topicArn,
      IOS_APP_SNS: iosAppSns,
      ANDROID_APP_SNS: androidAppSns,
      DEVICE_TABLE: deviceTable.tableName,
    },
    bundling: {
      minify: true,
    },
  });

  const findDisabledDevicesLambda = new NodejsFunction(
    scope,
    `${envName}-findDisabledDevicesLambda`,
    {
      runtime: DEFAULT_RUNTIME,
      architecture: Architecture.ARM_64,
      handler: 'handler',
      memorySize: 256,
      functionName: `${envName}-findDisabledDevicesLambda`,
      entry: `${FUNCTION_DIR}/device/find-unactive-devices.lambda.ts`,
      timeout: Duration.seconds(10),
      logGroup: new LogGroup(scope, `${envName}-bnmallorca-findDisabledDevicesLambdaLogGroup`, {
        retention: RetentionDays.ONE_MONTH,
      }),
      environment: {
        NOTIFICATION_TOPIC: notificationsTopic.topicArn,
        IOS_APP_SNS: iosAppSns,
        ANDROID_APP_SNS: androidAppSns,
        DEVICE_TABLE: deviceTable.tableName,
      },
      bundling: {
        minify: true,
      },
    },
  );

  return {
    cacheAlbumArtLambda,
    processNewTrackLambda,
    getTrackListLambda,
    getScheduleLambda,
    pollNewTrackLambda,
    fillQueueLambda,
    registerDeviceLambda,
    unregisterDeviceLambda,
    deleteDevicesLambda,
    findDisabledDevicesLambda,
    triggerRegisterDeviceLambda,
  };
}
