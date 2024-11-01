import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb'
import { Construct } from 'constructs'

export type BnTables = {
  trackListTable: Table
  albumArtTable: Table
  deviceTable: Table
  scheduleTable: Table
}

export function createTables(scope: Construct, envName: string): BnTables {
  const trackListTable = new Table(scope, `${envName}-trackListTable`, {
    tableName: `${envName}-trackList`,
    billingMode: BillingMode.PAY_PER_REQUEST,
    sortKey: { name: 'timestamp', type: AttributeType.NUMBER },
    partitionKey: { name: 'radio', type: AttributeType.STRING },
    timeToLiveAttribute: 'deleteTs',
  })

  const albumArtTable = new Table(scope, `${envName}-albumArtTable`, {
    tableName: `${envName}-albumArt`,
    billingMode: BillingMode.PAY_PER_REQUEST,
    partitionKey: { name: 'id', type: AttributeType.STRING },
  })

  const deviceTable = new Table(scope, `${envName}-deviceTable`, {
    tableName: `${envName}-deviceTable`,
    billingMode: BillingMode.PAY_PER_REQUEST,
    partitionKey: { name: 'token', type: AttributeType.STRING },
  })

  deviceTable.addGlobalSecondaryIndex({
    indexName: 'statusIndex',
    partitionKey: { name: 'status', type: AttributeType.NUMBER },
    sortKey: { name: 'token', type: AttributeType.STRING },
  })

  deviceTable.addGlobalSecondaryIndex({
    indexName: 'statusSubscribedAtIndex',
    partitionKey: { name: 'status', type: AttributeType.NUMBER },
    sortKey: { name: 'subscribedAt', type: AttributeType.NUMBER },
  })

  const scheduleTable = new Table(scope, `${envName}-scheduleTable`, {
    tableName: `${envName}-scheduleTable`,
    billingMode: BillingMode.PAY_PER_REQUEST,
    partitionKey: { name: 'id', type: AttributeType.STRING },
  })

  return {
    trackListTable,
    albumArtTable,
    deviceTable,
    scheduleTable,
  }
}
