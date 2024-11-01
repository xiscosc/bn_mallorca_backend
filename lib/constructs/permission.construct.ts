import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'
import { BnBuckets } from './bucket.construct'
import { BnTables } from './database.construct'
import { BnLambdas } from './lambda.construct'
import { BnQueues } from './queue.construct'
import { BnSecrets } from './secret.construct'
import { BnTopics } from './topic.construct'

export function createPermissions(
  scope: Construct,
  envName: string,
  iosAppSns: string,
  androidAppSns: string,
  { notificationsTopic }: BnTopics,
  { trackListTable, albumArtTable, deviceTable, scheduleTable }: BnTables,
  {
    cacheAlbumArtLambda,
    pollNewTrackLambda,
    processNewTrackLambda,
    getTackListLambda,
    getScheduleLambda,
    fillQueueLambda,
    registerDeviceLambda,
    unregisterDeviceLambda,
    deleteDevicesLambda,
    findDisabledDevicesLambda,
  }: BnLambdas,
  { pollingQueue }: BnQueues,
  { albumArtBucket }: BnBuckets,
  { spotifyClientId, spotifySecret }: BnSecrets,
) {
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
    resources: [iosAppSns, androidAppSns],
  })

  const snsSubscribePolicy = new PolicyStatement({
    actions: ['sns:Subscribe'],
    resources: [notificationsTopic.topicArn],
  })

  registerDeviceLambda.role?.attachInlinePolicy(
    new Policy(scope, `${envName}-registerDevicePolicy`, {
      statements: [snsRegisterPolicy, snsSubscribePolicy],
    }),
  )

  const deleteEndpointPolicy = new PolicyStatement({
    actions: ['sns:DeleteEndpoint'],
    resources: ['*'],
  })

  const unsubscribePolicy = new PolicyStatement({
    actions: ['sns:Unsubscribe'],
    resources: ['*'],
  })

  deleteDevicesLambda.role?.attachInlinePolicy(
    new Policy(scope, `${envName}-deleteDevicesPolicy`, {
      statements: [deleteEndpointPolicy, unsubscribePolicy],
    }),
  )
}
