import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import type { Construct } from 'constructs';
import type { BnLambdas } from './lambda.construct';
import type { BnQueues } from './queue.construct';

export function createTriggers(
  scope: Construct,
  envName: string,
  { pollingQueue }: BnQueues,
  {
    fillQueueLambda,
    findDisabledDevicesLambda,
    pollNewTrackLambda,
    deleteDevicesLambda,
  }: BnLambdas,
) {
  if (envName === 'prod') {
    const pollingEventRule = new Rule(scope, `${envName}-pollingEventRule`, {
      schedule: Schedule.cron({ minute: '*' }),
    });
    pollingEventRule.addTarget(new LambdaFunction(fillQueueLambda));

    const cleaningEventRule = new Rule(scope, `${envName}-cleaningEventRule`, {
      schedule: Schedule.cron({ minute: '*/10', hour: '*' }),
    });
    cleaningEventRule.addTarget(new LambdaFunction(deleteDevicesLambda));

    const findDisabledDevicesRule = new Rule(scope, `${envName}-findDisabledDevicesRule`, {
      schedule: Schedule.cron({ minute: '5', hour: '*' }),
    });
    findDisabledDevicesRule.addTarget(new LambdaFunction(findDisabledDevicesLambda));
  }

  const queueEventSource = new SqsEventSource(pollingQueue, { batchSize: 1 });
  pollNewTrackLambda.addEventSource(queueEventSource);
}
