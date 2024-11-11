import { GetCommand, GetCommandInput, PutCommand, PutCommandInput, QueryCommand } from '@aws-sdk/lib-dynamodb'

import { DynamoRepository } from './dynamo-repository'
import { env } from '../config/env'
import { DeviceDto } from '../types/components.dto'

export class DeviceRepository extends DynamoRepository<DeviceDto> {
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

  public async getDevicesByStatus(status: number, limit?: number): Promise<DeviceDto[]> {
    return await this.getBySecondaryIndexWithSortKey('statusSubscribedAtIndex', 'status', status, false, limit)
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
    const requests = tokens.map(t => ({ partitionKey: t }))
    await this.batchDelete(requests, 'token')
  }

  public async createDevices(devices: DeviceDto[]): Promise<void> {
    await this.batchPut(devices)
  }
}
