import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocument, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

export abstract class DynamoRepository {
  protected readonly table: string
  protected client: DynamoDBDocumentClient

  protected constructor(tableName: string) {
    this.table = tableName
    this.client = DynamoDBDocument.from(new DynamoDBClient({}), {
      marshallOptions: { removeUndefinedValues: true },
    })
  }
}
