import { AttributeType, BillingMode, Table, type TableProps } from 'aws-cdk-lib/aws-dynamodb';
import type { Construct } from 'constructs';

export type BnTables = {
  trackListTable: Table;
  albumArtTable: Table;
  deviceTable: Table;
  scheduleTable: Table;
};

export function createTables(scope: Construct, envName: string): BnTables {
  const defaultTableProps: Partial<TableProps> = {
    billingMode: BillingMode.PAY_PER_REQUEST,
    pointInTimeRecoverySpecification: {
      pointInTimeRecoveryEnabled: envName === 'prod',
    },
  };

  const trackListTable = new Table(scope, `${envName}-trackListTable`, {
    ...defaultTableProps,
    tableName: `${envName}-trackList`,
    sortKey: { name: 'timestamp', type: AttributeType.NUMBER },
    partitionKey: { name: 'radio', type: AttributeType.STRING },
    timeToLiveAttribute: 'deleteTs',
  });

  const albumArtTable = new Table(scope, `${envName}-albumArtTable`, {
    ...defaultTableProps,
    tableName: `${envName}-albumArt`,
    partitionKey: { name: 'id', type: AttributeType.STRING },
  });

  const deviceTable = new Table(scope, `${envName}-deviceTable`, {
    ...defaultTableProps,
    tableName: `${envName}-deviceTable`,
    partitionKey: { name: 'token', type: AttributeType.STRING },
  });

  deviceTable.addGlobalSecondaryIndex({
    indexName: 'statusIndex',
    partitionKey: { name: 'status', type: AttributeType.NUMBER },
    sortKey: { name: 'token', type: AttributeType.STRING },
  });

  deviceTable.addGlobalSecondaryIndex({
    indexName: 'statusSubscribedAtIndex',
    partitionKey: { name: 'status', type: AttributeType.NUMBER },
    sortKey: { name: 'subscribedAt', type: AttributeType.NUMBER },
  });

  const scheduleTable = new Table(scope, `${envName}-scheduleTable`, {
    ...defaultTableProps,
    tableName: `${envName}-scheduleTable`,
    partitionKey: { name: 'id', type: AttributeType.STRING },
  });

  return {
    trackListTable,
    albumArtTable,
    deviceTable,
    scheduleTable,
  };
}
