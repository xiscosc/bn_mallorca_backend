import {
  CreatePlatformEndpointCommand,
  CreatePlatformEndpointCommandInput,
  DeleteEndpointCommand,
  Endpoint,
  ListEndpointsByPlatformApplicationCommand,
  ListSubscriptionsByTopicCommand,
  SNSClient,
  SubscribeCommand,
  SubscribeCommandInput,
  Subscription,
  UnsubscribeCommand,
} from '@aws-sdk/client-sns'
import * as log from 'lambda-log'
import { env } from '../config/env'

export async function registerDevice(token: string, type: string) {
  const client = new SNSClient({})

  // Create endpoint
  const snsApp = type === 'ios' ? env.iosAppSns : env.androidAppSns
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

export async function removeDisabledDevices() {
  const client = new SNSClient({ region: 'eu-central-1' })
  const disabledEndpointsAndroid = await getDisabledEndpointArnsList('android', client)
  const disabledEndpointsIos = await getDisabledEndpointArnsList('ios', client)
  const allDisabledEndpoints = [...disabledEndpointsAndroid, ...disabledEndpointsIos]
  const disabledEndpointArns = new Set<string>(allDisabledEndpoints)
  log.debug(`Found ${disabledEndpointArns.size} endpoints to delete`)
  if (allDisabledEndpoints.length === 0) return

  const result = await client.send(new ListSubscriptionsByTopicCommand({ TopicArn: env.notificationTopicArn }))
  const subscriptionsToDelete = getSubscriptionsToDisable(disabledEndpointArns, result.Subscriptions)
  let next = result.NextToken
  while (next !== undefined) {
    const newResult = await client.send(
      new ListSubscriptionsByTopicCommand({ TopicArn: env.notificationTopicArn, NextToken: next }),
    )
    next = newResult.NextToken
    subscriptionsToDelete.push(...getSubscriptionsToDisable(disabledEndpointArns, newResult.Subscriptions))
  }

  log.debug(`Found ${subscriptionsToDelete.length} subscriptions to delete`)
  if (subscriptionsToDelete.length > 0) {
    const deleteSubscriptionPromises = subscriptionsToDelete.map(s =>
      client.send(new UnsubscribeCommand({ SubscriptionArn: s.SubscriptionArn! })),
    )
    await Promise.all(deleteSubscriptionPromises)
  }

  const deleteEndpointPromises = allDisabledEndpoints.map(e =>
    client.send(new DeleteEndpointCommand({ EndpointArn: e })),
  )
  await Promise.all(deleteEndpointPromises)
}

async function getDisabledEndpointArnsList(type: string, client: SNSClient): Promise<string[]> {
  const snsApp = type === 'ios' ? env.iosAppSns : env.androidAppSns

  // Get disabled endpoints
  const result = await client.send(new ListEndpointsByPlatformApplicationCommand({ PlatformApplicationArn: snsApp }))
  const disabledEndpoints = getDisabledEndpoints(result.Endpoints)
  let next = result.NextToken
  while (next !== undefined) {
    const newResult = await client.send(
      new ListEndpointsByPlatformApplicationCommand({ PlatformApplicationArn: snsApp, NextToken: next }),
    )
    next = newResult.NextToken
    disabledEndpoints.push(...getDisabledEndpoints(newResult.Endpoints))
  }

  return disabledEndpoints.map(e => e.EndpointArn!)
}

function getDisabledEndpoints(endpoints?: Endpoint[]): Endpoint[] {
  if (endpoints === undefined) return []
  return endpoints.filter(e => {
    log.debug(JSON.stringify(e))
    if (e.EndpointArn === undefined) return false
    if (e.Attributes === undefined) return false
    return e.Attributes['Enabled'] === 'false'
  })
}

function getSubscriptionsToDisable(applicationArns: Set<string>, subscriptions?: Subscription[]): Subscription[] {
  if (subscriptions === undefined) return []
  return subscriptions.filter(s => {
    log.debug(JSON.stringify(s))
    if (s.Endpoint === undefined) return false
    if (s.SubscriptionArn === undefined) return false
    return applicationArns.has(s.Endpoint)
  })
}
