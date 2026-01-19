import { ScanCommand, type ScanCommandInput } from '@aws-sdk/lib-dynamodb';
import { env } from '../config/env';
import { log } from '../helpers/logger';
import type { ShowDto } from '../types/components.dto';
import { DynamoRepository } from './dynamo-repository';

export class ScheduleRepository extends DynamoRepository<ShowDto> {
  constructor() {
    super(env.scheduleTable);
  }

  public async getFullSchedule(): Promise<ShowDto[]> {
    const params: ScanCommandInput = {
      TableName: this.table,
    };

    let result: ShowDto[] = [];
    try {
      do {
        const data = await this.client.send(new ScanCommand(params));
        result = result.concat((data.Items as ShowDto[]) ?? []);
        params.ExclusiveStartKey = data.LastEvaluatedKey;
      } while (params.ExclusiveStartKey);
    } catch (err) {
      log.error(`Error getting schedule from db ${err}`);
    }

    return result;
  }
}
