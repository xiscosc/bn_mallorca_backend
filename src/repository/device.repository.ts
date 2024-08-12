import {
  BatchWriteCommand,
  BatchWriteCommandInput,
  GetCommand,
  GetCommandInput,
  PutCommand,
  PutCommandInput,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb'

import { DynamoRepository } from './dynamo-repository'
import { env } from '../config/env'
import { DeviceDto } from '../types/components.dto'

export class DeviceRepository extends DynamoRepository {
  constructor() {
    super(env.deviceTable)
  }

  public async getDevice(token: string): Promise<DeviceDto | undefined> {
    const input: GetCommandInput = {
      TableName: this.table,
      Key: { token },
    }

    const result = await this.client.send(new GetCommand(input))
    return (result?.Item as DeviceDto) ?? undefined
  }

  public async putDevice(device: DeviceDto) {
    const input: PutCommandInput = {
      TableName: this.table,
      Item: device,
    }
    await this.client.send(new PutCommand(input))
  }

  public async getDevicesByStatus(status: number): Promise<DeviceDto[]> {
    const params = {
      TableName: this.table,
      IndexName: 'statusIndex',
      KeyConditionExpression: '#partitionKey = :partitionValue',
      ExpressionAttributeNames: {
        '#partitionKey': 'status',
      },
      ExpressionAttributeValues: {
        ':partitionValue': status,
      },
    }

    const data = await this.client.send(new QueryCommand(params))
    return (data.Items as DeviceDto[]) ?? []
  }

  public async getNotRenewedDevices(status: number, ts: number): Promise<DeviceDto[]> {
    const params = {
      TableName: this.table,
      IndexName: 'statusSubscribedAtIndex',
      KeyConditionExpression: '#status = :status AND #subscribedAt <= :subscribedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#subscribedAt': 'subscribedAt',
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':subscribedAt': ts,
      },
    }

    const data = await this.client.send(new QueryCommand(params))
    return (data.Items as DeviceDto[]) ?? []
  }

  public async deleteDevices(tokens: string[]) {
    if (tokens.length > 25 || tokens.length === 0) {
      return
    }

    const requests = tokens.map(t => ({
      DeleteRequest: {
        Key: {
          PartitionKey: { token: t },
        },
      },
    }))

    const params = {
      RequestItems: {
        [this.table]: requests,
      },
    }

    await this.client.send(new BatchWriteCommand(params))
  }

  public async createDevices(devices: DeviceDto[]): Promise<void> {
    if (devices.length > 25 || devices.length === 0) {
      return
    }

    const requests = devices.map(device => ({
      PutRequest: {
        Item: device,
      },
    }))

    const params: BatchWriteCommandInput = {
      RequestItems: {
        [this.table]: requests,
      },
    }

    await this.client.send(new BatchWriteCommand(params))
  }
}
