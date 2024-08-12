import { PutCommand, PutCommandInput, QueryCommand, QueryCommandInput } from '@aws-sdk/lib-dynamodb'
import { DynamoRepository } from './dynamo-repository'
import { env } from '../config/env'
import { TrackDto } from '../types/components.dto'

export class TrackListRepository extends DynamoRepository<TrackDto> {
  constructor() {
    super(env.trackListTable)
  }

  public async putTrack(track: TrackDto) {
    const input: PutCommandInput = {
      TableName: this.table,
      Item: track,
    }
    await this.client.send(new PutCommand(input))
  }

  public async getLastTracks(
    limit: number = 1,
    lastSongKey?: number,
  ): Promise<{ tracksDto: Array<TrackDto>; lastKey?: number }> {
    if (limit <= 0 || limit > 25) {
      throw Error('Limit is not between 1 and 25')
    }

    const input: QueryCommandInput = {
      TableName: this.table,
      Limit: limit,
      ScanIndexForward: false,
      ExpressionAttributeNames: { '#kn0': 'radio' },
      ExpressionAttributeValues: { ':kv0': TrackListRepository.getPartitionKeyValue() },
      KeyConditionExpression: '#kn0 = :kv0',
    }

    if (lastSongKey != null) {
      input.ExclusiveStartKey = { radio: TrackListRepository.getPartitionKeyValue(), timestamp: lastSongKey }
    }

    const results = await this.client.send(new QueryCommand(input))
    const tracksDto = results.Items as Array<TrackDto>
    const lastKeyDb = results.LastEvaluatedKey?.['timestamp'] ?? undefined
    return { tracksDto, lastKey: lastKeyDb }
  }

  public static getPartitionKeyValue(): string {
    return 'BNMALLORCA'
  }
}
