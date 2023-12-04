import { PublishCommand, PublishCommandInput, SNSClient } from '@aws-sdk/client-sns'

export async function publishToSns(topic: string, payload: string) {
  const snsClient = new SNSClient({})
  const dataObj = { data: JSON.parse(payload) }
  const pushNotificationPayload = {
    default: payload,
    GCM: JSON.stringify(dataObj),
    APNS: JSON.stringify({ aps: { 'content-available': 1 }, ...dataObj }),
  }

  const notificationInput: PublishCommandInput = {
    Message: JSON.stringify(pushNotificationPayload),
    TopicArn: topic,
    MessageStructure: 'json',
  }

  await snsClient.send(new PublishCommand(notificationInput))
}
