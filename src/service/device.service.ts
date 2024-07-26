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
  UnsubscribeCommand,
  Subscription,
} from '@aws-sdk/client-sns'
import { env } from '../config/env'
import { DeviceRepository } from '../repository/device.repository'
import { DeviceDto } from '../types/components.dto'
import {} from 'aws-cdk-lib/aws-sns'

enum DeviceStatus {
  ENABLED = 1,
  DISABLED = 2,
}

export class DeviceService {
  private repository: DeviceRepository
  private snsClient: SNSClient

  constructor() {
    this.repository = new DeviceRepository()
    this.snsClient = new SNSClient({})
  }

  public async registerDevice(token: string, type: string) {
    // Check if device is already registered
    const device = await this.repository.getDevice(token)
    if (device != null) {
      if (device.status === DeviceStatus.DISABLED) {
        device.status = DeviceStatus.ENABLED
        await this.repository.putDevice(device)
      }
    } else {
      const endpoint = await this.createEndpoint(token, type)
      const subscription = await this.createSubscription(endpoint)
      const newDevice: DeviceDto = {
        token,
        type,
        status: DeviceStatus.ENABLED,
        endopintArn: endpoint,
        subscriptionArn: subscription,
      }
      await this.repository.putDevice(newDevice)
    }
  }

  public async unregisterDevice(token: string): Promise<{ token: string; disabled: boolean }> {
    const device = await this.repository.getDevice(token)
    if (device != null) {
      if (device.status === DeviceStatus.ENABLED) {
        device.status = DeviceStatus.DISABLED
        await this.repository.putDevice(device)
      }
      return { token, disabled: true }
    }

    return { token, disabled: false }
  }

  public async cleanDevices() {
    const devices = await this.repository.getDevicesByStatus(DeviceStatus.DISABLED)
    const deleteSubscriptionPromises = devices.map(d =>
      this.snsClient.send(new UnsubscribeCommand({ SubscriptionArn: d.subscriptionArn })),
    )

    await Promise.all(deleteSubscriptionPromises)

    const deleteEndpointPromises = devices.map(d =>
      this.snsClient.send(new DeleteEndpointCommand({ EndpointArn: d.endopintArn })),
    )

    await Promise.all(deleteEndpointPromises)

    const tokenBatches = devices
      .map(d => d.token)
      .reduce((batches, item, index) => {
        if (index % 25 === 0) {
          batches.push([item])
        } else {
          batches[batches.length - 1]!.push(item)
        }
        return batches
      }, [] as string[][])

    const deleteDevicesPromises = tokenBatches.map(batch => this.repository.deleteDevices(batch))
    await Promise.all(deleteDevicesPromises)
  }

  public async findDisabledDevices() {
    const disabledAndroidTokens = await this.getDisabledEndpointTokens('android')
    const disabledIosTokens = await this.getDisabledEndpointTokens('ios')
    const disablePromises = [...disabledAndroidTokens, ...disabledIosTokens].map(endpoint =>
      this.unregisterDevice(endpoint.token),
    )
    const results = await Promise.all(disablePromises)
    const orphanResults = results.filter(r => r.disabled === false).map(r => r.token)
    if (orphanResults.length === 0) {
      return
    }

    const tokenSet = new Set(orphanResults)
    const androidToDelete = disabledAndroidTokens.filter(t => tokenSet.has(t.token))
    const iosToDelete = disabledIosTokens.filter(t => tokenSet.has(t.token))
    const devicesToDelete: DeviceDto[] = []
    const subscriptions = await this.getAllSubscrptions()
    const androidMap = new Map<string, { token: string; arn: string }>(androidToDelete.map(i => [i.arn, i]))
    const iosMap = new Map<string, { token: string; arn: string }>(iosToDelete.map(i => [i.arn, i]))

    subscriptions.forEach(s => {
      if (androidMap.has(s.Endpoint!)) {
        const device = {
          token: androidMap.get(s.Endpoint!)!.token,
          type: 'android',
          status: DeviceStatus.DISABLED,
          endopintArn: androidMap.get(s.Endpoint!)!.arn,
          subscriptionArn: s.SubscriptionArn!,
        }
        devicesToDelete.push(device)
      } else if (iosMap.has(s.Endpoint!)) {
        const device = {
          token: iosMap.get(s.Endpoint!)!.token,
          type: 'ios',
          status: DeviceStatus.DISABLED,
          endopintArn: iosMap.get(s.Endpoint!)!.arn,
          subscriptionArn: s.SubscriptionArn!,
        }
        devicesToDelete.push(device)
      }
    })

    await Promise.all(devicesToDelete.map(d => this.repository.putDevice(d)))
  }

  private async getAllSubscrptions(): Promise<Subscription[]> {
    const result = await this.snsClient.send(
      new ListSubscriptionsByTopicCommand({ TopicArn: env.notificationTopicArn }),
    )
    const subscriptions = result.Subscriptions ?? []
    let next = result.NextToken
    while (next !== undefined) {
      const newResult = await this.snsClient.send(
        new ListSubscriptionsByTopicCommand({ TopicArn: env.notificationTopicArn, NextToken: next }),
      )
      next = newResult.NextToken
      subscriptions.push(...(newResult.Subscriptions ?? []))
    }

    return subscriptions
  }

  private async getDisabledEndpointTokens(type: string): Promise<{ token: string; arn: string }[]> {
    const snsApp = type === 'ios' ? env.iosAppSns : env.androidAppSns

    // Get disabled endpoints
    const result = await this.snsClient.send(
      new ListEndpointsByPlatformApplicationCommand({ PlatformApplicationArn: snsApp }),
    )
    const disabledEndpoints = DeviceService.getDisabledEndpoints(result.Endpoints)
    let next = result.NextToken
    while (next !== undefined) {
      const newResult = await this.snsClient.send(
        new ListEndpointsByPlatformApplicationCommand({ PlatformApplicationArn: snsApp, NextToken: next }),
      )
      next = newResult.NextToken
      disabledEndpoints.push(...DeviceService.getDisabledEndpoints(newResult.Endpoints))
    }

    return disabledEndpoints.map(e => ({ token: e.Attributes!['Token']!, arn: e.EndpointArn! }))
  }

  private async createEndpoint(token: string, type: string): Promise<string> {
    const snsApp = type === 'ios' ? env.iosAppSns : env.androidAppSns
    const endpointParams: CreatePlatformEndpointCommandInput = {
      PlatformApplicationArn: snsApp,
      Token: token,
    }

    const endpointResult = await this.snsClient.send(new CreatePlatformEndpointCommand(endpointParams))
    return endpointResult.EndpointArn!
  }

  private async createSubscription(endpointArn: string): Promise<string> {
    const subscriptionParams: SubscribeCommandInput = {
      TopicArn: env.notificationTopicArn,
      Protocol: 'application',
      Endpoint: endpointArn,
    }

    const result = await this.snsClient.send(new SubscribeCommand(subscriptionParams))
    return result.SubscriptionArn!
  }

  private static getDisabledEndpoints(endpoints?: Endpoint[]): Endpoint[] {
    if (endpoints === undefined) return []
    return endpoints.filter(e => {
      if (e.EndpointArn === undefined) return false
      if (e.Attributes === undefined) return false
      return e.Attributes['Enabled'] === 'false'
    })
  }
}
