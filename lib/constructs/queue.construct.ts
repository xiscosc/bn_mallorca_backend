import { Queue } from 'aws-cdk-lib/aws-sqs';
import type { Construct } from 'constructs';

export type BnQueues = {
  pollingQueue: Queue;
};

export function createQueues(scope: Construct, envName: string): BnQueues {
  const pollingQueue = new Queue(scope, `${envName}-polling-queue`, {});

  return {
    pollingQueue,
  };
}
