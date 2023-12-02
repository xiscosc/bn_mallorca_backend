import {
  CreatePlatformEndpointCommand,
  CreatePlatformEndpointCommandInput,
  SNSClient,
  SubscribeCommand,
  SubscribeCommandInput,
} from '@aws-sdk/client-sns'
import { env } from '../config/env'

export async function registerDevice(token: string, type: string) {
  const client = new SNSClient()

  // Create endpoint
  const snsApp = type === 'ios' ? env.iosAppSns : ''
  const endpointParams: CreatePlatformEndpointCommandInput = {
    PlatformApplicationArn: snsApp,
    Token: token,
  }

  const endpointResult = await client.send(new CreatePlatformEndpointCommand(endpointParams))

  // Subscribe endpoint
  const subscriptionParams: SubscribeCommandInput = {
    TopicArn: env.notificationTopicArn,
    Protocol: 'application',
    Endpoint: endpointResult.EndpointArn,
  }

  await client.send(new SubscribeCommand(subscriptionParams))
}
