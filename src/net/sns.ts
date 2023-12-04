import { PublishCommand, PublishCommandInput, SNSClient } from '@aws-sdk/client-sns'

export async function publishToSns(topic: string, payload: string) {
  const snsClient = new SNSClient({})
  const object = JSON.parse(payload)
  const pushNotificationPayload = {
    default: payload,
    GCM: JSON.stringify({ data: object }),
    APNS: JSON.stringify({ aps: { 'content-available': 1 }, data: object }),
  }

  const notificationInput: PublishCommandInput = {
    Message: JSON.stringify(pushNotificationPayload),
    TopicArn: topic,
    MessageStructure: 'json',
    MessageAttributes: {
      'AWS.SNS.MOBILE.APNS.TOPIC': { DataType: 'String', StringValue: 'com.apploading.bnmallorca' },
      'AWS.SNS.MOBILE.APNS.PUSH_TYPE': { DataType: 'String', StringValue: 'background' },
      'AWS.SNS.MOBILE.APNS.PRIORITY': { DataType: 'String', StringValue: '5' },
    },
  }

  await snsClient.send(new PublishCommand(notificationInput))
}
