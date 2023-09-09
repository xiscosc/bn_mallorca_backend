import { PublishCommand, PublishCommandInput, SNSClient } from '@aws-sdk/client-sns'

export async function publishToSns(topic: string, payload: string) {
  const snsClient = new SNSClient({})
  const notificationInput: PublishCommandInput = {
    Message: payload,
    TopicArn: topic,
  }

  await snsClient.send(new PublishCommand(notificationInput))
}
