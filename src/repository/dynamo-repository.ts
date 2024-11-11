import { AttributeValue, DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  BatchWriteCommand,
  DynamoDBDocument,
  DynamoDBDocumentClient,
  QueryCommand,
  QueryCommandInput,
} from '@aws-sdk/lib-dynamodb'
import _ from 'lodash'

export abstract class DynamoRepository<T> {
  protected readonly table: string
  protected client: DynamoDBDocumentClient

  protected constructor(tableName: string) {
    this.table = tableName
    this.client = DynamoDBDocument.from(new DynamoDBClient({}), {
      marshallOptions: { removeUndefinedValues: true },
    })
  }

  protected async batchDelete(
    values: { partitionKey: string; sortKey?: string | number }[],
    partitionKey: string,
    sortKey?: string,
  ) {
    const deleteRequests = values.map(value => {
      const key: {
        [x: string]: string | number
      } = {
        [partitionKey]: value.partitionKey,
      }

      if (sortKey && value.sortKey) {
        key[sortKey] = value.sortKey
      }

      return {
        DeleteRequest: {
          Key: key,
        },
      }
    })

    const chunkedRequests = _.chunk(deleteRequests, 25)
    const batchPromises = chunkedRequests.map(requests => this.batchWrite(requests))
    await Promise.all(batchPromises)
  }

  protected async batchPut(dtoList: T[]) {
    const putRequests = dtoList.map(dto => ({
      PutRequest: {
        Item: dto as Record<string, AttributeValue>,
      },
    }))

    const chunkedRequests = _.chunk(putRequests, 25)
    const batchPromises = chunkedRequests.map(requests => this.batchWrite(requests))
    await Promise.all(batchPromises)
  }

  protected async getBySecondaryIndex(
    indexName: string,
    partitionKeyName: string,
    partitionKeyValue: string | number,
  ): Promise<T | null> {
    const params = {
      TableName: this.table,
      IndexName: indexName,
      KeyConditionExpression: '#in = :iv',
      ExpressionAttributeNames: {
        '#in': partitionKeyName,
      },
      ExpressionAttributeValues: {
        ':iv': partitionKeyValue,
      },
    }

    const command = new QueryCommand(params)
    const response = await this.client.send(command)
    if (response.Items && response.Items.length > 0) {
      return response.Items[0] as T
    }

    return null
  }

  protected async getBySecondaryIndexWithSortKey(
    indexName: string,
    partitionKeyName: string,
    partitionKeyValue: string | number,
    ascendent: boolean,
    limit?: number,
  ): Promise<T[]> {
    const params: QueryCommandInput = {
      TableName: this.table,
      IndexName: indexName,
      KeyConditionExpression: '#in = :iv',
      ExpressionAttributeNames: {
        '#in': partitionKeyName,
      },
      ExpressionAttributeValues: {
        ':iv': partitionKeyValue,
      },
      ScanIndexForward: ascendent,
      Limit: limit,
    }

    const command = new QueryCommand(params)
    const response = await this.client.send(command)
    if (response.Items && response.Items.length > 0) {
      return response.Items as T[]
    }

    return []
  }

  private async batchWrite(
    requests:
      | { PutRequest: { Item: Record<string, AttributeValue> } }[]
      | { DeleteRequest: { Key: { [x: string]: string | number } } }[],
  ) {
    const params = {
      RequestItems: {
        [this.table]: requests,
      },
    }

    await this.client.send(new BatchWriteCommand(params))
  }
}
