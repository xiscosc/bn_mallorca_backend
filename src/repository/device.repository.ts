import {
  GetCommand,
  type GetCommandInput,
  PutCommand,
  type PutCommandInput,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { env } from '../config/env';
import type { DeviceDto } from '../types/components.dto';
import { DynamoRepository } from './dynamo-repository';

// Legacy records in DynamoDB have a typo: "endopintArn" instead of "endpointArn".
// This type and normalizeDevice function handle both field names for backwards compatibility.
type LegacyDeviceRecord = Omit<DeviceDto, 'endpointArn'> & {
  endpointArn?: string;
  endopintArn?: string;
};

function normalizeDevice(record: LegacyDeviceRecord): DeviceDto {
  const { endopintArn, ...rest } = record;
  return {
    ...rest,
    endpointArn: record.endpointArn ?? endopintArn ?? '',
  };
}

export class DeviceRepository extends DynamoRepository<DeviceDto> {
  constructor() {
    super(env.deviceTable);
  }

  public async getDevice(token: string): Promise<DeviceDto | undefined> {
    const input: GetCommandInput = {
      TableName: this.table,
      Key: { token },
    };

    const result = await this.client.send(new GetCommand(input));
    if (!result?.Item) return undefined;
    return normalizeDevice(result.Item as LegacyDeviceRecord);
  }

  public async putDevice(device: DeviceDto) {
    const input: PutCommandInput = {
      TableName: this.table,
      Item: device,
    };
    await this.client.send(new PutCommand(input));
  }

  public async getDevicesByStatus(status: number, limit?: number): Promise<DeviceDto[]> {
    const records = await this.getBySecondaryIndexWithSortKey(
      'statusSubscribedAtIndex',
      'status',
      status,
      true,
      limit,
    );
    return (records as LegacyDeviceRecord[]).map(normalizeDevice);
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
    };

    const data = await this.client.send(new QueryCommand(params));
    const records = (data.Items as LegacyDeviceRecord[]) ?? [];
    return records.map(normalizeDevice);
  }

  public async deleteDevices(tokens: string[]) {
    const requests = tokens.map((t) => ({ partitionKey: t }));
    await this.batchDelete(requests, 'token');
  }

  public async createDevices(devices: DeviceDto[]): Promise<void> {
    await this.batchPut(devices);
  }
}
