import { PutCommand, PutCommandInput } from '@aws-sdk/lib-dynamodb'
import { DynamoRepository } from './dynamo-repository'
import { env } from '../config/env'
import { TrackDto } from '../types/components'

export class TrackListRepository extends DynamoRepository {
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
}
