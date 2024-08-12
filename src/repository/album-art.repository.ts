import { GetCommand, GetCommandInput, PutCommand, PutCommandInput } from '@aws-sdk/lib-dynamodb'
import { DynamoRepository } from './dynamo-repository'
import { env } from '../config/env'
import { AlbumArtDto } from '../types/components.dto'

export class AlbumArtRepository extends DynamoRepository<AlbumArtDto> {
  constructor() {
    super(env.albumArtTable)
  }

  public async getAlbumArt(trackId: string): Promise<AlbumArtDto | undefined> {
    const input: GetCommandInput = {
      TableName: this.table,
      Key: { id: trackId },
    }

    const result = await this.client.send(new GetCommand(input))
    return (result?.Item as AlbumArtDto) ?? undefined
  }

  public async addAlbumArt(albumArt: AlbumArtDto) {
    const input: PutCommandInput = {
      TableName: this.table,
      Item: albumArt,
    }
    await this.client.send(new PutCommand(input))
  }
}
