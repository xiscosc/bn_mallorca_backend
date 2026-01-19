import {
  CreatePlatformEndpointCommand,
  type CreatePlatformEndpointCommandInput,
  DeleteEndpointCommand,
  SNSClient,
  SubscribeCommand,
  type SubscribeCommandInput,
  UnsubscribeCommand,
} from '@aws-sdk/client-sns';
import { DateTime } from 'luxon';
import { env } from '../config/env';
import { extractErrorMessage } from '../helpers/error.helper';
import { log } from '../helpers/logger';
import { getTs, getTsFromStart } from '../helpers/time.helper';
import { DeviceRepository } from '../repository/device.repository';
import type { DeviceDto } from '../types/components.dto';

export enum DeviceStatus {
  ENABLED = 1,
  DISABLED = 2,
}

export class DeviceService {
  private repository: DeviceRepository;
  private snsClient: SNSClient;

  constructor() {
    this.repository = new DeviceRepository();
    this.snsClient = new SNSClient({});
  }

  public async registerDevice(token: string, type: string) {
    // Check if device is already registered
    const device = await this.repository.getDevice(token);
    if (device != null) {
      device.status = DeviceStatus.ENABLED;
      device.subscribedAt = getTs();
      await this.saveDevices([device]);
    } else {
      const endpoint = await this.createEndpoint(token, type);
      const subscription = await this.createSubscription(endpoint);
      const newDevice: DeviceDto = {
        token,
        type,
        status: DeviceStatus.ENABLED,
        endpointArn: endpoint,
        subscriptionArn: subscription,
        subscribedAt: getTs(),
      };
      await this.repository.putDevice(newDevice);
    }
  }

  public async unregisterDevice(token: string): Promise<{ token: string; disabled: boolean }> {
    const device = await this.repository.getDevice(token);
    if (device != null) {
      if (device.status === DeviceStatus.ENABLED) {
        device.status = DeviceStatus.DISABLED;
        await this.saveDevices([device]);
      }
      return { token, disabled: true };
    }

    return { token, disabled: false };
  }

  public async cleanDevices() {
    const devices = await this.repository.getDevicesByStatus(DeviceStatus.DISABLED, 35);
    if (devices.length > 0) {
      const deleteSubscriptionPromises = devices.map((d) =>
        this.deleteSubscription(d.subscriptionArn),
      );
      await Promise.all(deleteSubscriptionPromises);
      const deleteEndpointPromises = devices.map((d) => this.deleteEndpoint(d.endpointArn));
      await Promise.all(deleteEndpointPromises);
      await this.deleteDevices(devices);
    }
  }

  public async markUnactiveDevices() {
    const startTs = getTsFromStart(DateTime.now().minus({ days: 1 }));
    const notRenewedDevices = await this.repository.getNotRenewedDevices(
      DeviceStatus.ENABLED,
      startTs,
    );
    const notRenewedDevicesWithStatus = notRenewedDevices.map((d) => ({
      ...d,
      status: DeviceStatus.DISABLED,
    }));
    await this.saveDevices(notRenewedDevicesWithStatus);
  }

  private async deleteSubscription(arn: string) {
    try {
      await this.snsClient.send(new UnsubscribeCommand({ SubscriptionArn: arn }));
    } catch (e: unknown) {
      log.error(`error deleting subscription ${arn} - ${extractErrorMessage(e)}`);
    }
  }

  private async deleteEndpoint(arn: string) {
    try {
      await this.snsClient.send(new DeleteEndpointCommand({ EndpointArn: arn }));
    } catch (e: unknown) {
      log.error(`error deleting endpoint ${arn} - ${extractErrorMessage(e)}`);
    }
  }

  private async deleteDevices(devices: DeviceDto[]) {
    await this.repository.deleteDevices(devices.map((d) => d.token));
  }

  private async saveDevices(devices: DeviceDto[]) {
    await this.repository.createDevices(devices);
  }

  private async createEndpoint(token: string, type: string): Promise<string> {
    const snsApp = type === 'ios' ? env.iosAppSns : env.androidAppSns;
    const endpointParams: CreatePlatformEndpointCommandInput = {
      PlatformApplicationArn: snsApp,
      Token: token,
    };

    const endpointResult = await this.snsClient.send(
      new CreatePlatformEndpointCommand(endpointParams),
    );
    return endpointResult.EndpointArn!;
  }

  private async createSubscription(endpointArn: string): Promise<string> {
    const subscriptionParams: SubscribeCommandInput = {
      TopicArn: env.notificationTopicArn,
      Protocol: 'application',
      Endpoint: endpointArn,
    };

    const result = await this.snsClient.send(new SubscribeCommand(subscriptionParams));
    return result.SubscriptionArn!;
  }
}
